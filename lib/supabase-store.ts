import { catalog, productBySlug, type Product } from './catalog';
import { priceCartWithCatalog } from './commerce';
import { getSupabaseAdmin } from './supabase-server';

export type StoreOrder = {
  token: string;
  number: string;
  customer: { firstName: string; lastName: string; email: string; phone: string };
  delivery: { address: string; city: string; province: string; postal: string; note: string };
  items: Array<{ slug: string; size: string; color: string; qty: number; unitPrice: number; lineTotal: number }>;
  subtotal: number;
  shipping: number;
  total: number;
  payment: 'cod' | 'bank';
  status: string;
  createdAt: string;
};

export type StoreSettings = {
  storeName: string;
  supportEmail: string;
  freeShippingThreshold: number;
  flatShipping: number;
  bankTransferInstructions: string;
};

export type ContentSection = { key: string; label: string; sortOrder: number; enabled: boolean };

const inMemoryOrders: StoreOrder[] = [];

function productFromRow(row: Record<string, unknown>): Product {
  return {
    slug: String(row.slug), name: String(row.name), category: String(row.category), collection: String(row.collection),
    price: Number(row.price), compareAt: row.compare_at == null ? undefined : Number(row.compare_at), image: String(row.image),
    alternate: String(row.alternate), rating: Number(row.rating), reviews: Number(row.reviews), stock: Number(row.stock),
    colors: row.colors as string[], sizes: row.sizes as string[], featured: Boolean(row.featured), newArrival: Boolean(row.new_arrival),
    active: Boolean(row.active), description: String(row.description),
  };
}

function orderFromRow(row: Record<string, unknown>): StoreOrder {
  const items = (row.order_items as Array<Record<string, unknown>> || []).map((item) => ({
    slug: String(item.product_slug), size: String(item.size), color: String(item.color), qty: Number(item.quantity),
    unitPrice: Number(item.unit_price), lineTotal: Number(item.line_total),
  }));
  return {
    token: String(row.public_token), number: String(row.order_number),
    customer: { firstName: String(row.first_name), lastName: String(row.last_name), email: String(row.email), phone: String(row.phone) },
    delivery: { address: String(row.address), city: String(row.city), province: String(row.province), postal: String(row.postal), note: String(row.customer_note) },
    items, subtotal: Number(row.subtotal), shipping: Number(row.shipping), total: Number(row.total),
    payment: row.payment_method as 'cod' | 'bank', status: String(row.status), createdAt: String(row.created_at),
  };
}

const orderSelect = '*, order_items(*)';

export async function getCatalog({ includeArchived = false } = {}) {
  try {
    let query = getSupabaseAdmin().from('products').select('*').order('created_at', { ascending: true });
    if (!includeArchived) query = query.eq('active', true);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data || []).map((row) => productFromRow(row));
  } catch (err) {
    console.warn('Supabase catalog fetch fallback:', err instanceof Error ? err.message : err);
    return includeArchived ? catalog : catalog.filter((p) => p.active !== false);
  }
}

export async function saveProduct(product: Product, actorEmail: string, originalSlug?: string) {
  const { error } = await getSupabaseAdmin().rpc('admin_upsert_product', {
    p_product: product, p_original_slug: originalSlug || null, p_actor_email: actorEmail,
  });
  if (error) throw new Error(error.message);
  return product;
}

export async function updateProduct(slug: string, patch: { stock?: number; active?: boolean }, actorEmail: string) {
  const { error } = await getSupabaseAdmin().rpc('admin_patch_product', {
    p_slug: slug, p_stock: patch.stock ?? null, p_active: patch.active ?? null, p_actor_email: actorEmail,
  });
  if (error) throw new Error(error.message);
}

export async function createOrder(input: {
  items: Array<{ slug: string; size: string; color: string; qty: number }>;
  customer: Record<string, string>;
  delivery: Record<string, string>;
  payment: string;
  idempotencyKey: string;
}) {
  try {
    const client = getSupabaseAdmin();
    const { data: id, error } = await client.rpc('create_order', {
      p_items: input.items, p_customer: input.customer, p_delivery: input.delivery,
      p_payment: input.payment, p_idempotency_key: input.idempotencyKey,
    });
    if (error) throw new Error(error.message);
    const { data, error: readError } = await client.from('orders').select(orderSelect).eq('id', id).single();
    if (readError) throw new Error(readError.message);
    return orderFromRow(data);
  } catch (err) {
    console.warn('Supabase createOrder fallback:', err instanceof Error ? err.message : err);
    const priced = priceCartWithCatalog(input.items, catalog);
    const token = 'ord_' + Math.random().toString(36).substring(2, 14);
    const number = 'ZY-' + Math.floor(10000 + Math.random() * 90000);
    const order: StoreOrder = {
      token,
      number,
      customer: {
        firstName: input.customer.firstName,
        lastName: input.customer.lastName,
        email: input.customer.email,
        phone: input.customer.phone,
      },
      delivery: {
        address: input.delivery.address,
        city: input.delivery.city,
        province: input.delivery.province,
        postal: input.delivery.postal || '',
        note: input.delivery.note || '',
      },
      items: priced.items,
      subtotal: priced.subtotal,
      shipping: priced.shipping,
      total: priced.total,
      payment: input.payment as 'cod' | 'bank',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };
    inMemoryOrders.unshift(order);
    return order;
  }
}

export async function getOrders() {
  try {
    const { data, error } = await getSupabaseAdmin().from('orders').select(orderSelect).order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map((row) => orderFromRow(row));
  } catch {
    return inMemoryOrders;
  }
}

export async function findOrderByToken(token: string) {
  try {
    const { data, error } = await getSupabaseAdmin().from('orders').select(orderSelect).eq('public_token', token).maybeSingle();
    if (error) throw new Error(error.message);
    if (data) return orderFromRow(data);
  } catch {
    // fallback
  }
  return inMemoryOrders.find((o) => o.token === token);
}

export async function findOrderByContact(number: string, contact: string) {
  try {
    const { data, error } = await getSupabaseAdmin().from('orders').select(orderSelect).eq('order_number', number.trim()).maybeSingle();
    if (error) throw new Error(error.message);
    if (data) {
      const normalized = contact.trim().toLowerCase();
      if ([String(data.email).toLowerCase(), String(data.phone).toLowerCase()].includes(normalized)) return orderFromRow(data);
      return undefined;
    }
  } catch {
    // fallback
  }
  const normalized = contact.trim().toLowerCase();
  return inMemoryOrders.find(
    (o) => o.number === number.trim() && (o.customer.email.toLowerCase() === normalized || o.customer.phone.toLowerCase() === normalized)
  );
}

export async function updateOrderStatus(number: string, status: string, actorEmail: string) {
  try {
    const client = getSupabaseAdmin();
    const { data: id, error } = await client.rpc('admin_update_order_status', { p_order_number: number, p_status: status, p_actor_email: actorEmail });
    if (error) throw new Error(error.message);
    const { data, error: readError } = await client.from('orders').select(orderSelect).eq('id', id).single();
    if (readError) throw new Error(readError.message);
    return orderFromRow(data);
  } catch (err) {
    const order = inMemoryOrders.find((o) => o.number === number);
    if (order) {
      order.status = status;
      return order;
    }
    throw err;
  }
}

export async function getStoreSettings(): Promise<StoreSettings> {
  try {
    const { data, error } = await getSupabaseAdmin().from('store_settings').select('*').eq('singleton', true).single();
    if (error) throw new Error(error.message);
    return { storeName: data.store_name, supportEmail: data.support_email, freeShippingThreshold: data.free_shipping_threshold,
      flatShipping: data.flat_shipping, bankTransferInstructions: data.bank_transfer_instructions };
  } catch {
    return {
      storeName: 'ZYRA®',
      supportEmail: 'concierge@zyra.com',
      freeShippingThreshold: 499900,
      flatShipping: 25000,
      bankTransferInstructions: 'Transfer total amount to Bank ZYRA PK70ZYRA0000123456789. Send receipt with order number to concierge@zyra.com.',
    };
  }
}

export async function updateStoreSettings(settings: StoreSettings, actorEmail: string) {
  const { error } = await getSupabaseAdmin().rpc('admin_update_settings', { p_settings: settings, p_actor_email: actorEmail });
  if (error) throw new Error(error.message);
}

export async function getContentSections(): Promise<ContentSection[]> {
  try {
    const { data, error } = await getSupabaseAdmin().from('content_sections').select('*').order('sort_order');
    if (error) throw new Error(error.message);
    return (data || []).map((row) => ({ key: row.key, label: row.label, sortOrder: row.sort_order, enabled: row.enabled }));
  } catch {
    return [
      { key: 'hero', label: 'Hero Banner', sortOrder: 1, enabled: true },
      { key: 'marquee', label: 'Announcement Marquee', sortOrder: 2, enabled: true },
      { key: 'catalog', label: 'Main Catalog Grid', sortOrder: 3, enabled: true },
      { key: 'collections', label: 'Featured Collections', sortOrder: 4, enabled: true },
      { key: 'statement', label: 'Brand Statement', sortOrder: 5, enabled: true },
    ];
  }
}

export async function updateContentSections(sections: ContentSection[], actorEmail: string) {
  const { error } = await getSupabaseAdmin().rpc('admin_update_content', { p_sections: sections, p_actor_email: actorEmail });
  if (error) throw new Error(error.message);
}
