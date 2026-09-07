import assert from 'node:assert/strict';
import test from 'node:test';
import { addBagSelection } from '../lib/product-purchase.ts';
import { LocalProductExperience } from '../lib/local-product-experience.ts';
import { validateProductDetails } from '../lib/product-experience-types.ts';

const product = { slug: 'test-tee', colors: ['Black'], sizes: ['S', 'M'], stock: 3 };
test('bag respects combined stock across variants and never records client prices', () => {
  const cart = addBagSelection([], { slug: 'test-tee', size: 'S', color: 'Black', qty: 2 }, product);
  assert.throws(() => addBagSelection(cart, { slug: 'test-tee', size: 'M', color: 'Black', qty: 2 }, product), /available stock/);
  assert.throws(() => addBagSelection(cart, { slug: 'test-tee', size: 'XL', color: 'Black', qty: 1 }, product), /available size/);
  assert.deepEqual(Object.keys(cart[0]).sort(), ['color', 'qty', 'size', 'slug']);
});
test('presence counts real sessions once per product and expires inactive visitors', () => {
  const store = new LocalProductExperience(':memory:');
  try {
    assert.equal(store.heartbeat('test-tee', 'visitor-a', 100_000), 1);
    assert.equal(store.heartbeat('test-tee', 'visitor-a', 110_000), 1);
    assert.equal(store.heartbeat('test-tee', 'visitor-b', 120_000), 2);
    assert.equal(store.heartbeat('different-product', 'visitor-b', 125_000), 1);
    assert.equal(store.heartbeat('test-tee', 'visitor-b', 180_001), 1);
  } finally { store.close(); }
});
test('review storage rejects duplicate order proofs and public records exclude the proof', () => {
  const store = new LocalProductExperience(':memory:');
  const review = { author: 'Test A.', rating: 4, text: 'Test review for the isolated in-memory store.', size: 'M' };
  try {
    assert.equal(store.read('test-tee').reviews.length, 0);
    store.addReview('test-tee', 'test-order-proof', review);
    assert.throws(() => store.addReview('test-tee', 'test-order-proof', review), /UNIQUE/);
    const result = store.read('test-tee').reviews;
    assert.equal(result.length, 1);
    assert.equal('proof' in result[0], false);
    assert.equal(result[0].rating, 4);
  } finally { store.close(); }
});
test('size measurements are product-specific and validated, with no fabricated defaults', () => {
  assert.throws(() => validateProductDetails({ measurements: [{ size: 'M', waist: -3 }] }), /Measurements/);
  assert.throws(() => validateProductDetails({ measurements: [{ size: 'M', waist: 35 }, { size: 'M', waist: 40 }] }), /unique/);
  const value = validateProductDetails({ material: 'Confirmed sample fabric', measurements: [{ size: 'M', waist: 40, inseam: 75 }] });
  assert.equal(value.measurements[0].chest, undefined);
  assert.equal(value.measurements[0].waist, 40);
});
test('local throttling resets after expiry', () => {
  const store = new LocalProductExperience(':memory:');
  try {
    assert.equal(store.limit('test', 1, 1000, 100), true);
    assert.equal(store.limit('test', 1, 1000, 101), false);
    assert.equal(store.limit('test', 1, 1000, 1101), true);
  } finally { store.close(); }
});
