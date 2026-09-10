import type { Product } from './catalog';

export type SizeGuideKind = 'top' | 'trouser';
export type SizeGuideRow = { size: string; values: (number | string)[] };

export type SizeGuide = {
  kind: SizeGuideKind;
  label: string;
  columns: string[];
  rows: SizeGuideRow[];
  measureSteps: string[];
};

const shirtGuide: SizeGuide = {
  kind: 'top',
  label: 'T-shirt size guide',
  columns: ['Length', 'Chest', 'Shoulders', 'Sleeves'],
  rows: [
    { size: 'S', values: [27.5, 22.5, 22, 8] },
    { size: 'M', values: [28, 23, 23, 8.5] },
    { size: 'L', values: [29, 24.5, 24, 9.5] },
    { size: 'XL', values: [30, 26, 25, 10] },
  ],
  measureSteps: [
    'Lay a similar, well-fitting shirt flat.',
    'Measure length from the highest shoulder point to the hem.',
    'Measure chest underarm to underarm, shoulders seam to seam, and sleeve from shoulder seam to cuff.',
  ],
};

const trouserGuide: SizeGuide = {
  kind: 'trouser',
  label: 'Trouser size guide',
  columns: ['Waist', 'Length', 'Hip', 'Thigh'],
  rows: [
    { size: 'S', values: ['28–30', 39, 40, 23] },
    { size: 'M', values: ['30–32', 40, 42, 24] },
    { size: 'L', values: ['32–34', 41, 44, 25] },
    { size: 'XL', values: ['34–36', 42, 46, 26] },
  ],
  measureSteps: [
    'Lay a similar, well-fitting trouser flat.',
    'Measure the waistband without stretching and the outer length from waistband to hem.',
    'Measure the hip at the widest point and the thigh just below the crotch.',
  ],
};

export function getSizeGuide(product: Pick<Product, 'name' | 'slug' | 'category' | 'collection'>): SizeGuide {
  const identity = `${product.name} ${product.slug} ${product.category} ${product.collection}`.toLowerCase();
  return /trouser|bottom|pant|cargo|short/.test(identity) ? trouserGuide : shirtGuide;
}

export function formatGuideValue(value: number | string, unit: 'in' | 'cm') {
  if (unit === 'in') return String(value);
  return String(value)
    .split('–')
    .map((part) => Number.parseFloat(part.trim()))
    .map((part) => Math.round(part * 25.4) / 10)
    .map((part) => Number.isInteger(part) ? String(part) : part.toFixed(1))
    .join('–');
}
