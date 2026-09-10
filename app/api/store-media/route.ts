import { getSupabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const path = new URL(request.url).searchParams.get('path') || '';
  if (!/^[a-zA-Z0-9/_-]+\.(?:jpe?g|png|webp|avif)$/i.test(path) || path.length > 300 || path.includes('..')) return new Response(null, { status: 400 });
  const { data, error } = await getSupabaseAdmin().storage.from('product-images').download(path);
  if (error || !data) return new Response(null, { status: 404 });
  return new Response(await data.arrayBuffer(), { headers: { 'content-type': data.type || 'image/jpeg', 'cache-control': 'public, max-age=3600, stale-while-revalidate=86400' } });
}
