import 'server-only';
import { getSupabaseAdmin } from './supabase-server';
import { type CustomConfig, type CustomDetails } from './custom-shirts';
import type { Product } from './catalog';
import { isMissingDatabaseObject } from './supabase-errors';

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

type CustomDesignInput = {
  colour: string;
  fabric: string;
  print: string;
  size: string;
  instructions: string;
  frontArtwork: string;
  backArtwork: string;
  frontPositions: string[];
  backPositions: string[];
};

/** Price and persist every placement in one database transaction. */
export async function createCustomDesign(input: CustomDesignInput): Promise<string> {
  const db = getSupabaseAdmin();
  const artwork = JSON.stringify({ front: input.frontArtwork || null, back: input.backArtwork || null });
  const { data: slug, error } = await db.rpc('create_custom_shirt_design_multi', {
    p_colour: input.colour,
    p_fabric: input.fabric,
    p_print: input.print,
    p_front_positions: input.frontPositions,
    p_back_positions: input.backPositions,
    p_size: input.size,
    p_instructions: input.instructions,
    p_artwork: artwork,
  });
  if (!error && typeof slug === 'string') return slug;
  if (error && !isMissingDatabaseObject(error)) throw error;

  // Older databases only know the single-placement function. Use it as a
  // compatibility bridge, then enrich the newly-created private design with
  // every selected placement. New databases always use the atomic RPC above.
  const legacy = await db.rpc('create_custom_shirt_design', {
    p_colour: input.colour,
    p_fabric: input.fabric,
    p_print: input.print,
    p_front_position: input.frontPositions[0] || null,
    p_back_position: input.backPositions[0] || null,
    p_size: input.size,
    p_instructions: input.instructions,
    p_artwork: artwork,
  });
  if (legacy.error || typeof legacy.data !== 'string') throw legacy.error || new Error('Your design could not be saved.');
  const createdSlug = legacy.data;
  const ids = [...input.frontPositions, ...input.backPositions];
  const { data: options, error: optionsError } = await db.from('custom_shirt_options').select('id,name,price,kind').in('id', ids);
  if (optionsError) throw optionsError;
  const optionMap = new Map((options || []).map((row) => [String(row.id), { name: String(row.name), price: Number(row.price), kind: String(row.kind) }]));
  const front = input.frontPositions.map((id) => optionMap.get(id)).filter((row): row is { name: string; price: number; kind: string } => Boolean(row));
  const back = input.backPositions.map((id) => optionMap.get(id)).filter((row): row is { name: string; price: number; kind: string } => Boolean(row));
  if (front.length !== input.frontPositions.length || back.length !== input.backPositions.length) throw new Error('Invalid placement.');
  const { data: design, error: designError } = await db.from('custom_shirt_designs').select('details').eq('slug', createdSlug).single();
  const { data: product, error: productError } = await db.from('products').select('price').eq('slug', createdSlug).single();
  if (designError || productError || !design || !product) throw designError || productError || new Error('Your design could not be saved.');
  const current = design.details as Record<string, unknown>;
  const previousPlacementTotal = Number(current.frontPositionPrice || 0) + Number(current.backPositionPrice || 0);
  const frontTotal = front.reduce((sum, row) => sum + row.price, 0);
  const backTotal = back.reduce((sum, row) => sum + row.price, 0);
  const details = {
    ...current,
    frontPositions: front.map((row) => row.name), backPositions: back.map((row) => row.name),
    frontPositionPrices: front.map((row) => row.price), backPositionPrices: back.map((row) => row.price),
    frontPositionPrice: frontTotal, backPositionPrice: backTotal,
    frontPosition: front.map((row) => row.name).join(' + '), backPosition: back.map((row) => row.name).join(' + '),
  };
  const [{ error: updateDesignError }, { error: updateProductError }] = await Promise.all([
    db.from('custom_shirt_designs').update({ details }).eq('slug', createdSlug),
    db.from('products').update({ price: Number(product.price) + frontTotal + backTotal - previousPlacementTotal, description: [current.fabric, details.frontPosition, details.backPosition].filter(Boolean).join(' · ') }).eq('slug', createdSlug),
  ]);
  if (updateDesignError || updateProductError) throw updateDesignError || updateProductError || new Error('Your design could not be saved.');

  return createdSlug;
}
