import test from 'node:test';
import assert from 'node:assert/strict';
import { nextDay } from '../src/lib/timeline.mjs';

test('timeline playback advances across month boundaries and stops at the end', () => {
  assert.equal(nextDay('2026-10-31', '2026-11-21'), '2026-11-01');
  assert.equal(nextDay('2026-11-21', '2026-11-21'), '2026-11-21');
});
