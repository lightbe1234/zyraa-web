export type BagSelection = { slug: string; size: string; color: string; qty: number };

/** Store selections only; prices remain authoritative on the server. */
export function addBagSelection(
  cart: BagSelection[], item: BagSelection,
  product: { slug: string; sizes: string[]; colors: string[]; stock: number },
) {
  if (product.slug !== item.slug || !product.sizes.includes(item.size) || !product.colors.includes(item.color)) {
    throw new Error('Choose an available size and colour.');
  }
  if (!Number.isInteger(item.qty) || item.qty < 1 || item.qty > 10) throw new Error('Choose a quantity from 1 to 10.');
  const selected = cart.find((entry) => entry.slug === item.slug && entry.size === item.size && entry.color === item.color);
  if ((selected?.qty || 0) + item.qty > 10) throw new Error('You can add up to 10 of this size and colour.');
  const inBag = cart.filter((entry) => entry.slug === item.slug).reduce((total, entry) => total + entry.qty, 0);
  if (inBag + item.qty > product.stock) throw new Error('This quantity exceeds the available stock, including items already in your bag.');
  return selected
    ? cart.map((entry) => entry === selected ? { ...entry, qty: entry.qty + item.qty } : entry)
    : [...cart, { slug: item.slug, size: item.size, color: item.color, qty: item.qty }];
}
