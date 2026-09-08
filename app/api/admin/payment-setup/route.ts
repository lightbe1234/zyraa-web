import { requireAdmin } from '@/lib/security';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { safepayConfig } from '@/lib/safepay';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  if (!requireAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  let database = false;
  try { const { error } = await getSupabaseAdmin().from('safepay_payments').select('order_id').limit(0); database = !error; } catch {}
  let origin = '';
  try { origin = new URL(process.env.NEXT_PUBLIC_SITE_URL || '').origin; } catch {}
  const checks = [
    { label: 'Public API key', ready: Boolean(process.env.SAFEPAY_PUBLIC_KEY) },
    { label: 'Secret API key', ready: Boolean(process.env.SAFEPAY_SECRET_KEY) },
    { label: 'Webhook shared secret', ready: Boolean(process.env.SAFEPAY_WEBHOOK_SECRET) },
    { label: 'Payment database migration', ready: database },
    { label: 'Return URL configured', ready: Boolean(origin) },
    { label: 'Safepay enabled', ready: process.env.SAFEPAY_ENABLED === 'true' },
  ];
  return Response.json({ checks, ready: checks.every(check => check.ready), environment: safepayConfig().environment,
    webhook: origin ? `${origin}/api/payments/safepay/webhook` : '',
  }, { headers: { 'Cache-Control': 'no-store' } });
}
