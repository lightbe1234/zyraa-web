import { assertSameOrigin, consumeRateLimit, requireAdmin } from '@/lib/security';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { imageMime } from '@/lib/image-validation';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 4 * 1024 * 1024;
const extensions: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

export async function POST(request: Request) {
  const actor = requireAdmin(request);
  if (!actor) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    assertSameOrigin(request);
    if (!(await consumeRateLimit(request, 'admin-uploads', 40, 600))) {
      return Response.json({ error: 'Too many uploads. Try again shortly.' }, { status: 429 });
    }
    if (Number(request.headers.get('content-length')) > MAX_FILE_SIZE + 65536) return Response.json({ error: 'Image must be smaller than 4 MB.' }, { status: 413 });
    const form = await request.formData();
    const file = form.get('file');
    const scope = form.get('scope') === 'collection' ? 'collections' : 'products';
    if (!(file instanceof File)) return Response.json({ error: 'Choose an image to upload.' }, { status: 400 });
    const extension = extensions[file.type];
    if (!extension) return Response.json({ error: 'Use a JPG, PNG, WebP or AVIF image.' }, { status: 400 });
    if (file.size < 1 || file.size > MAX_FILE_SIZE) return Response.json({ error: 'Image must be smaller than 4 MB.' }, { status: 400 });
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (imageMime(bytes) !== file.type) return Response.json({ error: 'The file is not a valid supported image.' }, { status: 400 });

    const now = new Date();
    const path = `${scope}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${crypto.randomUUID()}.${extension}`;
    const client = getSupabaseAdmin();
    const { error } = await client.storage.from('product-images').upload(path, bytes, {
      contentType: file.type,
      cacheControl: '31536000',
      upsert: false,
    });
    if (error) throw new Error(error.message);
    const { error: auditError } = await client.from('audit_events').insert({ actor_email: actor, action: 'image.uploaded', entity_type: 'artwork', entity_id: path });
    if (auditError) {
      await client.storage.from('product-images').remove([path]);
      throw new Error('Upload audit failed');
    }
    const { data } = client.storage.from('product-images').getPublicUrl(path);
    return Response.json({ url: data.publicUrl });
  } catch (error) {
    const message = error instanceof Error && error.message === 'INVALID_ORIGIN' ? 'Invalid origin.' : 'Image could not be uploaded.';
    return Response.json({ error: message }, { status: message === 'Invalid origin.' ? 403 : 500 });
  }
}
