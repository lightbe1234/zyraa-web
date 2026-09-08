import { assertSameOrigin, consumeRateLimit, requireAdmin } from '@/lib/security';
import { getHomeCollectionCards, updateHomeCollectionCard } from '@/lib/supabase-store';
import type { HomeCollectionCard } from '@/lib/home-collection-cards';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  if (!requireAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  return Response.json(await getHomeCollectionCards({ includeInactive: true }));
}

export async function PATCH(request: Request) {
  const actor = requireAdmin(request);
  if (!actor) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    assertSameOrigin(request);
    if (!(await consumeRateLimit(request, 'admin-home-collection-cards', 30, 600))) {
      return Response.json({ error: 'Too many homepage card updates.' }, { status: 429 });
    }
    const body = (await request.json()) as Partial<HomeCollectionCard>;
    const card: HomeCollectionCard = {
      key: body.key?.trim() || '',
      eyebrow: body.eyebrow?.trim() || '',
      title: body.title?.trim() || '',
      image: body.image?.trim() || '',
      collectionSlug: body.collectionSlug?.trim() || '',
      sortOrder: Number.isInteger(body.sortOrder) ? body.sortOrder! : 0,
      enabled: body.enabled !== false,
    };
    const safeImage = card.image.startsWith('/') || /^https:\/\//i.test(card.image);
    if (!/^[a-z0-9-]+$/.test(card.key) || !/^[a-z0-9-]+$/.test(card.collectionSlug)
      || card.eyebrow.length < 1 || card.eyebrow.length > 80
      || card.title.length < 1 || card.title.length > 80
      || card.image.length < 1 || card.image.length > 2048 || !safeImage) {
      return Response.json({ error: 'Enter a valid card name, image and destination collection.' }, { status: 400 });
    }
    await updateHomeCollectionCard(card, actor);
    return Response.json(await getHomeCollectionCards({ includeInactive: true }));
  } catch (error) {
    const detail = error instanceof Error ? error.message : '';
    const message = detail.includes('COLLECTION_NOT_FOUND')
      ? 'Choose an active destination collection.'
      : detail.includes('HOME_COLLECTION_CARD_NOT_FOUND')
        ? 'Homepage collection card not found.'
        : 'Homepage collection card could not be updated.';
    return Response.json({ error: message }, { status: 400 });
  }
}
