import test from 'node:test';
import assert from 'node:assert/strict';
import { activityPath, VisitorActivityStore } from '../lib/visitor-activity.ts';
test('activity accepts only public catalog paths, never private routes or query data', () => {
  assert.equal(activityPath('/products/tee'), '/products/tee');
  for (const value of ['/admin', '/checkout?email=private', '/orders/private-token', '/products/a?search=private', '//outside.com']) assert.equal(activityPath(value), null);
});
test('activity is durable, rate limited, and expires after 30 days', () => {
  const store = new VisitorActivityStore(':memory:');
  try {
    for (let i=0;i<60;i++) assert.equal(store.record('a','page_view','/','Mobile',1000), true);
    assert.equal(store.record('a','page_view','/','Mobile',1000), false);
    assert.equal(store.read(1000).summary?.visitors, 1);
    assert.equal(store.read(1000).summary?.views, 60);
    assert.equal(store.read(31*86400000).visitors.length, 0);
  } finally { store.close(); }
});
