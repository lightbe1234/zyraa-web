import StorefrontApp from '@/app/storefront-app';
import { categories, products as seededProducts, type Category } from '@/lib/catalog';
import { getCatalog, getCollections, getContentSections, getStoreSettings, type ContentSection, type StoreSettings } from '@/lib/supabase-store';

export const dynamic = 'force-dynamic';

export default async function Home() {
  let initialCatalog = seededProducts;
  let initialSettings: StoreSettings | undefined;
  let initialSections: ContentSection[] = [];
  let initialCollections: Category[] = categories;
  try {
    [initialCatalog, initialSettings, initialSections, initialCollections] = await Promise.all([
      getCatalog(),
      getStoreSettings(),
      getContentSections(),
      getCollections(),
    ]);
  } catch {
    // Keep the storefront available when the database is temporarily unreachable.
  }
  return <StorefrontApp path="/" initialCatalog={initialCatalog} initialSettings={initialSettings} initialSections={initialSections} initialCollections={initialCollections} />;
}
