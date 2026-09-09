import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { assertSameOrigin, requireAdmin } from '@/lib/security';
import { activityPath } from '@/lib/visitor-activity';
import { readVisitorActivity, recordVisitorActivity } from '@/lib/supabase-visitor-activity';

export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'no-store' };
export async function POST(request: Request) {
  try { assertSameOrigin(request); } catch { return new Response(null, { status: 403 }); }
  const raw = await request.text();
  if (raw.length > 512) return new Response(null, { status: 413 });
  let body: { action?: unknown; path?: unknown };
  try { body = JSON.parse(raw); }
  catch { return new Response(null, { status: 400 }); }
  const path = activityPath(body.path);
  if (!path || typeof body.action !== 'string' || !['page_view', 'add_to_bag', 'checkout_view'].includes(body.action)) return new Response(null, { status: 400 });
  if ((body.action === 'checkout_view' && path !== '/checkout') || (body.action === 'add_to_bag' && !path.startsWith('/products/'))) return new Response(null, { status: 400 });
  try {
    const secret = process.env.ZYRA_SESSION_SECRET;
    if (!secret || secret.length < 32) return new Response(null, { status: 503 });
    const sign = (id: string) => createHmac('sha256', secret).update(`visitor:${id}`).digest('hex');
    const token = request.headers.get('cookie')?.split(';').map(x => x.trim()).find(x => x.startsWith('zyra_activity='))?.slice(14) || '';
    const [id, signature = ''] = token.split('.');
    const valid = /^[a-f0-9-]{36}$/.test(id || '') && signature.length === 64 && timingSafeEqual(Buffer.from(signature), Buffer.from(sign(id)));
    const visitor = valid ? id : randomUUID();
    const ua = request.headers.get('user-agent') || '';
    const device = /Mobile|Android|iPhone/i.test(ua) ? 'Mobile' : 'Desktop / tablet';
    const visitorHash = createHash('sha256').update(`visitor-activity:${visitor}:${secret}`).digest('hex');
    const accepted = await recordVisitorActivity({ visitorHash, action: body.action, path, device, isTest: Boolean(requireAdmin(request)) });
    if (!accepted) return new Response(null, { status: 429 });
    return new Response(null, { status: 204, headers: { ...headers, 'Set-Cookie': `zyra_activity=${visitor}.${sign(visitor)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=1800${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}` } });
  } catch { return new Response(null, { status: 503 }); }
}
export async function GET(request: Request) {
  if (!requireAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401, headers });
  try { return Response.json(await readVisitorActivity(new URL(request.url).searchParams.get('mode') === 'preview'), { headers }); }
  catch { return Response.json({ error: 'Visitor activity could not be loaded.' }, { status: 503, headers }); }
}
