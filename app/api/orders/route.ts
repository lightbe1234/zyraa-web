import { createOrder, findOrderByContact, findOrderByToken } from '@/lib/supabase-store';
import { assertSameOrigin, consumeRateLimit } from '@/lib/security';
import { safepayReady } from '@/lib/safepay';
import { notifyOrder } from '@/lib/order-notifications';
import { after } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    if (!(await consumeRateLimit(request, 'order-lookup', 30, 600))) return Response.json({ error: 'Too many requests.' }, { status: 429 });
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const number = searchParams.get('number');
    const contact = searchParams.get('contact');
    const order = token ? await findOrderByToken(token) : number && contact ? await findOrderByContact(number, contact) : undefined;
    if (!order) return Response.json({ error: 'Order not found.' }, { status: 404 });
    return Response.json(order);
  } catch {
    return Response.json({ error: 'Order lookup is temporarily unavailable.' }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    if (!(await consumeRateLimit(request, 'checkout', 12, 600))) return Response.json({ error: 'Too many checkout attempts.' }, { status: 429 });
    const key = request.headers.get('idempotency-key');
    if (!key || !/^[a-zA-Z0-9_-]{12,128}$/.test(key)) return Response.json({ error: 'Invalid idempotency key' }, { status: 400 });
    const rawBody = await request.text();
    if (rawBody.length > 30000) return Response.json({ error: 'Request too large.' }, { status: 413 });
    const body = JSON.parse(rawBody) as {
      items: Array<{ slug: string; size: string; color: string; qty: number }>;
      email: string;
      phone: string;
      payment: string;
      firstName: string;
      lastName: string;
      address: string;
      city: string;
      province: string;
      postal?: string;
      note?: string;
    };
    if (!body || !Array.isArray(body.items) || body.items.length < 1 || body.items.length > 50 || body.items.some(item => !item || typeof item.slug !== 'string' || !/^[a-z0-9-]{1,120}$/.test(item.slug) || typeof item.size !== 'string' || typeof item.color !== 'string' || item.size.length > 80 || item.color.length > 80 || !Number.isInteger(item.qty) || item.qty < 1 || item.qty > 10)) return Response.json({ error: 'Invalid items in your bag.' }, { status: 400 });
    const textLimits = { email: 254, phone: 30, firstName: 100, lastName: 100, address: 500, city: 100, province: 100, postal: 30, note: 1200 } as const;
    for (const field of Object.keys(textLimits) as Array<keyof typeof textLimits>) {
      if (body[field] != null && (typeof body[field] !== 'string' || body[field]!.length > textLimits[field])) return Response.json({ error: `Invalid ${field}.` }, { status: 400 });
    }
    if (!/^\S+@\S+\.\S+$/.test(String(body.email || '')))
      return Response.json({ error: 'Valid email required' }, { status: 400 });
    if (String(body.phone || '').replace(/\D/g, '').length < 10)
      return Response.json({ error: 'Valid phone required' }, { status: 400 });
    if (body.payment === 'safepay' && !await safepayReady()) return Response.json({ error: 'Card payments are currently unavailable. Choose another payment method.' }, { status: 503 });
    if (!['cod', 'bank', 'safepay'].includes(body.payment))
      return Response.json(
        { error: 'Unsupported payment method' },
        { status: 400 },
      );
    for (const field of ['firstName', 'lastName', 'address', 'city', 'province'] as const) {
      if (!String(body[field] || '').trim())
        return Response.json({ error: `${field} is required` }, { status: 400 });
    }
    const order = await createOrder({
      items: body.items,
      customer: { firstName: body.firstName.trim(), lastName: body.lastName.trim(), email: body.email.trim(), phone: body.phone.trim() },
      delivery: { address: body.address.trim(), city: body.city.trim(), province: body.province.trim(), postal: String(body.postal || '').trim(), note: String(body.note || '').trim() },
      payment: body.payment,
      idempotencyKey: key,
    });
    after(() => notifyOrder(order));
    return Response.json(order, { status: 201 });
  } catch (error) {
    const raw = error instanceof Error ? error.message : 'INVALID_REQUEST';
    if (raw.includes('CUSTOM_DESIGN_EXPIRED')) return Response.json({ error: 'Your saved design has expired. Please open the shirt studio and save it again.' }, { status: 400 });
    const known = ['INVALID_ORIGIN','INVALID_ITEMS','INVALID_PAYMENT','INVALID_CUSTOMER','INVALID_DELIVERY','INVALID_QUANTITY','PRODUCT_NOT_FOUND','INVALID_VARIANT','INSUFFICIENT_STOCK'];
    const message = known.find((code) => raw.includes(code)) || 'Order could not be placed.';
    return Response.json({ error: message }, { status: message === 'INVALID_ORIGIN' ? 403 : 400 });
  }
}
