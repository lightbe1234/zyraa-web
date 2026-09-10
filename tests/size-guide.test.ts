import assert from 'node:assert/strict';
import test from 'node:test';
import { formatGuideValue, getSizeGuide } from '../lib/size-guide.ts';

const base = { slug: '', category: '', collection: '' };

test('shirts and tees receive only the top size guide', () => {
  const guide = getSizeGuide({ ...base, name: 'Linen Shirt', slug: 'linen-shirt', category: 'Shirts' });
  assert.equal(guide.kind, 'top');
  assert.deepEqual(guide.columns, ['Length', 'Chest', 'Shoulders', 'Sleeves']);
  assert.deepEqual(guide.rows[0], { size: 'S', values: [27.5, 22.5, 22, 8] });
});

test('trousers and bottoms receive only the trouser size guide', () => {
  const guide = getSizeGuide({ ...base, name: 'Cloud Line Trouser', slug: 'cloud-line-trouser', category: 'Bottoms' });
  assert.equal(guide.kind, 'trouser');
  assert.deepEqual(guide.columns, ['Waist', 'Length', 'Hip', 'Thigh']);
  assert.deepEqual(guide.rows[0], { size: 'S', values: ['28–30', 39, 40, 23] });
});

test('inch values and ranges convert cleanly to centimetres', () => {
  assert.equal(formatGuideValue(27.5, 'cm'), '69.9');
  assert.equal(formatGuideValue('28–30', 'cm'), '71.1–76.2');
  assert.equal(formatGuideValue(23, 'in'), '23');
});
