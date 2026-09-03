import { priceCart } from '@/lib/commerce';

const completed = new Map<string, unknown>();
export async function POST(request: Request) {
  const key = request.headers.get('idempotency-key');
  if (!key || key.length < 12)
    return Response.json({ error: 'Missing idempotency key' }, { status: 400 });
  if (completed.has(key)) return Response.json(completed.get(key));
  try {
    const body = (await request.json()) as {
      items: Array<{ slug: string; size: string; color: string; qty: number }>;
      email: string;
      phone: string;
      payment: string;
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
    const totals = priceCart(body.items);
    const token = crypto.randomUUID().replaceAll('-', '');
    const suffix = token.slice(0, 4).toUpperCase();
    const now = new Date();
    const order = {
      token,
      number: `ZY-${now.toISOString().slice(2, 10).replaceAll('-', '')}-${suffix}`,
      email: body.email,
      phone: body.phone,
      items: body.items,
      total: totals.total,
      payment: body.payment,
      status: body.payment === 'cod' ? 'CONFIRMED' : 'PENDING',
      createdAt: now.toISOString(),
    };
    completed.set(key, order);
    return Response.json(order, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'INVALID_REQUEST';
    return Response.json({ error: message }, { status: 400 });
  }
}
