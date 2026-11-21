import { readFileSync } from 'node:fs';
import { XMLParser } from 'fast-xml-parser';
import { canonicalUrl } from '../src/lib/review.mjs';

export function parseFeed(xml) {
  const feed = new XMLParser({ ignoreAttributes: false, textNodeName: '#text' }).parse(xml);
  const entries = feed.rss?.channel?.item ?? feed.feed?.entry ?? [];
  return (Array.isArray(entries) ? entries : [entries]).map(item => {
    const link = typeof item.link === 'string' ? item.link : Array.isArray(item.link) ? item.link.find(value => value['@_rel'] === 'alternate')?.['@_href'] : item.link?.['@_href'];
    const title = typeof item.title === 'string' ? item.title : item.title?.['#text'];
    const published = item.pubDate || item.published || item.updated;
    if (!link || !title || !published || !Number.isFinite(Date.parse(published))) return null;
    try { return { source: canonicalUrl(link), headline: title, published_at: new Date(published).toISOString(), discovered_at: new Date().toISOString() }; }
    catch { return null; }
  }).filter(Boolean);
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const [endpoint, manifest] = process.argv.slice(2);
  if (!endpoint || !manifest || !process.env.ADMIN_TOKEN) throw new Error('Usage: ADMIN_TOKEN=... node scripts/discover-feeds.mjs <site-url> <feeds.json>');
  const feeds = JSON.parse(readFileSync(manifest, 'utf8'));
  if (!Array.isArray(feeds)) throw new Error('Feed manifest must be an array of publisher feed URLs');
  const api = async (path, method, body) => {
    const response = await fetch(new URL(path, endpoint), { method, headers: { authorization: `Bearer ${process.env.ADMIN_TOKEN}`, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `${response.status} ${path}`);
    return data;
  };
  for (const url of feeds) {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') throw new Error('Feed URL must use HTTPS');
    const job = await api('/api/ingestion-jobs', 'POST', { provider: 'rss', sourceUrl: url });
    let discoveredCount = 0, duplicateCount = 0;
    try {
      const response = await fetch(parsed, { headers: { 'user-agent': 'JensenCoverageWatch/1.0 research feed reader' } });
      if (!response.ok) throw new Error(`Feed fetch failed: ${response.status} ${url}`);
      const leads = parseFeed(await response.text()).filter(item => item.published_at >= '2026-10-01' && /jensen huang|nvidia/i.test(item.headline));
      discoveredCount = leads.length;
      for (const lead of leads) {
        const result = await fetch(new URL('/api/submissions', endpoint), { method: 'POST', headers: { authorization: `Bearer ${process.env.ADMIN_TOKEN}`, 'content-type': 'application/json' }, body: JSON.stringify({ ...lead, sourceKind: 'rss', feed_url: url }) });
        if (result.status === 409) duplicateCount++;
        else if (!result.ok) throw new Error(`Lead submission failed: ${result.status} ${lead.source}`);
      }
      await api(`/api/ingestion-jobs/${job.id}`, 'PATCH', { status: 'Completed', discoveredCount, duplicateCount });
      console.log(`${url}: ${discoveredCount} matched, ${discoveredCount - duplicateCount} queued for verification`);
    } catch (error) {
      await api(`/api/ingestion-jobs/${job.id}`, 'PATCH', { status: 'Failed', discoveredCount, duplicateCount, error: String(error) });
      throw error;
    }
  }
}
