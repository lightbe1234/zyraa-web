import { getCollections, getContentSections, getStoreSettings } from '@/lib/supabase-store';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const [settings, sections, collections] = await Promise.all([getStoreSettings(), getContentSections(), getCollections()]);
    return Response.json({ settings, sections, collections }, { headers: { 'cache-control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Store configuration is temporarily unavailable.' }, { status: 503 });
  }
}
