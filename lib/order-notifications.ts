import 'server-only';
import { getSupabaseAdmin } from './supabase-server';
import { sendOrderPlacedEmail } from './order-email';
import type { StoreOrder } from './supabase-store';
import { isMissingDatabaseObject } from './supabase-errors';

export async function notifyOrder(order: StoreOrder) {
  const db = getSupabaseAdmin();
  for (let attempt = 0; attempt < 2; attempt++) {
    const claim = await db.rpc('claim_order_notification', { p_number: order.number });
    if (claim.error) {
      // Keep notifications working during a rolling deploy before the queue
      // migration is applied. The durable claim path is used automatically
      // once the RPC exists; this bridge is intentionally best-effort.
      if (isMissingDatabaseObject(claim.error)) {
        try { await sendOrderPlacedEmail(order); } catch { console.error('Order email notification could not be sent.'); }
      } else console.error('Order notification claim failed');
      return;
    }
    if (!claim.data) return;
    let sent = false;
    try { sent = (await sendOrderPlacedEmail(order)).sent; } catch { /* Keep a durable failure for retry. */ }
    const finished = await db.rpc('finish_order_notification', { p_number: order.number, p_sent: sent });
    if (finished.error) { console.error('Order notification status could not be recorded'); return; }
    if (sent) return;
  }
  console.error('Order notification pending retry');
}
