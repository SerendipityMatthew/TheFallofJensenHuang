import { readFileSync } from 'node:fs';
const [endpoint, file, sourceKind = 'manual'] = process.argv.slice(2);
if (!endpoint || !file || !process.env.ADMIN_TOKEN) {
  console.error('Usage: ADMIN_TOKEN=... node scripts/submit-leads.mjs <site-url> <leads.ndjson> [manual|rss|news_api|publisher_metadata]');
  process.exit(1);
}
if (!['manual','rss','news_api','publisher_metadata'].includes(sourceKind)) throw new Error('Unsupported source kind');
const records = readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map((line, index) => {
  try { return JSON.parse(line); } catch { throw new Error(`Invalid JSON on line ${index + 1}`); }
});
for (const lead of records) {
  const response = await fetch(new URL('/api/submissions', endpoint), {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.ADMIN_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify({ ...lead, sourceKind })
  });
  const result = await response.json();
  if (!response.ok) { console.error(result.error, lead.source); process.exitCode = 1; }
  else console.log(`Queued ${result.id}: ${lead.headline}`);
}
