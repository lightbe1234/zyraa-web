import { assertSameOrigin, consumeRateLimit, requireAdmin } from '@/lib/security';
import { getCatalog, saveProduct, updateProduct } from '@/lib/supabase-store';
import type { Product } from '@/lib/catalog';

export const runtime = 'nodejs';

function validateProduct(value: Partial<Product>): Product {
  const required = ['slug', 'name', 'category', 'collection', 'image', 'alternate', 'description'] as const;
  if (required.some((key) => !String(value[key] || '').trim())) {
    throw new Error('Complete all required product fields.');
  }
  if (!/^[a-z0-9-]+$/.test(value.slug || '')) throw new Error('Slug can only contain lowercase letters, numbers, and hyphens.');
  if (!Number.isInteger(value.price) || Number(value.price) < 0) throw new Error('Price must be a valid amount.');
  if (!Number.isInteger(value.stock) || Number(value.stock) < 0) throw new Error('Stock must be zero or more.');
  if (!Array.isArray(value.colors) || !value.colors.length || !Array.isArray(value.sizes) || !value.sizes.length) {
    throw new Error('Add at least one color and size.');
  }
  const images = Array.isArray(value.images) ? value.images.map((image) => String(image).trim()).filter(Boolean) : [];
  if (images.length < 1 || images.length > 4) throw new Error('Upload 1 to 4 product images.');
  if (images.some((image) => image.length > 2048)) throw new Error('One of the product image URLs is invalid.');
  return {
    slug: value.slug!,
    name: value.name!,
    category: value.category!,
    collection: value.collection!,
    price: value.price!,
    compareAt: value.compareAt,
    image: images[0],
    alternate: images[1] || images[0],
    images,
    rating: Number(value.rating || 0),
    reviews: Number(value.reviews || 0),
    stock: value.stock!,
    colors: value.colors!,
    sizes: value.sizes!,
    featured: Boolean(value.featured),
    newArrival: Boolean(value.newArrival),
    description: value.description!,
  };
}

export async function GET(request: Request) {
  if (!requireAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  return Response.json(await getCatalog({ includeArchived: true }));
}

export async function POST(request: Request) {
  const actor = requireAdmin(request);
  if (!actor) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    assertSameOrigin(request);
    if (!(await consumeRateLimit(request, 'admin-products', 120, 600))) return Response.json({ error: 'Too many requests.' }, { status: 429 });
    const body = (await request.json()) as Partial<Product> & { originalSlug?: string };
    const product = validateProduct(body);
    await saveProduct(product, actor, body.originalSlug);
    return Response.json(product, { status: body.originalSlug ? 200 : 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Product could not be saved.' }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const actor = requireAdmin(request);
  if (!actor) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    assertSameOrigin(request);
    if (!(await consumeRateLimit(request, 'admin-products', 120, 600))) return Response.json({ error: 'Too many requests.' }, { status: 429 });
    const body = (await request.json()) as { slug?: string; stock?: number; active?: boolean };
    if (!body.slug) throw new Error('Product slug required.');
    if (body.stock !== undefined && (!Number.isInteger(body.stock) || body.stock < 0)) throw new Error('Invalid stock value.');
    await updateProduct(body.slug, { stock: body.stock, active: body.active }, actor);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Product could not be updated.' }, { status: 400 });
  }
}
