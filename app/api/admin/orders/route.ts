import { canTransition } from '@/lib/commerce';
import { assertSameOrigin, consumeRateLimit, requireAdmin } from '@/lib/security';
import { getOrders, updateOrderStatus } from '@/lib/supabase-store';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  if (!requireAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  return Response.json(await getOrders());
}

export async function PATCH(request: Request) {
  const actor = requireAdmin(request);
  if (!actor) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    assertSameOrigin(request);
    if (!(await consumeRateLimit(request, 'admin-orders', 120, 600))) return Response.json({ error: 'Too many requests.' }, { status: 429 });
    const body = (await request.json()) as { number?: string; status?: string };
    const order = (await getOrders()).find((entry) => entry.number === body.number);
    if (!order || !body.status) throw new Error('Order not found.');
    if (!canTransition(order.status, body.status)) throw new Error(`Cannot move ${order.status} to ${body.status}.`);
    return Response.json(await updateOrderStatus(order.number, body.status, actor));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Status could not be updated.' }, { status: 400 });
  }
}
