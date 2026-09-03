import { assertSameOrigin, consumeRateLimit, requireAdmin } from '@/lib/security';
import { getCollections, updateCollection } from '@/lib/supabase-store';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  if (!requireAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  return Response.json(await getCollections({ includeInactive: true }));
}

export async function PATCH(request: Request) {
  const actor = requireAdmin(request);
  if (!actor) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    assertSameOrigin(request);
    if (!(await consumeRateLimit(request, 'admin-collections', 40, 600))) {
      return Response.json({ error: 'Too many collection updates.' }, { status: 429 });
    }
    const body = (await request.json()) as { slug?: string; name?: string; image?: string };
    const slug = body.slug?.trim() || '';
    const name = body.name?.trim() || '';
    const image = body.image?.trim() || '';
    if (!/^[a-z0-9-]+$/.test(slug) || name.length < 1 || name.length > 80 || image.length < 1 || image.length > 2048) {
      return Response.json({ error: 'Enter a valid collection name and image.' }, { status: 400 });
    }
    await updateCollection(slug, name, image, actor);
    return Response.json(await getCollections({ includeInactive: true }));
  } catch (error) {
    const message = error instanceof Error && error.message.includes('store_collections_name_unique')
      ? 'That collection name is already in use.'
      : error instanceof Error && error.message.includes('COLLECTION_NOT_FOUND')
        ? 'Collection not found.'
        : 'Collection could not be updated.';
    return Response.json({ error: message }, { status: 400 });
  }
}
