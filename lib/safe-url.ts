export function safeWebUrl(value: unknown, allowRelative = true): value is string {
  if (typeof value !== 'string' || !value || value.length > 2048 || [...value].some((character) => character === '\\' || character.charCodeAt(0) <= 0x20)) return false;
  if (allowRelative && value.startsWith('/') && !value.startsWith('//')) return true;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
}
