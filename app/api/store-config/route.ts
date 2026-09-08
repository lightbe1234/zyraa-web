import { getCollections, getContentSections, getHomeCollectionCards, getStoreSettings } from '@/lib/supabase-store';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const [settings, sections, collections, homeCollectionCards] = await Promise.all([
      getStoreSettings(), getContentSections(), getCollections(), getHomeCollectionCards(),
    ]);
    return Response.json({ settings, sections, collections, homeCollectionCards }, { headers: { 'cache-control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Store configuration is temporarily unavailable.' }, { status: 503 });
  }
}
