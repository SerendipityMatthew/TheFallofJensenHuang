import initial from '../data/verified.json';
import additions from '../data/verified-additions.json';
import eventRecords from '../data/events.json';
import links from '../data/article-events.json';
import { archiveMetrics } from './archive.mjs';

export interface Article {
  id: string; date: string; updated: string | null; headline: string;
  publication: string; authors: string[]; type: string; sentiment: string;
  topic: string; evidence: string; summary: string; classificationReason: string;
  source: string; verifiedOn: string; language?: string; region?: string;
  originalPublishedAt?: string | null; originalTimezone?: string | null;
  secondaryTopics?: string[]; metadataStatus?: string; syndicationKey?: string | null;
}
export interface ArchiveEvent {
  id: string; title: string; summary: string; occurredAt: string; publicAt: string;
  verificationStatus: string; lastChecked: string;
  sources: { url: string; type: string }[];
}
export interface ArticleEvent {
  articleId: string; eventId: string; type: string;
}
export const articles: Article[] = [...initial, ...additions].sort((a, b) => b.date.localeCompare(a.date));
export const events: ArchiveEvent[] = eventRecords;
export const articleEvents: ArticleEvent[] = links;
export const journalists = [...new Set(articles.flatMap(a => a.authors).filter(a => a !== 'The Associated Press'))].sort();
export const publications = [...new Set(articles.map(a => a.publication))].sort();
export const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const totals = archiveMetrics(articles.map(a => ({...a, metadataStatus: a.metadataStatus || 'Verified'})), events, []);
export const metrics = {
  articles: totals.verifiedArticles,
  originals: totals.uniqueOriginals,
  journalists: totals.authors,
  publications: totals.publications,
  critical: articles.filter(a => a.sentiment === 'Critical').length,
  events: totals.events,
  investigations: totals.investigations,
  opinions: totals.opinions,
  corrections: totals.corrections
};
