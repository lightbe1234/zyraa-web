import 'server-only';
import { getSupabaseAdmin } from './supabase-server';
import type { CustomConfig, CustomDetails } from './custom-shirts';
import type { Product } from './catalog';

export async function customConfig(admin = false): Promise<CustomConfig> {
  const db = getSupabaseAdmin();
  let query = db.from('custom_shirt_options').select('*').order('sort_order');
  if (!admin) query = query.eq('active', true);
  const [options, settings] = await Promise.all([query, db.from('custom_shirt_settings').select('*').single()]);
  if (options.error || settings.error) throw new Error('Custom shirt options are unavailable. Please try again shortly.');
  return { options: options.data!, settings: settings.data! };
}
export async function signedDetails(details: CustomDetails): Promise<CustomDetails> {
  const db = getSupabaseAdmin();
  const front = details.frontArtwork || (!details.backArtwork ? details.artwork : '');
  const back = details.backArtwork;
  const [{ data: frontData }, { data: backData }] = await Promise.all([
    front ? db.storage.from('custom-artwork').createSignedUrl(front, 3600) : Promise.resolve({ data: null }),
    back ? db.storage.from('custom-artwork').createSignedUrl(back, 3600) : Promise.resolve({ data: null }),
  ]);
  return { ...details, image: frontData?.signedUrl || backData?.signedUrl, frontImage: frontData?.signedUrl, backImage: backData?.signedUrl };
}
export async function designProducts(slugs: string[]): Promise<Product[]> {
  if (!slugs.length) return [];
  if (slugs.length > 50 || slugs.some(s => !/^custom-[a-f0-9]{32}$/.test(s))) throw new Error('Invalid saved design.');
  const db = getSupabaseAdmin();
  const { data, error } = await db.from('custom_shirt_designs').select('*,products(*)').in('slug', slugs).gt('expires_at', new Date().toISOString());
  if (error) throw new Error('Your saved design could not be loaded.');
  return Promise.all((data || []).map(async row => {
    const p = row.products as Record<string, any>;
    const details = await signedDetails(row.details as CustomDetails);
    return { slug: row.slug, name: 'Your custom shirt', category: 'Custom shirt', collection: 'Custom shirt', price: p.price, image: details.image || '', alternate: details.image || '', images: [details.image || ''], rating: 0, reviews: 0, stock: p.stock, colors: p.colors, sizes: p.sizes, featured: false, newArrival: false, active: true, description: `${details.fabric} · ${details.print}`, customDetails: details } as Product;
  }));
}
