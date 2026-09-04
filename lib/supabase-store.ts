import type { Category, Product } from './catalog';
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
  instagramUrl?: string;
  facebookUrl?: string;
  youtubeUrl?: string;
  tiktokUrl?: string;
  whatsappUrl?: string;
  heroImage: string;
  heroEyebrow: string;
  heroHeading: string;
  heroCtaLabel: string;
  heroCtaHref: string;
};

export type ContentSection = { key: string; label: string; sortOrder: number; enabled: boolean };

export async function getCollections({ includeInactive = false } = {}): Promise<Category[]> {
  let query = getSupabaseAdmin().from('store_collections').select('slug,name,image,active').order('sort_order');
  if (!includeInactive) query = query.eq('active', true);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data || []).map((row) => ({ slug: row.slug, name: row.name, image: row.image }));
}

export async function updateCollection(slug: string, name: string, image: string, actorEmail: string) {
  const { error } = await getSupabaseAdmin().rpc('admin_update_collection', {
    p_slug: slug,
    p_name: name,
    p_image: image,
    p_actor_email: actorEmail,
  });
  if (error) throw new Error(error.message);
}

function productFromRow(row: Record<string, unknown>): Product {
  const storedImages = Array.isArray(row.images) ? row.images.map(String).filter(Boolean) : [];
  const images = storedImages.length ? storedImages : [String(row.image), String(row.alternate)].filter(Boolean);
  return {
    slug: String(row.slug), name: String(row.name), category: String(row.category), collection: String(row.collection),
    price: Number(row.price), compareAt: row.compare_at == null ? undefined : Number(row.compare_at), image: String(row.image),
    alternate: String(row.alternate), images, rating: Number(row.rating), reviews: Number(row.reviews), stock: Number(row.stock),
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
  let query = getSupabaseAdmin().from('products').select('*').order('created_at', { ascending: true });
  if (!includeArchived) query = query.eq('active', true);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data || []).map((row) => productFromRow(row));
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
  const client = getSupabaseAdmin();
  const { data: id, error } = await client.rpc('create_order', {
    p_items: input.items, p_customer: input.customer, p_delivery: input.delivery,
    p_payment: input.payment, p_idempotency_key: input.idempotencyKey,
  });
  if (error) throw new Error(error.message);
  const { data, error: readError } = await client.from('orders').select(orderSelect).eq('id', id).single();
  if (readError) throw new Error(readError.message);
  return orderFromRow(data);
}

export async function getOrders() {
  const { data, error } = await getSupabaseAdmin().from('orders').select(orderSelect).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map((row) => orderFromRow(row));
}

export async function findOrderByToken(token: string) {
  const { data, error } = await getSupabaseAdmin().from('orders').select(orderSelect).eq('public_token', token).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? orderFromRow(data) : undefined;
}

export async function findOrderByContact(number: string, contact: string) {
  const { data, error } = await getSupabaseAdmin().from('orders').select(orderSelect).eq('order_number', number.trim()).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return undefined;
  const normalized = contact.trim().toLowerCase();
  if (![String(data.email).toLowerCase(), String(data.phone).toLowerCase()].includes(normalized)) return undefined;
  return orderFromRow(data);
}

export async function updateOrderStatus(number: string, status: string, actorEmail: string) {
  const client = getSupabaseAdmin();
  const { data: id, error } = await client.rpc('admin_update_order_status', { p_order_number: number, p_status: status, p_actor_email: actorEmail });
  if (error) throw new Error(error.message);
  const { data, error: readError } = await client.from('orders').select(orderSelect).eq('id', id).single();
  if (readError) throw new Error(readError.message);
  return orderFromRow(data);
}

export async function getStoreSettings(): Promise<StoreSettings> {
  const { data, error } = await getSupabaseAdmin().from('store_settings').select('*').eq('singleton', true).single();
  if (error) throw new Error(error.message);
  return {
    storeName: data.store_name,
    supportEmail: data.support_email,
    freeShippingThreshold: data.free_shipping_threshold,
    flatShipping: data.flat_shipping,
    bankTransferInstructions: data.bank_transfer_instructions,
    instagramUrl: data.instagram_url || 'https://instagram.com',
    facebookUrl: data.facebook_url || 'https://facebook.com',
    youtubeUrl: data.youtube_url || 'https://youtube.com',
    tiktokUrl: data.tiktok_url || 'https://tiktok.com',
    whatsappUrl: data.whatsapp_url || 'https://wa.me/923000000000',
    heroImage: data.hero_image || '/break-the-pattern-hero.jpeg',
    heroEyebrow: data.hero_eyebrow || 'ZYRA / DROP 01',
    heroHeading: data.hero_heading || 'BREAK\nTHE\nPATTERN',
    heroCtaLabel: data.hero_cta_label || 'Shop the drop',
    heroCtaHref: data.hero_cta_href || '/collections/after-hours',
  };
}

export async function updateStoreSettings(settings: StoreSettings, actorEmail: string) {
  const { error } = await getSupabaseAdmin().rpc('admin_update_settings', { p_settings: settings, p_actor_email: actorEmail });
  if (error) throw new Error(error.message);
}

export async function getContentSections(): Promise<ContentSection[]> {
  const { data, error } = await getSupabaseAdmin().from('content_sections').select('*').order('sort_order');
  if (error) throw new Error(error.message);
  return (data || []).map((row) => ({ key: row.key, label: row.label, sortOrder: row.sort_order, enabled: row.enabled }));
}

export async function updateContentSections(sections: ContentSection[], actorEmail: string) {
  const { error } = await getSupabaseAdmin().rpc('admin_update_content', { p_sections: sections, p_actor_email: actorEmail });
  if (error) throw new Error(error.message);
}
