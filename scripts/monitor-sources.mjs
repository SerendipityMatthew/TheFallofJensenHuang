import { readFileSync, writeFileSync } from 'node:fs';
const read = name => JSON.parse(readFileSync(new URL(`../src/data/${name}`, import.meta.url)));
const records = [...read('verified.json'), ...read('verified-additions.json')];
const findings = await Promise.all(records.map(async article => {
  try {
    const response = await fetch(article.source, { method: 'HEAD', signal: AbortSignal.timeout(8000) });
    const lastModified = response.headers.get('last-modified');
    const changedAfterCheck = lastModified && Date.parse(lastModified) > Date.parse(`${article.verifiedOn}T23:59:59Z`);
    return { articleId: article.id, source: article.source, checkedAt: new Date().toISOString(), status: response.status, lastModified, potentialUpdate: Boolean(changedAfterCheck) };
  } catch (error) { return { articleId: article.id, source: article.source, checkedAt: new Date().toISOString(), error: String(error), potentialUpdate: false }; }
}));
writeFileSync('source-monitor-results.json', JSON.stringify({ note: 'HTTP metadata can change without an editorial correction. Review flagged pages manually.', findings }, null, 2));
console.log(`${findings.filter(item => item.potentialUpdate).length} potential updates require review; ${findings.filter(item => item.error || item.status >= 400).length} sources could not be checked`);
