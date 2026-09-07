import { safepayConfig } from '@/lib/safepay';
import { verifySafepay, validPaidEvent } from '@/lib/safepay-verification';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { consumeRateLimit } from '@/lib/security';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  if (!safepayConfig().enabled) return new Response(null,{status:503});
  const raw = await request.text();
  if (raw.length > 64000) return new Response(null,{status:413});
  if (!verifySafepay(raw,request.headers.get('x-sfpy-signature') || '',process.env.SAFEPAY_WEBHOOK_SECRET || '')) return new Response(null,{status:401});
  try {
    if (!await consumeRateLimit(request,'safepay-webhook',300,60)) return new Response(null,{status:429});
    const event = JSON.parse(raw);
    if (event.type !== 'payment.succeeded') return new Response(null,{status:204});
    if (!validPaidEvent(event,process.env.SAFEPAY_PUBLIC_KEY!)) return new Response(null,{status:400});
    const { error } = await getSupabaseAdmin().rpc('confirm_safepay',{p_event:event.token,p_tracker:event.data.tracker,p_amount:event.data.amount,p_currency:event.data.currency,p_environment:safepayConfig().environment});
    if (error) return new Response(null,{status:503});
    return new Response(null,{status:204});
  } catch { return new Response(null,{status:503}); }
}
