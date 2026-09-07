import { createHmac, timingSafeEqual } from 'node:crypto';
export function verifySafepay(raw: string, signature: string, secret: string) {
  if (!secret || !/^[a-f0-9]{128}$/i.test(signature)) return false;
  return timingSafeEqual(Buffer.from(signature, 'hex'), createHmac('sha512', secret).update(raw).digest());
}
export function validPaidEvent(event: { type?: string; version?: string; merchant_api_key?: string; token?: string; data?: { tracker?: string; amount?: number; currency?: string; state?: string } }, merchant: string) {
  return event.type === 'payment.succeeded' && event.version === '2.0.0' && event.merchant_api_key === merchant &&
    /^evt_[a-z0-9-]+$/i.test(event.token || '') && /^track_[a-z0-9-]+$/i.test(event.data?.tracker || '') &&
    Number.isSafeInteger(event.data?.amount) && Number(event.data?.amount) > 0 && event.data?.currency === 'PKR' && event.data?.state === 'TRACKER_ENDED';
}
