import type { Metadata } from 'next';
import type { Product } from './catalog.ts';

export const productionOrigin = 'https://zyraa-web.vercel.app';
export function siteOrigin() {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SITE_URL || productionOrigin);
    return url.protocol === 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname) ? url.origin : productionOrigin;
  } catch { return productionOrigin; }
}
export const absoluteUrl = (path: string) => new URL(path, siteOrigin()).href;
export const slugify = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const helpSeo: Record<string, [string, string]> = {
  shipping: ['Delivery Information in Pakistan', 'Check ZYRA delivery information, courier partners, shipping charges and what to expect after placing your order.'],
  returns: ['Returns & 7-Day Size Exchanges', 'Read ZYRA’s 7-day size exchange policy, eligibility and how to request help with a wrong or damaged item.'],
  faq: ['Sizing & Shopping FAQs', 'Find answers about ZYRA sizing, orders, payment, delivery and exchanges before choosing your next piece.'],
  'fabric-care': ['Fabric & Clothing Care Guide', 'Keep your ZYRA pieces looking their best. Read washing, drying, storage and garment-label guidance.'],
  contact: ['Contact ZYRA Customer Help', 'Contact ZYRA for help with sizing, product questions, delivery or an existing order in Pakistan.'],
  privacy: ['Privacy Policy', 'Learn how ZYRA handles personal information, browser storage and order information when you use the store.'],
  terms: ['Terms of Sale', 'Read ZYRA’s terms of sale covering orders, payments, product information, delivery and exchanges.'],
  'website-terms': ['Website Terms of Use', 'Read the terms for browsing and using the ZYRA online store and its customer-help tools.'],
};
export function collectionDescription(name: string) {
  return `Shop ${name.toLowerCase()} at ZYRA in Pakistan. Compare styles, colours, available sizes and prices, then check each piece’s fit and care details.`;
}
export function pageMetadata(title: string, description: string, path: string, image = '/og.png', index = true): Metadata {
  const fullTitle = `${title} | ZYRA`;
  return {
    title: { absolute: fullTitle }, description,
    alternates: { canonical: absoluteUrl(path) },
    robots: { index, follow: index, ...(index ? { googleBot: { index: true, follow: true, 'max-image-preview': 'large' as const, 'max-snippet': -1 } } : {}) },
    openGraph: { type: 'website', locale: 'en_PK', siteName: 'ZYRA', title: fullTitle, description, url: absoluteUrl(path), images: [{ url: absoluteUrl(image), alt: title }] },
    twitter: { card: 'summary_large_image', title: fullTitle, description, images: [absoluteUrl(image)] },
  };
}
export function productMetadata(product: Product) {
  return pageMetadata(`${product.name} – ${product.category}`, `${product.name} by ZYRA. ${product.description}`.replace(/\s+/g, ' ').slice(0, 165), `/products/${product.slug}`, product.image);
}
export function productSchema(product: Product) {
  return {
    '@context': 'https://schema.org', '@type': 'Product',
    '@id': absoluteUrl(`/products/${product.slug}#product`),
    name: product.name, description: product.description, sku: product.slug,
    image: [...new Set([product.image, ...(product.images || []), product.alternate].filter(Boolean))].map(absoluteUrl),
    brand: { '@type': 'Brand', name: 'ZYRA' }, category: product.category,
    color: product.colors.join(', '), size: product.sizes,
    offers: { '@type': 'Offer', url: absoluteUrl(`/products/${product.slug}`), priceCurrency: 'PKR',
      price: `${Math.floor(product.price / 100)}.${String(product.price % 100).padStart(2, '0')}`,
      availability: `https://schema.org/${product.stock > 0 ? 'InStock' : 'OutOfStock'}`,
      itemCondition: 'https://schema.org/NewCondition', seller: { '@id': absoluteUrl('/#organization') } },
  };
}
export function breadcrumbs(items: Array<[string, string]>) {
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(([name, path], index) => ({ '@type': 'ListItem', position: index + 1, name, item: absoluteUrl(path) })) };
}
export function serializeSchema(value: unknown) { return JSON.stringify(value).replace(/</g, '\\u003c'); }
