import type { Article } from './data';
export async function loadArticles(fallback: Article[]): Promise<Article[]> {
  try {
    const response = await fetch('/api/articles');
    if (!response.ok) return fallback;
    const rows = await response.json();
    if (!Array.isArray(rows)) return fallback;
    return rows.map(row => ({
      id: row.id, date: row.published_at, updated: row.updated_at,
      headline: row.headline, publication: row.publication,
      authors: String(row.authors || '').split(' | ').filter(Boolean),
      type: row.article_type, sentiment: row.sentiment, topic: row.topic,
      evidence: row.evidence_level, summary: row.summary,
      classificationReason: row.classification_reason,
      source: row.canonical_url, verifiedOn: row.source_checked_at,
      originalPublishedAt: row.original_published_at, originalTimezone: row.original_timezone,
      language: row.language, region: row.region,
      secondaryTopics: JSON.parse(row.secondary_topics || '[]')
    }));
  } catch { return fallback; }
}
