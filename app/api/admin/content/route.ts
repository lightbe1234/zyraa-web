import { assertSameOrigin, consumeRateLimit, requireAdmin } from '@/lib/security';
import { getContentSections, updateContentSections, type ContentSection } from '@/lib/supabase-store';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  if (!requireAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  return Response.json(await getContentSections());
}

export async function PUT(request: Request) {
  const actor = requireAdmin(request);
  if (!actor) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    assertSameOrigin(request);
    if (!(await consumeRateLimit(request, 'admin-content', 30, 600))) return Response.json({ error: 'Too many requests.' }, { status: 429 });
    const body = (await request.json()) as { sections?: ContentSection[] };
    if (!Array.isArray(body.sections) || body.sections.some((item) => !item.key || !Number.isInteger(item.sortOrder))) {
      return Response.json({ error: 'Invalid content configuration.' }, { status: 400 });
    }
    await updateContentSections(body.sections, actor);
    return Response.json(await getContentSections());
  } catch {
    return Response.json({ error: 'Content configuration could not be saved.' }, { status: 400 });
  }
}
