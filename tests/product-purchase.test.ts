import assert from 'node:assert/strict';
import test from 'node:test';
import { buyNowSelection } from '../lib/product-purchase.ts';

test('buy now sends only the selected product and exact variant quantity', () => {
  const product = { slug: 'linen-shirt', sizes: ['S', 'M'], colors: ['Beige'], stock: 8 };
  assert.deepEqual(
    buyNowSelection({ slug: 'linen-shirt', size: 'M', color: 'Beige', qty: 2 }, product),
    [{ slug: 'linen-shirt', size: 'M', color: 'Beige', qty: 2 }],
  );
});
