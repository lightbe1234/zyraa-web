'use client';
import Image, { type ImageProps } from 'next/image';

export function StoreImage({ width = 600, height = 800, ...props }: Omit<ImageProps, 'width' | 'height'> & { width?: number; height?: number }) {
  const src = typeof props.src === 'string' ? props.src : '';
  const supported = src.startsWith('/') || /^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/product-images\//.test(src);
  return <Image {...props} width={width} height={height} unoptimized={!supported} />;
}
