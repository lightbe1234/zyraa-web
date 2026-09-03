import { createClient } from '@supabase/supabase-js';
import { products } from '../lib/catalog.ts';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) throw new Error('Supabase environment is not configured.');

const client = createClient(url, secret, { auth: { persistSession: false } });
const rows = products.map((product) => ({
  slug: product.slug,
  name: product.name,
  category: product.category,
  collection: product.collection,
  price: product.price,
  compare_at: product.compareAt ?? null,
  image: product.image,
  alternate: product.alternate,
  rating: product.rating,
  reviews: product.reviews,
  stock: product.stock,
  colors: product.colors,
  sizes: product.sizes,
  featured: Boolean(product.featured),
  new_arrival: Boolean(product.newArrival),
  active: product.active !== false,
  description: product.description,
}));

const { error } = await client.from('products').upsert(rows, { onConflict: 'slug' });
if (error) throw error;
console.log(`Seeded ${rows.length} ZYRA products.`);
