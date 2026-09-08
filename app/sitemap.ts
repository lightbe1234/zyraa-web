import type { MetadataRoute } from 'next';
import { products } from '@/lib/catalog';
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  return [
    { url: base, lastModified: new Date(), priority: 1 },
    { url: `${base}/collections`, lastModified: new Date(), priority: 0.9 },
    ...['shipping', 'returns', 'faq', 'fabric-care', 'contact', 'privacy', 'terms', 'website-terms'].map(page => ({
      url: `${base}/pages/${page}`, lastModified: new Date(), priority: 0.5,
    })),
    ...products.map((product) => ({
      url: `${base}/products/${product.slug}`,
      lastModified: new Date(),
      priority: 0.7,
    })),
  ];
}
