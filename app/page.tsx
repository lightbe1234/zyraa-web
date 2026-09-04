import StorefrontApp from '@/app/storefront-app';
import { products as seededProducts } from '@/lib/catalog';
import { getCatalog } from '@/lib/supabase-store';

export const dynamic = 'force-dynamic';

export default async function Home() {
  let initialCatalog = seededProducts;
  try {
    initialCatalog = await getCatalog();
  } catch {
    // Keep the storefront available when the database is temporarily unreachable.
  }
  return <StorefrontApp path="/" initialCatalog={initialCatalog} />;
}
