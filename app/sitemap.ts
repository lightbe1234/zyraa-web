import type { MetadataRoute } from 'next';
import { readSeoCatalog } from '@/lib/seo-catalog';
import { absoluteUrl, helpSeo } from '@/lib/seo';
// Build the first snapshot at deploy time and refresh it in the background.
// Search crawlers should never have to wait on a cold database connection.
export const revalidate = 3600;
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { catalog: products, collections, available } = await readSeoCatalog();
  if (!available) throw new Error('Live catalog is unavailable; retry sitemap later.');
  const paths = ['/', '/collections', ...Object.keys(helpSeo).map(key => `/pages/${key}`),
    ...collections.map(c => `/collections/${c.slug}`), ...products.map(p => `/products/${p.slug}`)];
  return [...new Set(paths)].map(path => ({ url: absoluteUrl(path) }));
}
