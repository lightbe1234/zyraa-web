import test from 'node:test';
import assert from 'node:assert/strict';
import { imageMime } from '../lib/image-validation.ts';

test('uploads reject executable content disguised as an image', () => {
  assert.equal(imageMime(Buffer.from('<script>alert(1)</script>')), null);
  assert.equal(imageMime(Buffer.from('not really an image')), null);
  assert.equal(imageMime(Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0])), 'image/png');
  assert.equal(imageMime(Buffer.from('RIFF0000WEBP')), 'image/webp');
});
