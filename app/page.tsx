import StorefrontApp from '@/app/storefront-app';
import { categories, products as seededProducts, type Category } from '@/lib/catalog';
import { defaultHomeCollectionCards, type HomeCollectionCard } from '@/lib/home-collection-cards';
import { getCatalog, getCollections, getContentSections, getHomeCollectionCards, getStoreSettings, type ContentSection, type StoreSettings } from '@/lib/supabase-store';

export const dynamic = 'force-dynamic';
import { pageMetadata } from '@/lib/seo';
export const metadata = pageMetadata('Streetwear & Everyday Clothing in Pakistan', 'Discover ZYRA streetwear in Pakistan. Shop tees, everyday essentials and new styles, with product sizing, delivery information and 7-day size exchanges.', '/');

export default async function Home() {
  let initialCatalog = seededProducts;
  let initialSettings: StoreSettings | undefined;
  let initialSections: ContentSection[] = [];
  let initialCollections: Category[] = categories;
  let initialHomeCollectionCards: HomeCollectionCard[] = defaultHomeCollectionCards;
  try {
    [initialCatalog, initialSettings, initialSections, initialCollections, initialHomeCollectionCards] = await Promise.all([
      getCatalog(),
      getStoreSettings(),
      getContentSections(),
      getCollections(),
      getHomeCollectionCards(),
    ]);
  } catch {
    // Keep the storefront available when the database is temporarily unreachable.
  }
  return <StorefrontApp path="/" initialCatalog={initialCatalog} initialSettings={initialSettings} initialSections={initialSections} initialCollections={initialCollections} initialHomeCollectionCards={initialHomeCollectionCards} />;
}
