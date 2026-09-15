import { assertSameOrigin, consumeRateLimit, requireAdmin } from '@/lib/security';
import { createCommunityReview, deleteCommunityReview, getCommunityReviews } from '@/lib/supabase-store';
import type { Review } from '@/lib/reviews';

export const runtime = 'nodejs';

function validateReview(value: Partial<Review>): Review {
  const author = String(value.author || '').trim();
  const quote = String(value.quote || '').trim();
  const productSlug = String(value.productSlug || '').trim();
  const productName = String(value.productName || '').trim();
  const purchasedSize = String(value.purchasedSize || '').trim();
  const stats = String(value.stats || '').trim();
  const fitRating = String(value.fitRating || '').trim();
  const category = String(value.category || '').trim();
  const rating = Number(value.rating);
  if (!author || author.length > 80 || quote.length < 10 || quote.length > 1000) throw new Error('Enter a valid author and review.');
  if (!/^[a-z0-9-]+$/.test(productSlug) || !productName || productName.length > 200) throw new Error('Select a valid product.');
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error('Choose a valid rating.');
  if (!['tees', 'hoodies', 'cargo', 'fit-pics'].includes(category)) throw new Error('Choose a valid category.');
  const initials = author.split(/\s+/).map((part) => part[0]).join('').toUpperCase().slice(0, 2) || 'ZY';
  return {
    id: '', author, initials, verified: value.verified !== false,
    purchasedSize: purchasedSize.slice(0, 40), productSlug, productName, rating, quote,
    stats: stats.slice(0, 80), fitRating: fitRating.slice(0, 80), dateAgo: 'Just now', helpfulCount: 0, category,
  };
}

export async function GET() {
  try {
    return Response.json(await getCommunityReviews(), { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json([], { headers: { 'Cache-Control': 'no-store' } });
  }
}

export async function POST(request: Request) {
  const actor = requireAdmin(request);
  if (!actor) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    assertSameOrigin(request);
    if (!(await consumeRateLimit(request, 'admin-community-reviews', 60, 600))) return Response.json({ error: 'Too many requests.' }, { status: 429 });
    return Response.json(await createCommunityReview(validateReview(await request.json()), actor), { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Review could not be saved.' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const actor = requireAdmin(request);
  if (!actor) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    assertSameOrigin(request);
    if (!(await consumeRateLimit(request, 'admin-community-reviews', 60, 600))) return Response.json({ error: 'Too many requests.' }, { status: 429 });
    const id = String((await request.json() as { id?: string }).id || '');
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error('Invalid review.');
    await deleteCommunityReview(id, actor);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Review could not be deleted.' }, { status: 400 });
  }
}
