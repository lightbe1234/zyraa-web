/** Keep image requests comfortably below the hosting platform's body limit. */
export async function prepareImage(file: File): Promise<File> {
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type)) {
    throw new Error('Choose a JPG, PNG, WebP or AVIF image.');
  }
  if (file.size > 25 * 1024 * 1024) throw new Error('Choose an image smaller than 25 MB.');
  const bitmap = await createImageBitmap(file).catch(() => { throw new Error('This image could not be opened. Export it as JPG or PNG and try again.'); });
  try {
    const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Image preparation is unavailable in this browser.');
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.9, 0.8, 0.65]) {
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', quality));
      if (blob && blob.size < 3 * 1024 * 1024) return new File([blob], 'image.webp', { type: blob.type });
    }
    throw new Error('This image is too large. Use a smaller image and try again.');
  } finally { bitmap.close(); }
}

export async function uploadResponse(response: Response) {
  if (response.status === 413) throw new Error('Image is too large. Choose a smaller image.');
  if (response.status === 401) throw new Error('Your session expired. Sign in again, then retry.');
  const result = await response.json().catch(() => { throw new Error('Upload service is temporarily unavailable. Please retry.'); });
  if (!response.ok) throw new Error(result.error || 'Image could not be uploaded. Please retry.');
  return result;
}
