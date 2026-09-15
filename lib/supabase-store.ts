import type { Category, Product } from './catalog';
import type { HomeCollectionCard } from './home-collection-cards';
import { normalizeHomeContent, type HomeContent } from './home-content';
import type { Review } from './reviews';
import { randomUUID } from 'node:crypto';
import { getSupabaseAdmin } from './supabase-server';
import { isMissingDatabaseObject } from './supabase-errors';
import { signedDetails } from './custom-shirts-server';
import type { CustomDetails } from './custom-shirts';

export type StoreOrder = {
  token: string;
  number: string;
  customer: { firstName: string; lastName: string; email: string; phone: string };
  delivery: { address: string; city: string; province: string; postal: string; note: string };
  items: Array<{ slug: string; size: string; color: string; qty: number; unitPrice: number; lineTotal: number; customDetails?: CustomDetails }>;
  subtotal: number;
  shipping: number;
  total: number;
  payment: 'cod' | 'bank' | 'safepay';
  paymentStatus: string;
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
  homeContent: HomeContent;
};

export type ContentSection = { key: string; label: string; sortOrder: number; enabled: boolean };

export async function getHomeCollectionCards({ includeInactive = false } = {}): Promise<HomeCollectionCard[]> {
  let query = getSupabaseAdmin().from('home_collection_cards').select('*').order('sort_order');
  if (!includeInactive) query = query.eq('enabled', true);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data || []).map((row) => ({
    key: row.key,
    eyebrow: row.eyebrow,
    title: row.title,
    image: row.image,
    collectionSlug: row.collection_slug,
    sortOrder: row.sort_order,
    enabled: row.enabled,
  }));
}

export async function updateHomeCollectionCard(card: HomeCollectionCard, actorEmail: string) {
  const { error } = await getSupabaseAdmin().rpc('admin_update_home_collection_card', {
    p_card: card,
    p_actor_email: actorEmail,
  });
  if (error) throw new Error(error.message);
}

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

export async function createCollection(slug: string, name: string, image: string, actorEmail: string) {
  const { error } = await getSupabaseAdmin().rpc('admin_create_collection', {
    p_slug: slug, p_name: name, p_image: image, p_actor_email: actorEmail,
  });
  if (error) throw new Error(error.message);
}

export async function archiveCollection(slug: string, actorEmail: string) {
  const { error } = await getSupabaseAdmin().rpc('admin_archive_collection', {
    p_slug: slug, p_actor_email: actorEmail,
  });
  if (error) throw new Error(error.message);
}

function productFromRow(row: Record<string, unknown>): Product {
  const storedImages = Array.isArray(row.images) ? row.images.map(String).filter(Boolean) : [];
  const images = storedImages.length ? storedImages : [String(row.image), String(row.alternate)].filter(Boolean);
  return {
    code: row.code ? String(row.code) : undefined,
    slug: String(row.slug), name: String(row.name), category: String(row.category), collection: String(row.collection),
    updatedAt: String(row.updated_at),
    price: Number(row.price), compareAt: row.compare_at == null ? undefined : Number(row.compare_at), image: String(row.image),
    alternate: String(row.alternate), images, rating: Number(row.rating), reviews: Number(row.reviews), stock: Number(row.stock),
    colors: row.colors as string[], sizes: row.sizes as string[], featured: Boolean(row.featured), newArrival: Boolean(row.new_arrival),
    active: Boolean(row.active), description: String(row.description),
  };
}

function communityReviewFromRow(row: Record<string, unknown>): Review {
  const stored = row.metadata as Record<string, unknown>;
  const elapsed = Math.max(0, Date.now() - new Date(String(row.created_at)).getTime());
  const days = Math.floor(elapsed / 86_400_000);
  const dateAgo = days < 1 ? 'Just now' : days < 7 ? `${days}d ago` : days < 30 ? `${Math.floor(days / 7)}w ago` : `${Math.floor(days / 30)}m ago`;
  return {
    id: String(row.entity_id),
    author: String(stored.author),
    initials: String(stored.initials),
    verified: Boolean(stored.verified),
    purchasedSize: String(stored.purchasedSize),
    productSlug: String(stored.productSlug),
    productName: String(stored.productName),
    rating: Number(stored.rating),
    quote: String(stored.quote),
    stats: String(stored.stats),
    fitRating: String(stored.fitRating),
    dateAgo,
    helpfulCount: Number(stored.helpfulCount || 0),
    category: String(stored.category),
  };
}

export async function getCommunityReviews() {
  const { data, error } = await getSupabaseAdmin().from('audit_events').select('entity_id,action,metadata,created_at').eq('entity_type', 'community_review').order('created_at', { ascending: false }).limit(1000);
  if (error) throw new Error(error.message);
  const seen = new Set<string>();
  const active: Review[] = [];
  for (const row of data || []) {
    const id = String(row.entity_id);
    if (seen.has(id)) continue;
    seen.add(id);
    if (row.action === 'community_review.published') active.push(communityReviewFromRow(row));
  }
  return active;
}

export async function createCommunityReview(review: Review, actorEmail: string) {
  const client = getSupabaseAdmin();
  const id = randomUUID();
  const saved = { ...review, id, dateAgo: 'Just now', helpfulCount: 0 };
  const { data, error } = await client.from('audit_events').insert({ actor_email: actorEmail, action: 'community_review.published', entity_type: 'community_review', entity_id: id, metadata: saved }).select('entity_id,action,metadata,created_at').single();
  if (error) throw new Error(error.message);
  return communityReviewFromRow(data);
}

export async function deleteCommunityReview(id: string, actorEmail: string) {
  const { error } = await getSupabaseAdmin().from('audit_events').insert({ actor_email: actorEmail, action: 'community_review.deleted', entity_type: 'community_review', entity_id: id, metadata: {} });
  if (error) throw new Error(error.message);
}

async function orderFromRow(row: Record<string, unknown>): Promise<StoreOrder> {
  const items = await Promise.all((row.order_items as Array<Record<string, unknown>> || []).map(async (item) => ({
    slug: String(item.product_slug), size: String(item.size), color: String(item.color), qty: Number(item.quantity),
    unitPrice: Number(item.unit_price), lineTotal: Number(item.line_total),
    customDetails: item.custom_details ? await signedDetails(item.custom_details as CustomDetails) : undefined,
  })));
  return {
    token: String(row.public_token), number: String(row.order_number),
    customer: { firstName: String(row.first_name), lastName: String(row.last_name), email: String(row.email), phone: String(row.phone) },
    delivery: { address: String(row.address), city: String(row.city), province: String(row.province), postal: String(row.postal), note: String(row.customer_note) },
    items, subtotal: Number(row.subtotal), shipping: Number(row.shipping), total: Number(row.total),
    payment: row.payment_method as 'cod' | 'bank' | 'safepay', paymentStatus: String(row.payment_status || 'UNPAID'), status: String(row.status), createdAt: String(row.created_at),
  };
}

const orderSelect = '*, order_items(*)';

export async function getCatalog({ includeArchived = false } = {}) {
  const { data, error } = await getSupabaseAdmin().from('products').select('*').not('slug', 'like', 'custom-%').order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  const catalog = (data || []).map((row, index) => ({ ...productFromRow(row), code: `ZY-${String(index + 1).padStart(2, '0')}` }));
  return includeArchived ? catalog : catalog.filter((product) => product.active !== false);
}

export async function saveProduct(product: Product, actorEmail: string, originalSlug?: string) {
  const client = getSupabaseAdmin();
  let { error } = await client.rpc('admin_save_product_checked', {
    p_product: product, p_original_slug: originalSlug || null, p_actor_email: actorEmail,
  });
  // Keep the admin editor usable while an older production database is being
  // migrated. The checked RPC remains the normal path once it is available.
  if (error && isMissingDatabaseObject(error)) {
    ({ error } = await client.rpc('admin_upsert_product', {
      p_product: product, p_original_slug: originalSlug || null, p_actor_email: actorEmail,
    }));
  }
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
  const { data: id, error } = await client.rpc(input.payment === 'safepay' ? 'create_safepay_order' : 'create_order', {
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
  return Promise.all((data || []).map((row) => orderFromRow(row)));
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
    whatsappUrl: data.whatsapp_url || 'https://wa.me/966595943013',
    heroImage: data.hero_image || '/break-the-pattern-hero.jpeg',
    heroEyebrow: data.hero_eyebrow || 'ZYRA / DROP 01',
    heroHeading: data.hero_heading || 'BREAK\nTHE\nPATTERN',
    heroCtaLabel: data.hero_cta_label || 'Shop the drop',
    heroCtaHref: !data.hero_cta_href || data.hero_cta_href === '/collections/after-hours' ? '/collections' : data.hero_cta_href,
    homeContent: normalizeHomeContent(data.home_content),
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
