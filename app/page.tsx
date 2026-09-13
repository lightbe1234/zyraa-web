import StorefrontApp from '@/app/storefront-app';
import type { Category, Product } from '@/lib/catalog';
import type { HomeCollectionCard } from '@/lib/home-collection-cards';
import { getCatalog, getCollections, getContentSections, getHomeCollectionCards, getStoreSettings, type ContentSection, type StoreSettings } from '@/lib/supabase-store';

export const dynamic = 'force-dynamic';
import { pageMetadata } from '@/lib/seo';
export const metadata = pageMetadata('Streetwear & Everyday Clothing in Pakistan', 'Discover ZYRA streetwear in Pakistan. Shop tees, everyday essentials and new styles, with product sizing, delivery information and 7-day size exchanges.', '/');

export default async function Home() {
  let initialCatalog: Product[] | undefined;
  let initialSettings: StoreSettings | undefined;
  let initialSections: ContentSection[] = [];
  let initialCollections: Category[] = [];
  let initialHomeCollectionCards: HomeCollectionCard[] = [];
  const results = await Promise.allSettled([
    getCatalog(), getStoreSettings(), getContentSections(), getCollections(), getHomeCollectionCards(),
  ]);
  if (results[0].status === 'fulfilled') initialCatalog = results[0].value;
  if (results[1].status === 'fulfilled') initialSettings = results[1].value;
  if (results[2].status === 'fulfilled') initialSections = results[2].value;
  if (results[3].status === 'fulfilled') initialCollections = results[3].value;
  if (results[4].status === 'fulfilled') initialHomeCollectionCards = results[4].value;
  return <StorefrontApp path="/" initialCatalog={initialCatalog} initialSettings={initialSettings} initialSections={initialSections} initialCollections={initialCollections} initialHomeCollectionCards={initialHomeCollectionCards} />;
}
