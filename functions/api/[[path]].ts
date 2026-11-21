import { canonicalUrl, canPublish } from '../../src/lib/review.mjs';
interface Env { D1: D1Database; ADMIN_TOKEN: string }
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const bad = (message: string, status = 400) => json({ error: message }, status);
const authorized = (request: Request, env: Env) => Boolean(env.ADMIN_TOKEN && request.headers.get('authorization') === `Bearer ${env.ADMIN_TOKEN}`);
const allowed = <T,>(value: T, options: readonly T[]) => options.includes(value);
export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  const path = new URL(request.url).pathname;
  try {
    if (path === '/api/articles' && request.method === 'GET') {
      const { results } = await env.D1.prepare(`SELECT a.*, p.name publication, GROUP_CONCAT(j.name, ' | ') authors FROM articles a JOIN publications p ON p.id=a.publication_id LEFT JOIN article_authors aa ON aa.article_id=a.id LEFT JOIN journalists j ON j.id=aa.journalist_id WHERE a.published_in_tracker=1 GROUP BY a.id ORDER BY a.published_at DESC`).all();
      return json(results);
    }
    if (!authorized(request, env)) return bad('Unauthorized', 401);
    if (path === '/api/submissions' && request.method === 'GET') return json((await env.D1.prepare('SELECT * FROM submissions ORDER BY submitted_at DESC').all()).results);
    if (path === '/api/submissions' && request.method === 'POST') {
      const input = await request.json() as Record<string, unknown>;
      if (typeof input.source !== 'string' || typeof input.headline !== 'string' || !input.headline.trim()) return bad('Source and headline are required');
      const canonical = canonicalUrl(input.source);
      if (await env.D1.prepare('SELECT id FROM articles WHERE canonical_url=?').bind(canonical).first()) return bad('Article already exists', 409);
      if (await env.D1.prepare("SELECT id FROM submissions WHERE json_extract(payload, '$.canonical_url')=? AND status='Pending'").bind(canonical).first()) return bad('Pending submission already exists', 409);
      const sourceKind = typeof input.sourceKind === 'string' && allowed(input.sourceKind, ['manual','rss','news_api','publisher_metadata','funding_disclosure']) ? input.sourceKind : 'manual';
      const result = await env.D1.prepare('INSERT INTO submissions(payload,source_kind) VALUES (?,?)').bind(JSON.stringify({ ...input, canonical_url: canonical }), sourceKind).run();
      await env.D1.prepare('INSERT INTO audit_log(action,entity,entity_id) VALUES (?,?,?)').bind('submit','submission',String(result.meta.last_row_id)).run();
      return json({ id: result.meta.last_row_id, status: 'Pending' }, 201);
    }
    const match = path.match(/^\/api\/submissions\/(\d+)\/review$/);
    if (match && request.method === 'POST') {
      const input = await request.json() as Record<string, unknown>;
      const row = await env.D1.prepare('SELECT * FROM submissions WHERE id=?').bind(match[1]).first<{payload:string;status:string}>();
      if (!row || row.status !== 'Pending') return bad('Pending submission not found', 404);
      if (input.decision === 'reject') {
        await env.D1.batch([
          env.D1.prepare("UPDATE submissions SET status='Rejected',reviewed_at=CURRENT_TIMESTAMP WHERE id=?").bind(match[1]),
          env.D1.prepare('INSERT INTO audit_log(action,entity,entity_id,detail) VALUES (?,?,?,?)').bind('reject','submission',match[1],String(input.reason || ''))
        ]);
        return json({ status: 'Rejected' });
      }
      if (input.decision !== 'approve') return bad('Decision must be approve or reject');
      const a = JSON.parse(row.payload);
      const article = { ...a, ...input, metadata_status: input.metadata_status || 'Unverified', source_checked_at: input.source_checked_at };
      if (!canPublish(article)) return bad('Verified source, headline, publication, date, authors and check date are required');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(article.published_at) || !Number.isFinite(Date.parse(article.published_at))) return bad('Invalid publication date');
      if (!Array.isArray(article.authors) || article.authors.some((v: unknown) => typeof v !== 'string' || !v.trim())) return bad('Invalid authors');
      if (!allowed(article.article_type, ['News','Investigation','Opinion','Satire','Analysis','Podcast']) || !allowed(article.sentiment, ['Critical','Neutral','Supportive','Mixed'])) return bad('Invalid classification');
      if (!article.summary || !article.classification_reason || !article.topic || !article.evidence_level) return bad('Summary, classification reason, topic and evidence level required');
      if (await env.D1.prepare('SELECT id FROM articles WHERE canonical_url=?').bind(a.canonical_url).first()) return bad('Article already exists', 409);
      const id = crypto.randomUUID();
      const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
      const statements = [env.D1.prepare('INSERT OR IGNORE INTO publications(name) VALUES (?)').bind(article.publication)];
      for (const name of article.authors) statements.push(env.D1.prepare('INSERT OR IGNORE INTO journalists(name,slug) VALUES (?,?)').bind(name,slug(name)));
      await env.D1.batch(statements);
      const pub = await env.D1.prepare('SELECT id FROM publications WHERE name=?').bind(article.publication).first<{id:number}>();
      const authors = await Promise.all(article.authors.map((name: string) => env.D1.prepare('SELECT id FROM journalists WHERE name=?').bind(name).first<{id:number}>()));
      await env.D1.batch([
        env.D1.prepare('INSERT INTO articles(id,canonical_url,headline,publication_id,published_at,updated_at,article_type,sentiment,topic,evidence_level,summary,classification_reason,metadata_status,claim_status,source_checked_at,published_in_tracker) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)').bind(id,a.canonical_url,article.headline,pub!.id,article.published_at,article.updated_at || null,article.article_type,article.sentiment,article.topic,article.evidence_level,article.summary,article.classification_reason,'Verified','Unassessed',article.source_checked_at),
        ...authors.map((author: {id:number}|null) => env.D1.prepare('INSERT INTO article_authors(article_id,journalist_id) VALUES (?,?)').bind(id,author!.id)),
        env.D1.prepare('INSERT INTO sources(article_id,url,source_type,checked_at) VALUES (?,?,?,?)').bind(id,a.canonical_url,'Original publisher',article.source_checked_at),
        env.D1.prepare('INSERT INTO verification_records(article_id,status,reviewer,reason) VALUES (?,?,?,?)').bind(id,'Verified','Admin',String(input.reason || 'Original publisher metadata checked')),
        env.D1.prepare("UPDATE submissions SET status='Approved',reviewed_at=CURRENT_TIMESTAMP WHERE id=?").bind(match[1]),
        env.D1.prepare('INSERT INTO audit_log(action,entity,entity_id) VALUES (?,?,?)').bind('approve','article',id)
      ]);
      return json({ id, status: 'Approved' });
    }
    return bad('Not found', 404);
  } catch (error) {
    return bad(error instanceof Error ? error.message : 'Request failed');
  }
};
