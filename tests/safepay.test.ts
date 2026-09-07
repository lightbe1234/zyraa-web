import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { verifySafepay, validPaidEvent } from '../lib/safepay-verification.ts';
test('Safepay verification rejects tampered bodies and malformed signatures', () => {
  const body = JSON.stringify({ type: 'payment.succeeded' });
  const secret = 'isolated-test-secret';
  const signature = createHmac('sha512', secret).update(body).digest('hex');
  assert.equal(verifySafepay(body, signature, secret), true);
  assert.equal(verifySafepay(body + ' ', signature, secret), false);
  assert.equal(verifySafepay(body, 'invalid', secret), false);
});
test('Only captured PKR events for this merchant are accepted', () => {
  const event = { type:'payment.succeeded',version:'2.0.0',merchant_api_key:'merchant-test',token:'evt_test',data:{tracker:'track_test',state:'TRACKER_ENDED',amount:10000,currency:'PKR'} };
  assert.equal(validPaidEvent(event,'merchant-test'),true);
  assert.equal(validPaidEvent(event,'another-merchant'),false);
  assert.equal(validPaidEvent({...event,type:'authorization.succeeded'},'merchant-test'),false);
  assert.equal(validPaidEvent({...event,data:{...event.data,amount:10.5}},'merchant-test'),false);
  assert.equal(validPaidEvent({...event,data:{...event.data,currency:'USD'}},'merchant-test'),false);
});
