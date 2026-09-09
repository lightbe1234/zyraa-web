import { test } from 'node:test';
import assert from 'node:assert/strict';
import { products } from '../lib/catalog.ts';
import { pageMetadata, productSchema, serializeSchema, siteOrigin } from '../lib/seo.ts';

test('canonical origin cannot accidentally point crawlers at localhost', () => {
  const previous = process.env.NEXT_PUBLIC_SITE_URL;
  process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000';
  try { assert.equal(siteOrigin(), 'https://zyraa-web.vercel.app'); }
  finally { if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL; else process.env.NEXT_PUBLIC_SITE_URL = previous; }
});
test('product schema uses exact minor-unit prices and real stock without invented ratings', () => {
  const schema = productSchema({ ...products[0], price: 219001, stock: 0 });
  assert.equal(schema.offers.price, '2190.01');
  assert.equal(schema.offers.priceCurrency, 'PKR');
  assert.equal(schema.offers.availability, 'https://schema.org/OutOfStock');
  assert.equal('aggregateRating' in schema, false);
});
test('product canonical is not the homepage and private tools remain noindex', () => {
  const metadata = pageMetadata('Example', 'Description', '/products/example');
  assert.ok(String(metadata.alternates?.canonical).endsWith('/products/example'));
  assert.deepEqual(pageMetadata('Cart', 'Cart', '/cart', undefined, false).robots, { index: false, follow: false });
});
test('catalog text cannot terminate an embedded JSON-LD script', () => {
  const input = { name: '</script><script>alert(1)</script>' };
  assert.equal(serializeSchema(input).includes('<'), false);
  assert.deepEqual(JSON.parse(serializeSchema(input)), input);
});
