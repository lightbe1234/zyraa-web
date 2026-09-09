import { cache } from 'react';
import { getCatalog, getCollections } from './supabase-store';
import { products, categories } from './catalog';
import { slugify } from './seo';

// Share one catalog snapshot between metadata and the page during a request.
export const readSeoCatalog = cache(async () => {
  try {
    const [catalog, collections] = await Promise.all([getCatalog(), getCollections()]);
    const known = new Set(collections.map(c => c.slug));
    for (const product of catalog) {
      const slug = slugify(product.collection);
      if (slug && !known.has(slug)) {
        collections.push({ slug, name: product.collection, image: product.image });
        known.add(slug);
      }
    }
    return { catalog, collections, available: true };
  } catch {
    // Keep the preview usable, but never index seeded demo data during an outage.
    return { catalog: products, collections: categories, available: false };
  }
});
