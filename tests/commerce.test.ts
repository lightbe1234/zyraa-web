import assert from 'node:assert/strict';
import test from 'node:test';
import { canTransition, priceCart } from '../lib/commerce.ts';

test('prices on the server and unlocks free shipping at threshold', () => {
  const result = priceCart([
    { slug: 'afterdark-hoodie', size: 'M', color: 'Obsidian', qty: 3 },
  ]);
  assert.equal(result.shipping, 0);
  assert.equal(result.total, result.subtotal);
});
test('rejects a missing variant', () =>
  assert.throws(
    () =>
      priceCart([
        {
          slug: 'signal-heavy-tee',
          size: 'XXL',
          color: 'Washed Black',
          qty: 1,
        },
      ]),
    /INVALID_VARIANT/,
  ));
test('rejects unavailable stock', () =>
  assert.throws(
    () =>
      priceCart([
        { slug: 'dusk-track-pant', size: 'M', color: 'Obsidian', qty: 1 },
      ]),
    /INSUFFICIENT_STOCK/,
  ));
test('enforces order status flow', () => {
  assert.equal(canTransition('CONFIRMED', 'PROCESSING'), true);
  assert.equal(canTransition('DELIVERED', 'PENDING'), false);
});
