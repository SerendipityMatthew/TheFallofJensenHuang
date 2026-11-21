import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFeed } from '../scripts/discover-feeds.mjs';

test('RSS discovery extracts publisher leads without treating absent dates as verified', () => {
  const leads = parseFeed('<rss><channel><item><title>Jensen Huang statement</title><link>https://example.com/story?utm_source=rss</link><pubDate>Sat, 21 Nov 2026 10:00:00 GMT</pubDate></item><item><title>Undated</title><link>https://example.com/missing</link></item></channel></rss>');
  assert.equal(leads.length, 1);
  assert.equal(leads[0].source, 'https://example.com/story');
  assert.equal(leads[0].published_at, '2026-11-21T10:00:00.000Z');
});
