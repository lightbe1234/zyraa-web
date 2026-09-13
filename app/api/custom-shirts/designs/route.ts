import { createCustomDesign, designProducts } from '@/lib/custom-shirts-server';
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
    const textKeys = ['colour','fabric','print','size','frontArtwork','backArtwork','instructions'];
    if (!textKeys.every(key => typeof b[key] === 'string') || b.instructions.length > 1200 || (!b.frontArtwork && !b.backArtwork) || (b.frontArtwork && !/^[a-f0-9-]{36}\.(png|jpg|webp)$/.test(b.frontArtwork)) || (b.backArtwork && !/^[a-f0-9-]{36}\.(png|jpg|webp)$/.test(b.backArtwork))) throw new Error('Invalid design');
    const list = (value: unknown, legacy: unknown) => {
      const raw = value === undefined ? legacy : value;
      if (raw === undefined || raw === null || raw === '') return [];
      if (Array.isArray(raw) && raw.every(item => typeof item === 'string')) return raw;
      if (typeof raw === 'string') return [raw];
      throw new Error('Invalid placement');
    };
    const frontPositions = list(b.frontPositions, b.frontPosition);
    const backPositions = list(b.backPositions, b.backPosition);
    const allPositions = [...frontPositions, ...backPositions];
    if (allPositions.length > 20 || new Set(frontPositions).size !== frontPositions.length || new Set(backPositions).size !== backPositions.length || (['front','both'].includes(b.print) ? !frontPositions.length : frontPositions.length) || (['back','both'].includes(b.print) ? !backPositions.length : backPositions.length)) throw new Error('Invalid placement');
    const data = await createCustomDesign({ colour: b.colour, fabric: b.fabric, print: b.print, size: b.size, instructions: b.instructions, frontArtwork: b.frontArtwork, backArtwork: b.backArtwork, frontPositions, backPositions });
    return Response.json((await designProducts([data]))[0], { status: 201 });
  } catch { return Response.json({ error: 'Your design could not be saved. Check your choices and try again.' }, { status: 400 }); }
}
