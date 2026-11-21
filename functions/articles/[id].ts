import initial from '../../src/data/verified.json';
import additions from '../../src/data/verified-additions.json';
interface Env { D1: D1Database }
const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
const curatedIds = new Set([...initial, ...additions].map(article => article.id));

export const onRequestGet: PagesFunction<Env> = async ({ request, env, next }) => {
  const id = new URL(request.url).pathname.match(/^\/articles\/([^/]+)\/?$/)?.[1];
  if (!id) return new Response('Not found', { status: 404 });
  if (curatedIds.has(id)) return next();
  const article = await env.D1.prepare(`SELECT a.*,p.name publication,GROUP_CONCAT(j.name,' | ') authors
    FROM articles a JOIN publications p ON p.id=a.publication_id
    LEFT JOIN article_authors aa ON aa.article_id=a.id LEFT JOIN journalists j ON j.id=aa.journalist_id
    WHERE a.id=? AND a.published_in_tracker=1 AND a.metadata_status IN ('Verified','Corrected') GROUP BY a.id`).bind(id).first<Record<string, unknown>>();
  if (!article) return new Response('Not found', { status: 404 });
  const corrections = (await env.D1.prepare('SELECT published_at,description,source_url FROM corrections WHERE article_id=? ORDER BY published_at DESC').bind(id).all()).results;
  const link = (url: unknown, label: string) => `<a href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(label)} ↗</a>`;
  const history = corrections.length ? corrections.map(item => `<p>${escape(item.published_at)} · ${escape(item.description)} · ${link(item.source_url, 'Publisher correction')}</p>`).join('') : '<p>No publisher correction has been recorded in this tracker. This does not establish that none exists.</p>';
  const body = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(article.headline)} · Jensen Coverage Watch</title><style>body{margin:0;background:#0b1018;color:#e9edf3;font:16px/1.7 system-ui,sans-serif}main{max-width:1100px;margin:auto;padding:35px 5% 80px}a{color:#f28b83}h1,h2{font-family:Georgia,serif;line-height:1.2}h1{font-size:clamp(36px,5vw,65px)}h2{margin-top:42px}.card{background:#111a24;border:1px solid #2b3845;border-radius:7px;padding:24px;margin:25px 0}dt{color:#9faebb;font-size:12px;text-transform:uppercase}dd{margin:0 0 14px}small{color:#9faebb}</style></head><body><main><nav><a href="/articles/">← All articles</a> · <a href="/timeline/">Timeline</a> · <a href="/methodology/">Methodology</a></nav><p><small>ARTICLE RESEARCH DRAFT · ${escape(article.published_at)} · ${escape(article.publication)}</small></p><h1>${escape(article.headline)}</h1><p>${escape(String(article.authors ?? '').split(' | ').join(' · '))}</p><section class="card"><h2>Executive summary</h2><p>${escape(article.summary)}</p><p>This publisher record is source checked. Its individual factual claims and editorial judgments require separate assessment.</p><h2>Claims and evidence</h2><p>Claim review pending. ${link(article.canonical_url, 'Read original publisher account')}</p><h2>Editorial framing</h2><p>${escape(article.classification_reason)}</p><h2>Corrections and history</h2>${history}</section><aside class="card"><h2>Verification card</h2><dl><dt>Metadata</dt><dd>${escape(article.metadata_status)}</dd><dt>Claim assessment</dt><dd>${escape(article.claim_status)}</dd><dt>Article type</dt><dd>${escape(article.article_type)}</dd><dt>Editorial tone</dt><dd>${escape(article.sentiment)}</dd><dt>Topic</dt><dd>${escape(article.topic)}</dd><dt>Evidence presentation</dt><dd>${escape(article.evidence_level)}</dd><dt>Original timestamp</dt><dd>${escape(article.original_published_at || 'Date only')}</dd><dt>Language / region</dt><dd>${escape(article.language || 'Not established')} / ${escape(article.region || 'Not established')}</dd><dt>Source checked</dt><dd>${escape(article.source_checked_at)}</dd></dl>${link(article.canonical_url, 'Read original source')}</aside></main></body></html>`;
  return new Response(body, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
};
