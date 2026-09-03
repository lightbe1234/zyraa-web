import { createOrder, findOrderByContact, findOrderByToken } from '@/lib/supabase-store';
import { assertSameOrigin, consumeRateLimit } from '@/lib/security';

export const runtime = 'nodejs';

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
    if (!key || key.length < 12) return Response.json({ error: 'Missing idempotency key' }, { status: 400 });
    const body = (await request.json()) as {
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
    if (!/^\S+@\S+\.\S+$/.test(String(body.email || '')))
      return Response.json({ error: 'Valid email required' }, { status: 400 });
    if (String(body.phone || '').replace(/\D/g, '').length < 10)
      return Response.json({ error: 'Valid phone required' }, { status: 400 });
    if (!['cod', 'bank'].includes(body.payment))
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
    return Response.json(order, { status: 201 });
  } catch (error) {
    const raw = error instanceof Error ? error.message : 'INVALID_REQUEST';
    const known = ['INVALID_ORIGIN','INVALID_ITEMS','INVALID_PAYMENT','INVALID_CUSTOMER','INVALID_DELIVERY','INVALID_QUANTITY','PRODUCT_NOT_FOUND','INVALID_VARIANT','INSUFFICIENT_STOCK'];
    const message = known.find((code) => raw.includes(code)) || 'Order could not be placed.';
    return Response.json({ error: message }, { status: message === 'INVALID_ORIGIN' ? 403 : 400 });
  }
}
