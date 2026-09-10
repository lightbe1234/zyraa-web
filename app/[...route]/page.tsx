import StorefrontApp from '../storefront-app';
import { notFound } from 'next/navigation';
import { readSeoCatalog } from '@/lib/seo-catalog';
import { absoluteUrl, breadcrumbs, collectionDescription, collectionTitle, helpSeo, pageMetadata, productMetadata, productSchema, serializeSchema } from '@/lib/seo';
import { categories, products as seededProducts, type Category } from '@/lib/catalog';
import { defaultHomeCollectionCards, type HomeCollectionCard } from '@/lib/home-collection-cards';
import { getContentSections, getHomeCollectionCards, getStoreSettings, type ContentSection, type StoreSettings } from '@/lib/supabase-store';

export const dynamic = 'force-dynamic';
export async function generateMetadata({ params }: { params: Promise<{ route: string[] }> }) {
  const { route } = await params;
  const path = `/${route.join('/')}`;
  if (path === '/customise-your-shirt') return pageMetadata('Customise Your Shirt', 'Choose your shirt colour and fabric, upload your artwork and make a custom ZYRA shirt.', path);
  const { catalog, collections, available } = await readSeoCatalog();
  if (route[0] === 'products' && route.length === 2) {
    const product = catalog.find(p => p.slug === route[1]);
    if (product && available) return productMetadata(product);
  }
  if (route[0] === 'collections' && route.length <= 2) {
    const category = collections.find(c => c.slug === route[1]);
    if (category || route.length === 1) {
      const name = category?.name || 'All Clothing';
      return pageMetadata(collectionTitle(name), collectionDescription(name), path, category?.image, available);
    }
  }
  if (route[0] === 'pages' && route.length === 2 && helpSeo[route[1]]) {
    const [title, description] = helpSeo[route[1]];
    return pageMetadata(title, description, path);
  }
  return pageMetadata('Customer Account & Order Tools', 'Manage your ZYRA shopping session and order.', path, undefined, false);
}
export default async function CatchAll({
  params,
}: {
  params: Promise<{ route: string[] }>;
}) {
  const { route } = await params;
  const seoData = await readSeoCatalog();
  const path = `/${route.join('/')}`;
  const product = route[0] === 'products' && route.length === 2 ? seoData.catalog.find(p => p.slug === route[1]) : undefined;
  const collection = seoData.collections.find(c => c.slug === route[1]);
  const publicHelp = route[0] === 'pages' && route.length === 2 && helpSeo[route[1]];
  const utility = ['cart', 'checkout', 'search', 'track-order', 'account', 'customise-your-shirt'].includes(route[0]) && route.length === 1 || route[0] === 'admin' || route[0] === 'order-confirmation';
  if (!product && !publicHelp && !utility && !(route[0] === 'collections' && (route.length === 1 || route.length === 2 && collection))) notFound();
  let initialCatalog = seededProducts;
  let initialSettings: StoreSettings | undefined;
  let initialSections: ContentSection[] = [];
  let initialCollections: Category[] = categories;
  let initialHomeCollectionCards: HomeCollectionCard[] = defaultHomeCollectionCards;
  try {
    [initialSettings, initialSections, initialHomeCollectionCards] = await Promise.all([
      getStoreSettings(),
      getContentSections(),
      getHomeCollectionCards(),
    ]);
  } catch {
    // Keep the storefront available when the database is temporarily unreachable.
  }
  initialCatalog = seoData.catalog;
  initialCollections = seoData.collections;
  const schema: unknown[] = [];
  if (product && seoData.available) schema.push(productSchema(product), breadcrumbs([['Home', '/'], ['Collections', '/collections'], [product.name, path]]));
  if (route[0] === 'collections' && seoData.available) {
    const listedProducts = collection ? seoData.catalog.filter(item => item.collection === collection.name || item.category === collection.name) : seoData.catalog;
    schema.push(breadcrumbs([['Home', '/'], [collection?.name || 'Collections', path]]), {
      '@context': 'https://schema.org', '@type': 'CollectionPage', name: collection?.name || 'All collections', url: absoluteUrl(path),
      mainEntity: {
        '@type': 'ItemList', numberOfItems: listedProducts.length,
        itemListElement: listedProducts.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.name, url: absoluteUrl(`/products/${item.slug}`) })),
      },
    });
  }
  if (publicHelp) schema.push(breadcrumbs([['Home', '/'], [publicHelp[0], path]]));
  return <><StorefrontApp path={path} initialCatalog={initialCatalog} initialSettings={initialSettings} initialSections={initialSections} initialCollections={initialCollections} initialHomeCollectionCards={initialHomeCollectionCards} />{schema.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeSchema(schema) }} />}</>;
}
