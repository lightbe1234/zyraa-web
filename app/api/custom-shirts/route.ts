import { customConfig } from '@/lib/custom-shirts-server';
export const dynamic = 'force-dynamic';
export async function GET() {
  try { return Response.json(await customConfig(), { headers: { 'cache-control': 'no-store' } }); }
  catch { return Response.json({ error: 'The shirt studio is temporarily unavailable. Please try again.' }, { status: 503 }); }
}
