import test from 'node:test';
import assert from 'node:assert/strict';
import { archiveMetrics, canTransition, dateInZone, duplicateKind, filterTimeline, parsePublishedAt, validArticleEvent } from '../src/lib/archive.mjs';

test('timestamps require a real date and retain explicit timezone offsets', () => {
  assert.equal(parsePublishedAt('2026-11-17T17:19:00-05:00').toISOString(), '2026-11-17T22:19:00.000Z');
  assert.throws(() => parsePublishedAt('2026-02-30'));
  assert.throws(() => parsePublishedAt('2026-02-30T10:00:00Z'));
  assert.equal(dateInZone('2026-11-17T23:30:00-05:00', 'Asia/Tokyo'), '2026-11-18');
  assert.equal(dateInZone('2026-11-17', 'Asia/Tokyo'), '2026-11-17');
});
test('exact and syndicated copies are distinct from follow-up stories', () => {
  const articles = [{ source: 'https://example.org/one', syndicationKey: 'wire-1' }];
  assert.equal(duplicateKind({ source: 'https://example.org/one?utm_source=x' }, articles), 'Same URL');
  assert.equal(duplicateKind({ source: 'https://other.example/copy', syndicationKey: 'wire-1' }, articles), 'Syndicated copy');
  assert.equal(duplicateKind({ source: 'https://example.org/follow-up' }, articles), null);
});
test('article-event links require both records and cited evidence', () => {
  const articles = [{ id: 'a' }], events = [{ id: 'e' }];
  assert.equal(validArticleEvent({ articleId: 'a', eventId: 'e', evidenceUrl: 'https://example.org/a' }, articles, events), true);
  assert.equal(validArticleEvent({ articleId: 'a', eventId: 'missing', evidenceUrl: 'https://example.org/a' }, articles, events), false);
  assert.equal(validArticleEvent({ articleId: 'a', eventId: 'e' }, articles, events), false);
});
test('verification transitions and verified dashboard counts exclude leads', () => {
  assert.equal(canTransition('Unverified', 'Verified'), true);
  assert.equal(canTransition('Verified', 'Unverified'), false);
  const articles = [{ id: 'a', metadataStatus: 'Verified', syndicationKey: 'wire-1', publication: 'A', authors: ['Reporter'], type: 'Opinion' }, { id: 'copy', metadataStatus: 'Verified', syndicationKey: 'wire-1', publication: 'B', authors: ['Reporter'], type: 'News' }, { id: 'lead', metadataStatus: 'Unverified', publication: 'C', authors: ['Other'], type: 'Investigation' }];
  assert.deepEqual(archiveMetrics(articles, [{ verificationStatus: 'Verified' }, { verificationStatus: 'Unverified' }], [{ articleId: 'a' }]), { verifiedArticles: 2, uniqueOriginals: 1, publications: 2, authors: 1, events: 1, investigations: 0, opinions: 1, corrections: 1 });
});
test('timeline filtering paginates in chronological order', () => {
  const records = [{ date: '2026-11-18', kind: 'Article', title: 'Second' }, { date: '2026-11-12', kind: 'Event', title: 'First' }, { date: '2026-11-20', kind: 'Article', title: 'Third' }];
  assert.deepEqual(filterTimeline(records, { start: '2026-11-01', end: '2026-11-30', page: 2, pageSize: 1 }), { total: 3, items: [records[0]] });
});
