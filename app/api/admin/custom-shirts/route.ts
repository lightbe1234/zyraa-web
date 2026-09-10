import { customConfig } from '@/lib/custom-shirts-server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { assertSameOrigin, consumeRateLimit, requireAdmin } from '@/lib/security';
export async function GET(request: Request) {
  if (!requireAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try { return Response.json(await customConfig(true)); } catch { return Response.json({ error: 'Custom shirt settings could not load.' }, { status: 503 }); }
}
export async function POST(request: Request) {
  const actor = requireAdmin(request);
  if (!actor) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    assertSameOrigin(request);
    if (!await consumeRateLimit(request, 'admin-custom-shirts', 40, 600)) return Response.json({ error: 'Too many updates.' }, { status: 429 });
    const { option, settings } = await request.json();
    const validImage = (image: unknown) => typeof image === 'string' && (!image || image.startsWith('/') || image.startsWith(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/`));
    if (option && (!['colour','fabric','print','front-position','back-position'].includes(option.kind) || !Number.isSafeInteger(option.price) || option.price < 0 || option.price > 10000000 || !validImage(option.image))) throw new Error('Invalid option');
    if (settings && !validImage(settings.custom_banner_image)) throw new Error('Invalid banner image');
    const { error } = await getSupabaseAdmin().rpc('save_custom_shirt_config', { p_option: option || null, p_settings: settings || null, p_actor: actor });
    if (error) throw error;
    return Response.json(await customConfig(true));
  } catch { return Response.json({ error: 'Settings could not be saved. Check the price, name and image.' }, { status: 400 }); }
}
