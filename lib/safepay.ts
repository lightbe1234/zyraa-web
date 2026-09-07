import 'server-only';
import Safepay from '@sfpy/node-core';
import { getSupabaseAdmin } from './supabase-server';
export function safepayConfig() {
  const environment = process.env.SAFEPAY_ENVIRONMENT === 'production' ? 'production' : 'sandbox';
  return { environment, enabled: process.env.SAFEPAY_ENABLED === 'true' && Boolean(process.env.SAFEPAY_SECRET_KEY && process.env.SAFEPAY_PUBLIC_KEY && process.env.SAFEPAY_WEBHOOK_SECRET && process.env.NEXT_PUBLIC_SITE_URL) } as const;
}
export function safepayClient() {
  const config = safepayConfig();
  if (!config.enabled) throw new Error('Card payments are not available yet.');
  return new Safepay(process.env.SAFEPAY_SECRET_KEY!, { authType: 'secret', timeout: 15000, host: config.environment === 'production' ? 'https://api.getsafepay.com' : 'https://sandbox.api.getsafepay.com' });
}
export async function safepayReady() {
  if (!safepayConfig().enabled) return false;
  const { error } = await getSupabaseAdmin().from('safepay_payments').select('order_id').limit(0);
  return !error;
}
export async function checkoutSafepay(token: string) {
  const sdk = safepayClient();
  const environment = safepayConfig().environment;
  const db = getSupabaseAdmin();
  const { data: claim, error } = await db.rpc('claim_safepay', { p_token: token, p_environment: environment });
  if (error) throw new Error('Payment is pending or unavailable. Please check your order before trying again.');
  let tracker: string = claim.tracker;
  if (claim.create) {
    const result = await sdk.payments.session.setup({ merchant_api_key: process.env.SAFEPAY_PUBLIC_KEY, intent: 'CYBERSOURCE', mode: 'payment', entry_mode: 'raw', currency: 'PKR', amount: claim.amount, metadata: { order_id: claim.number }, include_fees: false });
    tracker = result.data?.tracker?.token;
    if (!/^track_[a-z0-9-]+$/i.test(tracker || '')) throw new Error('Payment session could not be confirmed. Contact support before retrying.');
    const { error: attachError } = await db.rpc('attach_safepay', { p_token: token, p_tracker: tracker });
    if (attachError) throw new Error('Payment session is pending. Please contact support.');
  }
  const passport = await sdk.client.passport.create();
  if (typeof passport.data !== 'string') throw new Error('Payment checkout is temporarily unavailable.');
  const base = new URL(process.env.NEXT_PUBLIC_SITE_URL!);
  if (environment === 'production' && base.protocol !== 'https:') throw new Error('HTTPS is required.');
  const returnUrl = new URL(`/payment-return?order=${encodeURIComponent(token)}`, base).href;
  return sdk.checkout.createCheckoutUrl({ env: environment, tracker, tbt: passport.data, source: 'hosted', order_id: claim.number, redirect_url: returnUrl, cancel_url: `${returnUrl}&cancelled=1` });
}
