import { readFileSync, writeFileSync } from 'node:fs';
import { canonicalUrl } from '../src/lib/review.mjs';
const rows = JSON.parse(readFileSync(new URL('../src/data/verified.json', import.meta.url)));
const quote = v => v == null ? 'NULL' : `'${String(v).replaceAll("'", "''")}'`;
const sql = ['-- Curated production records. Source pages manually checked on 2026-11-21.'];
for (const a of rows) {
  sql.push(`INSERT OR IGNORE INTO publications(name) VALUES (${quote(a.publication)});`);
  for (const name of a.authors) sql.push(`INSERT OR IGNORE INTO journalists(name,slug) VALUES (${quote(name)},${quote(name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))});`);
  sql.push(`INSERT OR IGNORE INTO articles(id,canonical_url,headline,publication_id,published_at,updated_at,article_type,sentiment,topic,evidence_level,summary,classification_reason,metadata_status,claim_status,source_checked_at,published_in_tracker) VALUES (${[a.id,canonicalUrl(a.source),a.headline,null,a.date,a.updated,a.type,a.sentiment,a.topic,a.evidence,a.summary,a.classificationReason,'Verified','Unassessed',a.verifiedOn,1].map((v,i)=>i===3?`(SELECT id FROM publications WHERE name=${quote(a.publication)})`:quote(v)).join(',')});`);
  for (const name of a.authors) sql.push(`INSERT OR IGNORE INTO article_authors(article_id,journalist_id) VALUES (${quote(a.id)},(SELECT id FROM journalists WHERE name=${quote(name)}));`);
  sql.push(`INSERT INTO sources(article_id,url,source_type,checked_at) SELECT ${quote(a.id)},${quote(a.source)},'Original publisher',${quote(a.verifiedOn)} WHERE NOT EXISTS (SELECT 1 FROM sources WHERE article_id=${quote(a.id)} AND url=${quote(a.source)});`);
  sql.push(`INSERT INTO verification_records(article_id,status,reviewer,reason,checked_at) SELECT ${quote(a.id)},'Verified','Editorial seed','Original publisher page checked',${quote(a.verifiedOn)} WHERE NOT EXISTS (SELECT 1 FROM verification_records WHERE article_id=${quote(a.id)});`);
}
writeFileSync(new URL('../migrations/0002_seed.sql', import.meta.url), sql.join('\n')+'\n');
