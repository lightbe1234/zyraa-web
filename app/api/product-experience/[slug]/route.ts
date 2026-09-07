import { createHash, randomUUID, createHmac, timingSafeEqual } from 'node:crypto';
import { getLocalProductExperience } from '@/lib/local-product-experience';
import { assertSameOrigin, requireAdmin } from '@/lib/security';
import { findOrderByContact, getCatalog } from '@/lib/supabase-store';
import { emptyProductDetails, validateProductDetails } from '@/lib/product-experience-types';

export const runtime = 'nodejs';
type Context = { params: Promise<{ slug: string }> };
const headers = { 'cache-control': 'no-store' };
const hash = (text: string) => createHash('sha256').update(text).digest('hex');
const isLocal = (request: Request) => process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1', '[::1]'].includes(new URL(request.url).hostname);
const validSlug = (slug: string) => /^[a-z0-9-]{1,120}$/.test(slug);

export async function GET(request: Request, context: Context) {
  const { slug } = await context.params;
  if (!validSlug(slug)) return Response.json({ error: 'Invalid product.' }, { status: 400 });
  // No simulated reviews or viewer counts when the backing source is unavailable.
  if (!isLocal(request)) return Response.json({ details: emptyProductDetails, reviews: [], reviewsAvailable: false }, { headers });
  try { return Response.json(getLocalProductExperience().read(slug), { headers }); }
  catch { return Response.json({ error: 'Product details are temporarily unavailable.' }, { status: 503, headers }); }
}

export async function POST(request: Request, context: Context) {
  if (!isLocal(request)) return Response.json({ error: 'This feature is not enabled.' }, { status: 503, headers });
  try {
    assertSameOrigin(request);
    const { slug } = await context.params;
    if (!validSlug(slug)) throw new Error('Invalid product.');
    const raw = await request.text();
    if (raw.length > 5000) return Response.json({ error: 'Request too large.' }, { status: 413 });
    const body = JSON.parse(raw);
    const store = getLocalProductExperience();
    const source = hash(request.headers.get('x-forwarded-for') || 'local');
    if (!store.limit(`experience:${source}`, 150, 60_000)) return Response.json({ error: 'Please try again shortly.' }, { status: 429 });
    if (body.action === 'heartbeat') {
      const secret = process.env.ZYRA_SESSION_SECRET;
      if (!secret) throw new Error('Visitor tracking unavailable.');
      const sign = (value: string) => createHmac('sha256', secret).update(`product-viewer:${value}`).digest('hex');
      const cookie = request.headers.get('cookie')?.split(';').map((entry) => entry.trim()).find((entry) => entry.startsWith('zyra_viewer='))?.slice(12) || '';
      const [id, signature] = cookie.split('.');
      const expected = id ? sign(id) : '';
      const valid = id && signature && signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
      const visitor = valid ? id : randomUUID();
      const count = store.heartbeat(slug, hash(visitor));
      return Response.json({ count, windowSeconds: 60 }, { headers: { ...headers, 'set-cookie': `zyra_viewer=${visitor}.${sign(visitor)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=1800` } });
    }
    if (body.action !== 'review') throw new Error('Invalid request.');
    if (!store.limit(`review:${source}`, 5, 600_000)) return Response.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
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
      store.addReview(slug, hash(`${order.token}:${slug}`), {
        author: `${order.customer.firstName.slice(0, 30)} ${order.customer.lastName.slice(0, 1)}.`, rating, text, size: item.size,
      });
    } catch (error) {
      if (String(error).includes('UNIQUE')) return Response.json({ error: 'This order already has a review for this product.' }, { status: 409 });
      throw error;
    }
    return Response.json(store.read(slug), { status: 201, headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed.';
    const safe = ['Invalid product.', 'Invalid request.', 'Choose a rating and write 20–1,000 characters.', 'Enter your order number and checkout email or phone.'];
    return Response.json({ error: safe.includes(message) ? message : 'This request could not be completed. Please try again.' }, { status: message === 'INVALID_ORIGIN' ? 403 : 400, headers });
  }
}

export async function PUT(request: Request, context: Context) {
  if (!isLocal(request)) return Response.json({ error: 'Local product details are not enabled here.' }, { status: 503 });
  const actor = requireAdmin(request);
  if (!actor) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    assertSameOrigin(request);
    const { slug } = await context.params;
    if (!validSlug(slug)) throw new Error('Invalid product.');
    const store = getLocalProductExperience();
    if (!store.limit(`details:${hash(actor)}`, 60, 600_000)) return Response.json({ error: 'Too many requests.' }, { status: 429 });
    const raw = await request.text();
    if (raw.length > 12000) return Response.json({ error: 'Request too large.' }, { status: 413 });
    const details = validateProductDetails(JSON.parse(raw));
    const product = (await getCatalog({ includeArchived: true })).find((entry) => entry.slug === slug);
    if (!product || details.measurements.some((row) => !product.sizes.includes(row.size))) throw new Error('Measurement sizes must match this product.');
    store.saveDetails(slug, details, hash(actor));
    return Response.json({ ok: true }, { headers });
  } catch { return Response.json({ error: 'Check the details and sizes, then try again.' }, { status: 400 }); }
}
