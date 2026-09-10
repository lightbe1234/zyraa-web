import { designProducts } from '@/lib/custom-shirts-server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { assertSameOrigin, consumeRateLimit } from '@/lib/security';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const slugs = new URL(request.url).searchParams.getAll('slug');
    return Response.json(await designProducts(slugs), { headers: { 'cache-control': 'private, no-store' } });
  } catch { return Response.json({ error: 'Unable to load your design.' }, { status: 400 }); }
}
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    if (!await consumeRateLimit(request, 'custom-design', 20, 600)) return Response.json({ error: 'Please wait a moment before saving another design.' }, { status: 429 });
    const b = await request.json();
    if (!['colour','fabric','print','frontPosition','backPosition','size','frontArtwork','backArtwork','instructions'].every(k => typeof b[k] === 'string') || b.instructions.length > 1200 || (!b.frontArtwork && !b.backArtwork) || (b.frontArtwork && !/^[a-f0-9-]{36}\.(png|jpg|webp)$/.test(b.frontArtwork)) || (b.backArtwork && !/^[a-f0-9-]{36}\.(png|jpg|webp)$/.test(b.backArtwork))) throw new Error('Invalid design');
    const artwork = JSON.stringify({ front: b.frontArtwork || null, back: b.backArtwork || null });
    const { data, error } = await getSupabaseAdmin().rpc('create_custom_shirt_design', { p_colour: b.colour, p_fabric: b.fabric, p_print: b.print, p_front_position: b.frontPosition || null, p_back_position: b.backPosition || null, p_size: b.size, p_instructions: b.instructions, p_artwork: artwork });
    if (error) throw error;
    return Response.json((await designProducts([data]))[0], { status: 201 });
  } catch { return Response.json({ error: 'Your design could not be saved. Check your choices and try again.' }, { status: 400 }); }
}
