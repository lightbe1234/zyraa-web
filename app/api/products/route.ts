import { getCatalog } from '@/lib/supabase-store';

export const runtime = 'nodejs';

export async function GET() {
  try {
    return Response.json(await getCatalog());
  } catch {
    return Response.json({ error: 'Catalog is temporarily unavailable.' }, { status: 503 });
  }
}
