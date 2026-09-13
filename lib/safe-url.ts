export function safeWebUrl(value: unknown, allowRelative = true): value is string {
  if (typeof value !== 'string' || !value || value.length > 2048 || /[\u0000-\u0020\\]/.test(value)) return false;
  if (allowRelative && value.startsWith('/') && !value.startsWith('//')) return true;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
}
