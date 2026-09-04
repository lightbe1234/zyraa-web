import { assertSameOrigin, consumeRateLimit, requireAdmin } from '@/lib/security';
import { getStoreSettings, updateStoreSettings, type StoreSettings } from '@/lib/supabase-store';

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
    const safeAsset = (value: string) => value.startsWith('/') || /^https:\/\//i.test(value);
    const safeLink = (value: string) => value.startsWith('/') || /^https:\/\//i.test(value);
    if (!body.storeName?.trim() || !/^\S+@\S+\.\S+$/.test(body.supportEmail || '') || !Number.isInteger(body.freeShippingThreshold) || body.freeShippingThreshold < 0 || !body.bankTransferInstructions?.trim() || !body.heroImage?.trim() || !safeAsset(body.heroImage) || !body.heroEyebrow?.trim() || body.heroEyebrow.length > 80 || !body.heroHeading?.trim() || body.heroHeading.length > 120 || !body.heroCtaLabel?.trim() || body.heroCtaLabel.length > 40 || !body.heroCtaHref?.trim() || !safeLink(body.heroCtaHref)) {
      return Response.json({ error: 'Invalid store settings.' }, { status: 400 });
    }
    await updateStoreSettings(body, actor);
    return Response.json(await getStoreSettings());
  } catch {
    return Response.json({ error: 'Settings could not be saved.' }, { status: 400 });
  }
}
