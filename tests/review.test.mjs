import test from 'node:test';
import assert from 'node:assert/strict';
import { articleKey, canPublish } from '../src/lib/review.mjs';
test('deduplicates tracking variants of the same article', () => {
  assert.equal(articleKey({source:'https://EXAMPLE.com/story/?utm_source=x#top'}), articleKey({source:'https://example.com/story'}));
});
test('publication requires checked metadata, independent of claim status', () => {
  const article = { metadata_status:'Verified', source:'https://example.com/story', headline:'A', publication:'Publisher', published_at:'2026-11-18', authors:['Reporter'], source_checked_at:'2026-11-21', claim_status:'Unassessed' };
  assert.equal(canPublish(article), true);
  assert.equal(canPublish({...article, source_checked_at:null}), false);
  assert.equal(canPublish({...article, metadata_status:'Partially Verified'}), false);
});
