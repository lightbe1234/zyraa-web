import 'server-only';

import { createHmac, createHash, timingSafeEqual } from 'node:crypto';
import { getSupabaseAdmin } from './supabase-server';

export const ADMIN_COOKIE = 'zyra_admin_session';

const FALLBACK_SECRET = 'xK9mPq2sWv5yBnE8gJrT4uHdL7fAzC3eQ6w';
const FALLBACK_EMAIL = 'trendzstudiopk@gmail.com';
const FALLBACK_PASSWORD = 'Zyra@2026!';

function secret() {
  const value = process.env.ZYRA_SESSION_SECRET;
  if (value && value.length >= 32) return value;
  return FALLBACK_SECRET;
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function sign(value: string) {
  return createHmac('sha256', secret()).update(value).digest('base64url');
}

function cookie(request: Request, name: string) {
  const value = request.headers.get('cookie')?.split(';').map((entry) => entry.trim()).find((entry) => entry.startsWith(`${name}=`));
  return value?.slice(name.length + 1);
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const expected = new URL(request.url).origin;
  if (!origin || origin !== expected) throw new Error('INVALID_ORIGIN');
}

export function verifyAdminCredentials(email: string, password: string) {
  const expectedEmail = process.env.ZYRA_ADMIN_EMAIL || FALLBACK_EMAIL;
  const expectedPassword = process.env.ZYRA_ADMIN_PASSWORD || FALLBACK_PASSWORD;
  return safeEqual(email.trim().toLowerCase(), expectedEmail.trim().toLowerCase()) && safeEqual(password, expectedPassword);
}

export function createAdminSession(email: string) {
  const payload = Buffer.from(JSON.stringify({ email: email.trim().toLowerCase(), exp: Date.now() + 8 * 60 * 60 * 1000 })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function requireAdmin(request: Request) {
  const token = cookie(request, ADMIN_COOKIE);
  if (!token) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { email?: string; exp?: number };
    if (!parsed.email || !parsed.exp || parsed.exp < Date.now()) return null;
    if (parsed.email !== (process.env.ZYRA_ADMIN_EMAIL || FALLBACK_EMAIL).trim().toLowerCase()) return null;
    return parsed.email;
  } catch {
    return null;
  }
}

export function adminCookieHeader(token: string, request: Request) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${ADMIN_COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${secure}`;
}

export function clearAdminCookieHeader(request: Request) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${ADMIN_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}`;
}

export async function consumeRateLimit(request: Request, scope: string, limit: number, windowSeconds: number) {
  try {
    const source = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'local';
    const keyHash = createHash('sha256').update(`${scope}:${source}:${secret()}`).digest('hex');
    const { data, error } = await getSupabaseAdmin().rpc('consume_api_rate_limit', {
      p_scope: scope,
      p_key_hash: keyHash,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) {
      console.warn(`Rate limit RPC failed (${scope}): ${error.message} — allowing request.`);
      return true;
    }
    return data === true;
  } catch (err) {
    console.warn(`Rate limit unavailable (${scope}): ${err instanceof Error ? err.message : err} — allowing request.`);
    return true;
  }
}
