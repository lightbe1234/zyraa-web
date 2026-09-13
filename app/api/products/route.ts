import { getCatalog } from '@/lib/supabase-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return Response.json(await getCatalog(), { headers: { 'cache-control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Catalog is temporarily unavailable.' }, { status: 503 });
  }
}
