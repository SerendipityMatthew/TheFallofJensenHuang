import curated from '../data/reports.json';
import { articleEvents, articles, events, type Article } from './data';

export interface ReportSection { heading: string; body: string }
export interface ResearchReport {
  id: string; type: string; subjectId: string | null; title: string;
  status: string; lastReviewed: string | null; sources: string[];
  sections: ReportSection[];
}
export const curatedReports: ResearchReport[] = curated;
export function articleReport(article: Article) {
  const linked = articleEvents.filter(link => link.articleId === article.id).map(link => events.find(event => event.id === link.eventId)!).filter(Boolean);
  const event = linked[0];
  const original = article.source;
  const eventSource = event?.sources[0]?.url;
  const executiveSummary = [
    `${article.publication} published “${article.headline}” on ${article.date}, credited to ${article.authors.join(' and ')}. ${article.summary}`,
    event ? `This archive links the piece to “${event.title}.” ${event.summary} The event is supported by a separate ${event.sources[0].type.toLowerCase()}, while the article's own reporting and interpretation remain attributable to its publisher.` : `No independently documented event relationship has yet been attached to this record.`,
    `The article is classified as ${article.type.toLowerCase()} with a ${article.sentiment.toLowerCase()} editorial tone. ${article.classificationReason} The label is a description of framing, not a judgment that the article's claims are true or false.`,
    `The original publisher page was last checked on ${article.verifiedOn}. Its headline, byline, publication date and URL are treated as verified metadata. Individual factual claims, quotations and possible contradictions still require separate research. This report is therefore a research draft. Readers should inspect the linked original, any primary document cited below, and subsequent reporting before drawing conclusions about contested matters.`
  ].join(' ');
  return {
    executiveSummary,
    claims: [{ text: article.summary, kind: 'Publisher account', status: 'Claim review pending', source: original }],
    evidence: [
      { text: 'Original publisher page confirms the article metadata and contains the publisher account.', status: 'Metadata verified; claims not independently verified', source: original },
      ...(eventSource ? [{ text: `Primary source for the linked event: ${event!.title}.`, status: 'Event metadata verified', source: eventSource }] : [])
    ],
    responses: eventSource ? [{ text: `The linked event includes a statement from ${event!.sources[0].type.toLowerCase()}. This is context, not necessarily a response to every claim in the article.`, source: eventSource }] : [],
    context: event?.summary || 'Additional primary-source context has not yet been established for this article.',
    developments: linked.flatMap(e => articles.filter(other => other.id !== article.id && other.date >= article.date && articleEvents.some(link => link.articleId === other.id && link.eventId === e.id)).slice(0, 5)),
    sources: [original, ...linked.flatMap(e => e.sources.map(source => source.url))]
  };
}
export function periodicDraft(period: 'Daily' | 'Weekly' | 'Monthly' | 'Retrospective', start: string, end: string): ResearchReport {
  const included = articles.filter(a => a.date >= start && a.date <= end);
  const byPublication = [...new Set(included.map(a => a.publication))];
  return {
    id: `periodic-${period.toLowerCase()}-${start}-${end}`, type: 'Periodic', subjectId: null,
    title: `${period} coverage draft · ${start} to ${end}`, status: 'Draft', lastReviewed: null,
    sources: included.map(a => a.source),
    sections: [
      { heading: 'Automated count', body: `${included.length} source-checked articles in this period across ${byPublication.length} publications. Counts come only from the current curated file; a zero does not mean that no coverage existed.` },
      { heading: 'Editorial review required', body: 'This is an automatically assembled draft. It does not summarize or verify individual claims, infer coordination from timing, or certify exhaustive collection. An editor must review the sources and analysis before publication as a verified report.' }
    ]
  };
}
const today = new Date().toISOString().slice(0, 10);
const weekStart = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
const monthStart = `${today.slice(0, 7)}-01`;
export const reports: ResearchReport[] = [
  ...curatedReports,
  periodicDraft('Daily', today, today),
  periodicDraft('Weekly', weekStart, today),
  periodicDraft('Monthly', monthStart, today),
  periodicDraft('Retrospective', '2026-10-01', today)
];
