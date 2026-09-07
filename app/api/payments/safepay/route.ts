import { assertSameOrigin, consumeRateLimit } from '@/lib/security';
import { checkoutSafepay, safepayConfig, safepayReady } from '@/lib/safepay';
export const runtime = 'nodejs';
export async function GET() {
  try { return Response.json({ available: await safepayReady(), environment: safepayConfig().environment }, { headers: { 'Cache-Control': 'no-store' } }); }
  catch { return Response.json({ available: false }, { headers: { 'Cache-Control': 'no-store' } }); }
}
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    if (!await safepayReady()) return Response.json({ error: 'Card payments are not available yet.' }, { status: 503 });
    if (!await consumeRateLimit(request,'safepay-checkout',10,600)) return Response.json({ error: 'Please wait before retrying.' }, { status: 429 });
    const { token } = await request.json();
    if (typeof token !== 'string' || !/^[a-zA-Z0-9_-]{20,100}$/.test(token)) return Response.json({ error: 'Invalid order.' }, { status: 400 });
    return Response.json({ url: await checkoutSafepay(token) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ error: 'Payment could not be opened. Your order is saved; please check its status before trying again.' }, { status: 503 }); }
}
