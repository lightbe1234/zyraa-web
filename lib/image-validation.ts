export function imageMime(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null;
  const starts = (pattern: number[]) => pattern.every((b, i) => bytes[i] === b);
  const text = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  if (starts([137, 80, 78, 71, 13, 10, 26, 10])) return 'image/png';
  if (starts([255, 216, 255])) return 'image/jpeg';
  if (text(0, 4) === 'RIFF' && text(8, 12) === 'WEBP') return 'image/webp';
  if (text(4, 8) === 'ftyp' && ['avif', 'avis'].includes(text(8, 12))) return 'image/avif';
  return null;
}
