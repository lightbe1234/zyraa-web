import { productBySlug, type Product } from './catalog.ts';
export type PricedItem = {
  slug: string;
  size: string;
  color: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
};
export function priceCart(
  items: Array<{ slug: string; size: string; color: string; qty: number }>,
) {
  return priceCartWithCatalog(items, undefined);
}

export function priceCartWithCatalog(
  items: Array<{ slug: string; size: string; color: string; qty: number }>,
  catalog?: Product[],
) {
  if (!Array.isArray(items) || items.length === 0)
    throw new Error('EMPTY_CART');
  const priced: PricedItem[] = items.map((item) => {
    const product = catalog
      ? catalog.find((entry) => entry.slug === item.slug)
      : productBySlug(item.slug);
    if (!product) throw new Error('PRODUCT_NOT_FOUND');
    if (
      !product.sizes.includes(item.size) ||
      !product.colors.includes(item.color)
    )
      throw new Error('INVALID_VARIANT');
    if (!Number.isInteger(item.qty) || item.qty < 1 || item.qty > 10)
      throw new Error('INVALID_QUANTITY');
    if (product.stock < item.qty) throw new Error('INSUFFICIENT_STOCK');
    return {
      ...item,
      unitPrice: product.price,
      lineTotal: product.price * item.qty,
    };
  });
  const subtotal = priced.reduce((sum, item) => sum + item.lineTotal, 0);
  const shipping = subtotal >= 499900 ? 0 : 25000;
  return { items: priced, subtotal, shipping, total: subtotal + shipping };
}
export function canTransition(from: string, to: string) {
  const flow: Record<string, string[]> = {
    PENDING: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['PROCESSING', 'CANCELLED'],
    PROCESSING: ['PACKED', 'CANCELLED'],
    PACKED: ['SHIPPED', 'CANCELLED'],
    SHIPPED: ['DELIVERED', 'RETURN_REQUESTED'],
    DELIVERED: ['RETURN_REQUESTED'],
    RETURN_REQUESTED: ['RETURNED'],
    CANCELLED: [],
    RETURNED: [],
  };
  return flow[from]?.includes(to) ?? false;
}
