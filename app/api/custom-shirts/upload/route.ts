import { getSupabaseAdmin } from '@/lib/supabase-server';
import { assertSameOrigin, consumeRateLimit } from '@/lib/security';
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    if (!await consumeRateLimit(request, 'custom-artwork', 12, 600)) return Response.json({ error: 'Upload limit reached. Please try again in a few minutes.' }, { status: 429 });
    if (Number(request.headers.get('content-length')) > 9 * 1024 * 1024) throw new Error('File too large');
    const file = (await request.formData()).get('file');
    if (!(file instanceof File) || file.size < 12 || file.size > 8 * 1024 * 1024) throw new Error('Invalid file');
    const bytes = Buffer.from(await file.arrayBuffer());
    const type = bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'png' : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? 'jpg' : bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP' ? 'webp' : null;
    if (!type || file.type !== ({ png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' })[type]) throw new Error('Invalid image');
    const path = `${crypto.randomUUID()}.${type}`;
    const db = getSupabaseAdmin();
    const { error } = await db.storage.from('custom-artwork').upload(path, bytes, { contentType: file.type, upsert: false });
    if (error) throw error;
    const { data } = await db.storage.from('custom-artwork').createSignedUrl(path, 3600);
    await db.from('audit_events').insert({ actor_email: 'storefront', action: 'custom_shirt.artwork_uploaded', entity_type: 'artwork', entity_id: path });
    return Response.json({ path, url: data?.signedUrl }, { status: 201 });
  } catch { return Response.json({ error: 'Upload a PNG, JPG or WebP image under 8 MB.' }, { status: 400 }); }
}
