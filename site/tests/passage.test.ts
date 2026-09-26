import { test } from 'node:test';
import assert from 'node:assert/strict';
import { passageLink } from '../src/lib/passage';

test('passage links preserve a fallback anchor and escape text-fragment delimiters', () => {
  const link = passageLink('https://www.matthewgarner.me/drifting?source=reader#old', 'A well-chosen thought, with a % sign.', 'making space');
  assert.equal(link, 'https://www.matthewgarner.me/drifting?source=reader#making%20space:~:text=A%20well%2Dchosen%20thought%2C%20with%20a%20%25%20sign.');
  const long = passageLink('https://www.matthewgarner.me/drifting', Array.from({ length: 80 }, (_, i) => `word${i}`).join('\n'));
  assert.ok(long.endsWith('word79'));
  assert.ok(!long.includes('word40'));
  assert.match(long, /#main:~:text=word0.*word11,word68/);
});
