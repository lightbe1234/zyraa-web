import { adminCookieHeader, assertSameOrigin, clearAdminCookieHeader, consumeRateLimit, createAdminSession, requireAdmin, verifyAdminCredentials } from '@/lib/security';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  return Response.json({ authenticated: Boolean(requireAdmin(request)) });
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    if (!(await consumeRateLimit(request, 'admin-login', 8, 900))) return Response.json({ error: 'Too many login attempts. Try again later.' }, { status: 429 });
    const body = (await request.json()) as { email?: string; password?: string };
    if (!/^\S+@\S+\.\S+$/.test(body.email || '') || (body.password?.length || 0) < 8) {
      return Response.json({ error: 'Valid demo credentials required.' }, { status: 400 });
    }
    if (!verifyAdminCredentials(body.email || '', body.password || '')) {
      return Response.json({ error: 'Invalid admin credentials.' }, { status: 401 });
    }
    const token = createAdminSession(body.email!);
    return Response.json(
      { ok: true },
      { headers: { 'set-cookie': adminCookieHeader(token, request), 'cache-control': 'no-store' } },
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Admin login failed.' },
      { status: 503 },
    );
  }
}

export async function DELETE(request: Request) {
  try { assertSameOrigin(request); } catch { return Response.json({ error: 'Invalid origin.' }, { status: 403 }); }
  return Response.json(
    { ok: true },
    { headers: { 'set-cookie': clearAdminCookieHeader(request), 'cache-control': 'no-store' } },
  );
}
