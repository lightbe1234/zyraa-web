import type { MetadataRoute } from 'next';
import { readSeoCatalog } from '@/lib/seo-catalog';
import { absoluteUrl, helpSeo } from '@/lib/seo';
export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { catalog: products, collections, available } = await readSeoCatalog();
  if (!available) throw new Error('Live catalog is unavailable; retry sitemap later.');
  const paths = ['/', '/collections', ...Object.keys(helpSeo).map(key => `/pages/${key}`),
    ...collections.map(c => `/collections/${c.slug}`), ...products.map(p => `/products/${p.slug}`)];
  return [...new Set(paths)].map(path => ({ url: absoluteUrl(path) }));
}
