import { createHash, randomUUID, createHmac, timingSafeEqual } from 'node:crypto';
import { readProductExperience } from '@/lib/product-experience-server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { assertSameOrigin, consumeRateLimit, requireAdmin } from '@/lib/security';
import { findOrderByContact, getCatalog } from '@/lib/supabase-store';
import { validateProductDetails } from '@/lib/product-experience-types';
import { isMissingDatabaseObject } from '@/lib/supabase-errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ slug: string }> };
const headers = { 'cache-control': 'no-store' };
// Product information is shared by local and deployed instances.
const validSlug = (slug: string) => /^[a-z0-9-]{1,120}$/.test(slug);

export async function GET(request: Request, context: Context) {
  const { slug } = await context.params;
  if (!validSlug(slug)) return Response.json({ error: 'Invalid product.' }, { status: 400 });
  // No simulated reviews or viewer counts when the backing source is unavailable.
  try { return Response.json(await readProductExperience(slug), { headers }); }
  catch { return Response.json({ error: 'Product details are temporarily unavailable.' }, { status: 503, headers }); }
}

export async function POST(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const { slug } = await context.params;
    if (!validSlug(slug)) throw new Error('Invalid product.');
    const raw = await request.text();
    if (raw.length > 5000) return Response.json({ error: 'Request too large.' }, { status: 413 });
    const body = JSON.parse(raw);
    const store = {
      limit: async (_key: string, max: number, windowMs: number) => consumeRateLimit(request, 'product-review', max, Math.ceil(windowMs / 1000)),
      read: readProductExperience,
      addReview: async (_slug: string, token: string, review: { rating: number; text: string }) => {
        const { error } = await getSupabaseAdmin().rpc('add_product_review', { p_slug: _slug, p_token: token, p_rating: review.rating, p_text: review.text });
        if (error) throw new Error(error.code === '23505' ? 'UNIQUE' : 'Review could not be saved.');
      },
    };
    if (!await consumeRateLimit(request, 'product-experience', 150, 60)) return Response.json({ error: 'Please try again shortly.' }, { status: 429 });
    if (body.action === 'heartbeat') {
      if (requireAdmin(request)) return Response.json({ count: null, windowSeconds: 60 }, { headers });
      const secret = process.env.ZYRA_SESSION_SECRET;
      if (!secret) throw new Error('Presence unavailable');
      const sign = (value: string) => createHmac('sha256', secret).update(`product-viewer:${value}`).digest('hex');
      const cookie = request.headers.get('cookie')?.split(';').map(e => e.trim()).find(e => e.startsWith('zyra_viewer='))?.slice(12) || '';
      const [id, signature = ''] = cookie.split('.');
      const valid = /^[a-f0-9-]{36}$/.test(id || '') && /^[a-f0-9]{64}$/.test(signature) && timingSafeEqual(Buffer.from(signature), Buffer.from(sign(id)));
      const visitor = valid ? id : randomUUID();
      const visitorHash = createHash('sha256').update(visitor + secret).digest('hex');
      const cookieHeader = `zyra_viewer=${visitor}.${sign(visitor)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=1800${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`;
      const { data: count, error } = await getSupabaseAdmin().rpc('product_heartbeat', { p_slug: slug, p_visitor: visitorHash });
      // During a rolling database migration, keep the page healthy and avoid
      // fabricating a count. The durable heartbeat starts working as soon as
      // the presence migration is applied.
      if (error && isMissingDatabaseObject(error)) {
        return Response.json({ count: null, windowSeconds: 60 }, { headers: { ...headers, 'set-cookie': cookieHeader } });
      }
      if (error) throw error;
      return Response.json({ count, windowSeconds: 60 }, { headers: { ...headers, 'set-cookie': cookieHeader } });
    }
    if (body.action !== 'review') throw new Error('Invalid request.');
    if (!await store.limit('review', 5, 600_000)) return Response.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
    const rating = Number(body.rating);
    const text = String(body.text || '').trim();
    if (!Number.isInteger(rating) || rating < 1 || rating > 5 || text.length < 20 || text.length > 1000) throw new Error('Choose a rating and write 20–1,000 characters.');
    const number = String(body.number || '').trim();
    const contact = String(body.contact || '').trim();
    if (!number || !contact || number.length > 100 || contact.length > 160) throw new Error('Enter your order number and checkout email or phone.');
    const order = await findOrderByContact(number, contact);
    const item = order?.items.find((entry) => entry.slug === slug);
    if (!order || !item || order.status !== 'DELIVERED') return Response.json({ error: 'We could not verify a delivered order for this product. Check your details or contact support.' }, { status: 403 });
    try {
      await store.addReview(slug, order.token, { rating, text });
    } catch (error) {
      if (String(error).includes('UNIQUE')) return Response.json({ error: 'This order already has a review for this product.' }, { status: 409 });
      throw error;
    }
    return Response.json(await store.read(slug), { status: 201, headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed.';
    const safe = ['Invalid product.', 'Invalid request.', 'Choose a rating and write 20–1,000 characters.', 'Enter your order number and checkout email or phone.'];
    return Response.json({ error: safe.includes(message) ? message : 'This request could not be completed. Please try again.' }, { status: message === 'INVALID_ORIGIN' ? 403 : 400, headers });
  }
}

export async function PUT(request: Request, context: Context) {
  const actor = requireAdmin(request);
  if (!actor) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    assertSameOrigin(request);
    const { slug } = await context.params;
    if (!validSlug(slug)) throw new Error('Invalid product.');
    if (!await consumeRateLimit(request, 'product-details', 60, 600)) return Response.json({ error: 'Too many requests.' }, { status: 429 });
    const raw = await request.text();
    if (raw.length > 12000) return Response.json({ error: 'Request too large.' }, { status: 413 });
    const details = validateProductDetails(JSON.parse(raw));
    const product = (await getCatalog({ includeArchived: true })).find((entry) => entry.slug === slug);
    if (!product || details.measurements.some((row) => !product.sizes.includes(row.size))) throw new Error('Measurement sizes must match this product.');
    const { error } = await getSupabaseAdmin().rpc('save_product_details', { p_slug: slug, p_details: details, p_actor: actor });
    if (error) throw error;
    return Response.json({ ok: true }, { headers });
  } catch { return Response.json({ error: 'Check the details and sizes, then try again.' }, { status: 400 }); }
}
