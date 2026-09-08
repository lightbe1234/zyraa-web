import test from 'node:test';
import assert from 'node:assert/strict';
import { checkoutAttempt } from '../lib/checkout-attempt.ts';
test('checkout retry keeps a stable key without storing form data', async () => {
  const values = new Map<string,string>();
  const storage = { getItem: (key:string) => values.get(key) || null, setItem: (key:string,value:string) => { values.set(key,value); } };
  const first = await checkoutAttempt(storage,'test-only contact and cart');
  const retry = await checkoutAttempt(storage,'test-only contact and cart');
  assert.equal(first.key,retry.key);
  assert.ok(!values.get('zyra-checkout-attempt')?.includes('contact'));
  const changed = await checkoutAttempt(storage,'different cart');
  assert.notEqual(first.key,changed.key);
});
