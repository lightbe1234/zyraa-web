export type ProductDetails = {
  summary: string;
  material: string;
  fit: string;
  care: string;
  sizeNote: string;
  measurements: { size: string; chest?: number; length?: number; waist?: number; inseam?: number }[];
};
export const emptyProductDetails: ProductDetails = { summary: '', material: '', fit: '', care: '', sizeNote: '', measurements: [] };
export type ProductReview = { id: string; author: string; rating: number; text: string; size: string; createdAt: string };
export type ProductExperience = { details: ProductDetails; reviews: ProductReview[]; reviewsAvailable: boolean };

export function validateProductDetails(input: unknown): ProductDetails {
  if (!input || typeof input !== 'object') throw new Error('Invalid product details.');
  const value = input as Record<string, unknown>;
  const text = (key: string, limit: number) => {
    if (value[key] != null && typeof value[key] !== 'string') throw new Error(`Invalid ${key}.`);
    const result = String(value[key] || '').trim();
    if (result.length > limit) throw new Error(`${key} is too long.`);
    return result;
  };
  if (!Array.isArray(value.measurements) || value.measurements.length > 20) throw new Error('Invalid size measurements.');
  const sizes = new Set<string>();
  const measurements = value.measurements.map((row: Record<string, unknown>) => {
    const size = String(row?.size || '').trim();
    if (!size || size.length > 20 || sizes.has(size)) throw new Error('Each size needs a unique label.');
    sizes.add(size);
    const result: ProductDetails['measurements'][number] = { size };
    for (const key of ['chest', 'length', 'waist', 'inseam'] as const) {
      if (row[key] != null && row[key] !== '') {
        const measurement = Number(row[key]);
        if (!Number.isFinite(measurement) || measurement <= 0 || measurement > 300) throw new Error('Measurements must be between 0 and 300 cm.');
        result[key] = measurement;
      }
    }
    if (Object.keys(result).length < 2) throw new Error('Add at least one measurement per size.');
    return result;
  });
  return { summary: text('summary', 240), material: text('material', 200), fit: text('fit', 200), care: text('care', 600), sizeNote: text('sizeNote', 400), measurements };
}
