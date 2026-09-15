import { assertSameOrigin, consumeRateLimit, requireAdmin } from '@/lib/security';
import { getStoreSettings, updateStoreSettings, type StoreSettings } from '@/lib/supabase-store';
import { safeWebUrl } from '@/lib/safe-url';
import { defaultHomeContent, normalizeHomeContent } from '@/lib/home-content';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  if (!requireAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  return Response.json(await getStoreSettings());
}

export async function PUT(request: Request) {
  const actor = requireAdmin(request);
  if (!actor) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    assertSameOrigin(request);
    if (!(await consumeRateLimit(request, 'admin-settings', 30, 600))) return Response.json({ error: 'Too many requests.' }, { status: 429 });
    const body = (await request.json()) as StoreSettings;
    body.homeContent = normalizeHomeContent(body.homeContent);
    if (!Number.isSafeInteger(body.flatShipping) || body.flatShipping < 0) return Response.json({ error: 'Delivery fee must be zero or a positive whole amount.' }, { status: 400 });
    const safeAsset = safeWebUrl;
    const safeLink = safeWebUrl;
    for (const field of ['instagramUrl','facebookUrl','youtubeUrl','tiktokUrl','whatsappUrl'] as const) {
      if (body[field] && !safeWebUrl(body[field], false)) return Response.json({ error: 'Social links must be valid HTTPS addresses.' }, { status: 400 });
    }
    if (!body.storeName?.trim() || !/^\S+@\S+\.\S+$/.test(body.supportEmail || '') || !Number.isInteger(body.freeShippingThreshold) || body.freeShippingThreshold < 0 || !body.bankTransferInstructions?.trim() || !body.heroImage?.trim() || !safeAsset(body.heroImage) || !body.heroEyebrow?.trim() || body.heroEyebrow.length > 80 || !body.heroHeading?.trim() || body.heroHeading.length > 120 || !body.heroCtaLabel?.trim() || body.heroCtaLabel.length > 40 || !body.heroCtaHref?.trim() || !safeLink(body.heroCtaHref)) {
      return Response.json({ error: 'Invalid store settings.' }, { status: 400 });
    }
    if (Object.keys(body.homeContent).length !== Object.keys(defaultHomeContent).length || Object.values(body.homeContent).some((value) => value.length > 500)) {
      return Response.json({ error: 'Invalid homepage copy.' }, { status: 400 });
    }
    for (const key of ['assuranceThreeLink', 'customLink', 'trustTwoLink', 'trustFourLink'] as const) {
      if (!safeWebUrl(body.homeContent[key])) return Response.json({ error: 'Homepage links must be valid internal or HTTPS addresses.' }, { status: 400 });
    }
    for (const key of ['railOneCollection', 'railTwoCollection', 'railThreeCollection'] as const) {
      if (body.homeContent[key] !== 'all' && !/^[a-z0-9-]+$/.test(body.homeContent[key])) return Response.json({ error: 'Invalid homepage collection selection.' }, { status: 400 });
    }
    await updateStoreSettings(body, actor);
    return Response.json(await getStoreSettings());
  } catch {
    return Response.json({ error: 'Settings could not be saved.' }, { status: 400 });
  }
}
