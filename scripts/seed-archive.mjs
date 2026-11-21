import { readFileSync, writeFileSync } from 'node:fs';
import { canonicalUrl } from '../src/lib/review.mjs';
import { parsePublishedAt, validArticleEvent } from '../src/lib/archive.mjs';
const read = name => JSON.parse(readFileSync(new URL(`../src/data/${name}`, import.meta.url)));
const additions = read('verified-additions.json');
const initial = read('verified.json');
const events = read('events.json');
const links = read('article-events.json');
const reports = read('reports.json');
const q = value => value == null ? 'NULL' : `'${String(value).replaceAll("'", "''")}'`;
const out = ['-- Additive, source-checked archive batch. Generated from curated JSON.'];
const all = [...initial, ...additions];
if (new Set(all.map(a => canonicalUrl(a.source))).size !== all.length) throw new Error('Duplicate canonical article URL');
for (const article of additions) {
  parsePublishedAt(article.originalPublishedAt || article.date);
  out.push(`INSERT OR IGNORE INTO publications(name) VALUES (${q(article.publication)});`);
  for (const name of article.authors) out.push(`INSERT OR IGNORE INTO journalists(name,slug) VALUES (${q(name)},${q(name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))});`);
  out.push(`INSERT OR IGNORE INTO articles(id,canonical_url,headline,publication_id,published_at,updated_at,article_type,sentiment,topic,evidence_level,summary,classification_reason,metadata_status,claim_status,source_checked_at,published_in_tracker,original_published_at,original_timezone,language,region,secondary_topics,last_checked_at) VALUES (${[
    q(article.id),q(canonicalUrl(article.source)),q(article.headline),`(SELECT id FROM publications WHERE name=${q(article.publication)})`,q(article.date),q(article.updated),q(article.type),q(article.sentiment),q(article.topic),q(article.evidence),q(article.summary),q(article.classificationReason),q('Verified'),q('Unassessed'),q(article.verifiedOn),'1',q(article.originalPublishedAt),q(article.originalTimezone),q(article.language),q(article.region),q(JSON.stringify(article.secondaryTopics)),q(article.verifiedOn)
  ].join(',')});`);
  for (const name of article.authors) out.push(`INSERT OR IGNORE INTO article_authors(article_id,journalist_id) VALUES (${q(article.id)},(SELECT id FROM journalists WHERE name=${q(name)}));`);
  out.push(`INSERT INTO sources(article_id,url,source_type,checked_at) SELECT ${q(article.id)},${q(article.source)},'Original publisher',${q(article.verifiedOn)} WHERE NOT EXISTS (SELECT 1 FROM sources WHERE article_id=${q(article.id)} AND url=${q(article.source)});`);
  out.push(`INSERT INTO verification_records(article_id,status,reviewer,reason,checked_at) SELECT ${q(article.id)},'Verified','Curated archive','Original publisher metadata checked',${q(article.verifiedOn)} WHERE NOT EXISTS (SELECT 1 FROM verification_records WHERE article_id=${q(article.id)});`);
  out.push(`INSERT INTO verification_logs(entity_type,entity_id,new_status,reviewer,reason,source_url,checked_at) SELECT 'Article',${q(article.id)},'Verified','Curated archive','Headline, byline and date checked',${q(article.source)},${q(article.verifiedOn)} WHERE NOT EXISTS (SELECT 1 FROM verification_logs WHERE entity_type='Article' AND entity_id=${q(article.id)});`);
}
for (const event of events) {
  out.push(`INSERT OR IGNORE INTO events(id,title,summary,occurred_at,became_public_at,verification_status,last_checked_at) VALUES (${[event.id,event.title,event.summary,event.occurredAt,event.publicAt,event.verificationStatus,event.lastChecked].map(q).join(',')});`);
  for (const source of event.sources) out.push(`INSERT OR IGNORE INTO event_sources(event_id,source_url,source_type,checked_at) VALUES (${[event.id,source.url,source.type,event.lastChecked].map(q).join(',')});`);
}
for (const link of links) {
  if (!validArticleEvent({articleId:link.articleId,eventId:link.eventId,evidenceUrl:all.find(a=>a.id===link.articleId)?.source},all,events)) throw new Error(`Invalid article-event relationship: ${link.articleId}`);
  const article = all.find(a => a.id === link.articleId);
  out.push(`INSERT OR IGNORE INTO article_events(article_id,event_id,relationship_type,evidence_url,verification_status,checked_at) VALUES (${[link.articleId,link.eventId,link.type,article.source,'Verified','2026-11-21'].map(q).join(',')});`);
}
for (const report of reports) {
  if (!report.sources.length || !['Draft','In review','Verified'].includes(report.status)) throw new Error(`Invalid report: ${report.id}`);
  out.push(`INSERT OR IGNORE INTO research_reports(id,report_type,subject_id,title,body_json,research_status,last_reviewed_at) VALUES (${[report.id,report.type,report.subjectId,report.title,JSON.stringify(report.sections),report.status,report.lastReviewed].map(q).join(',')});`);
  for (const source of report.sources) out.push(`INSERT OR IGNORE INTO report_sources(report_id,source_url,checked_at) VALUES (${[report.id,source,report.lastReviewed].map(q).join(',')});`);
}
writeFileSync(new URL('../migrations/0004_archive_seed.sql', import.meta.url), out.join('\n') + '\n');
console.log(`Wrote ${additions.length} new articles, ${events.length} events, ${links.length} cited links, ${reports.length} research drafts`);
