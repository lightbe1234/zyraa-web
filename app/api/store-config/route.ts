import { getContentSections, getStoreSettings } from '@/lib/supabase-store';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const [settings, sections] = await Promise.all([getStoreSettings(), getContentSections()]);
    return Response.json({ settings, sections }, { headers: { 'cache-control': 'public, s-maxage=60, stale-while-revalidate=300' } });
  } catch {
    return Response.json({ error: 'Store configuration is temporarily unavailable.' }, { status: 503 });
  }
}
