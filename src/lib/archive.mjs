import { canonicalUrl } from './review.mjs';

export const metadataStates = ['Unverified', 'Partially Verified', 'Verified', 'Disputed', 'Corrected'];
const nextStates = {
  Unverified: ['Partially Verified', 'Verified', 'Disputed'],
  'Partially Verified': ['Verified', 'Disputed', 'Unverified'],
  Verified: ['Corrected', 'Disputed'],
  Disputed: ['Verified', 'Corrected'],
  Corrected: ['Verified', 'Disputed']
};
export function canTransition(from, to) {
  return from === to || Boolean(nextStates[from]?.includes(to));
}
export function parsePublishedAt(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)) throw new Error('Publication time needs a date or timestamp with offset');
  const calendarDay = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(calendarDay.getTime()) || calendarDay.toISOString().slice(0, 10) !== value.slice(0, 10)) throw new Error('Invalid publication date');
  const date = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  if (!Number.isFinite(date.getTime())) throw new Error('Invalid publication date');
  return date;
}
export function dateInZone(value, zone) {
  if (value.length === 10) return value; // Unknown publication time cannot be shifted into another day.
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(parsePublishedAt(value));
  const part = type => parts.find(item => item.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function duplicateKind(candidate, articles) {
  const url = canonicalUrl(candidate.source);
  if (articles.some(article => canonicalUrl(article.source) === url)) return 'Same URL';
  if (candidate.syndicationKey && articles.some(article => article.syndicationKey === candidate.syndicationKey)) return 'Syndicated copy';
  return null;
}
export function validArticleEvent(link, articles, events) {
  return Boolean(articles.some(a => a.id === link.articleId) && events.some(e => e.id === link.eventId) && link.evidenceUrl && /^https?:\/\//.test(link.evidenceUrl));
}
export function archiveMetrics(articles, events, corrections) {
  const verified = articles.filter(a => a.metadataStatus === 'Verified' || a.metadataStatus === 'Corrected');
  return {
    verifiedArticles: verified.length,
    uniqueOriginals: new Set(verified.map(a => a.syndicationKey || a.id)).size,
    publications: new Set(verified.map(a => a.publication)).size,
    authors: new Set(verified.flatMap(a => a.authors).filter(a => a !== 'The Associated Press')).size,
    events: events.filter(e => e.verificationStatus === 'Verified').length,
    investigations: verified.filter(a => a.type === 'Investigation').length,
    opinions: verified.filter(a => a.type === 'Opinion').length,
    corrections: corrections.filter(c => verified.some(a => a.id === c.articleId)).length
  };
}
export function filterTimeline(records, { start, end, kind, query = '', page = 1, pageSize = 20 }) {
  const needle = query.toLowerCase();
  const found = records.filter(record => record.date >= start && record.date <= end && (!kind || record.kind === kind) && `${record.title} ${record.publication || ''}`.toLowerCase().includes(needle)).sort((a, b) => a.date.localeCompare(b.date));
  return { total: found.length, items: found.slice((page - 1) * pageSize, page * pageSize) };
}
