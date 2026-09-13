import 'server-only';
import { getSupabaseAdmin } from './supabase-server';
import { emptyProductDetails, type ProductExperience } from './product-experience-types';
import { isMissingDatabaseObject } from './supabase-errors';

export async function readProductExperience(slug: string): Promise<ProductExperience> {
  const db = getSupabaseAdmin();
  const [details, reviews] = await Promise.all([
    db.from('product_details').select('details').eq('product_slug', slug).maybeSingle(),
    db.from('product_reviews').select('id,author,rating,text,size,created_at').eq('product_slug', slug).order('created_at', { ascending: false }).limit(100),
  ]);
  if (details.error || reviews.error) {
    // A rolling deploy can briefly run newer code against an older schema.
    // Return an honest empty state instead of breaking the product page; once
    // the migration is applied, the durable records are read automatically.
    if (isMissingDatabaseObject(details.error) || isMissingDatabaseObject(reviews.error)) {
      return { details: { ...emptyProductDetails }, reviews: [], reviewsAvailable: false };
    }
    throw new Error('Product details unavailable');
  }
  return { details: details.data?.details || { ...emptyProductDetails }, reviews: (reviews.data || []).map(r => ({ id: r.id, author: r.author, rating: r.rating, text: r.text, size: r.size, createdAt: r.created_at })), reviewsAvailable: true };
}
