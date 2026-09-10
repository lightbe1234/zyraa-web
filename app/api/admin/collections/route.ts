import { assertSameOrigin, consumeRateLimit, requireAdmin } from '@/lib/security';
import { archiveCollection, createCollection, getCollections, updateCollection } from '@/lib/supabase-store';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  if (!requireAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  return Response.json(await getCollections());
}

function collectionInput(value: unknown) {
  const body = value as { slug?: string; name?: string; image?: string };
  const slug = body.slug?.trim() || '';
  const name = body.name?.trim() || '';
  const image = body.image?.trim() || '';
  if (!/^[a-z0-9-]+$/.test(slug) || name.length < 1 || name.length > 80 || image.length < 1 || image.length > 2048) {
    throw new Error('INVALID_COLLECTION');
  }
  return { slug, name, image };
}

export async function POST(request: Request) {
  const actor = requireAdmin(request);
  if (!actor) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    assertSameOrigin(request);
    if (!(await consumeRateLimit(request, 'admin-collections', 40, 600))) return Response.json({ error: 'Too many collection updates.' }, { status: 429 });
    const { slug, name, image } = collectionInput(await request.json());
    await createCollection(slug, name, image, actor);
    return Response.json(await getCollections(), { status: 201 });
  } catch (error) {
    const message = error instanceof Error && error.message.includes('duplicate')
      ? 'That collection slug or name is already in use.'
      : 'Collection could not be created.';
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const actor = requireAdmin(request);
  if (!actor) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    assertSameOrigin(request);
    if (!(await consumeRateLimit(request, 'admin-collections', 40, 600))) {
      return Response.json({ error: 'Too many collection updates.' }, { status: 429 });
    }
    const { slug, name, image } = collectionInput(await request.json());
    await updateCollection(slug, name, image, actor);
    return Response.json(await getCollections());
  } catch (error) {
    const message = error instanceof Error && error.message.includes('store_collections_name_unique')
      ? 'That collection name is already in use.'
      : error instanceof Error && error.message.includes('COLLECTION_NOT_FOUND')
        ? 'Collection not found.'
        : 'Collection could not be updated.';
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const actor = requireAdmin(request);
  if (!actor) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    assertSameOrigin(request);
    if (!(await consumeRateLimit(request, 'admin-collections', 20, 600))) return Response.json({ error: 'Too many collection updates.' }, { status: 429 });
    const slug = String((await request.json() as { slug?: string }).slug || '').trim();
    if (!/^[a-z0-9-]+$/.test(slug)) return Response.json({ error: 'Select a valid collection.' }, { status: 400 });
    await archiveCollection(slug, actor);
    return Response.json(await getCollections());
  } catch (error) {
    const message = error instanceof Error && error.message.includes('COLLECTION_NOT_FOUND')
      ? 'Collection not found.'
      : 'Collection could not be deleted.';
    return Response.json({ error: message }, { status: 400 });
  }
}
