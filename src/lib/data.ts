import records from '../data/verified.json';
export type Article = typeof records[number];
export const articles: Article[] = [...records].sort((a, b) => b.date.localeCompare(a.date));
export const journalists = [...new Set(articles.flatMap(a => a.authors).filter(a => a !== 'The Associated Press'))].sort();
export const publications = [...new Set(articles.map(a => a.publication))].sort();
export const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const metrics = {
  articles: articles.length,
  journalists: journalists.length,
  publications: publications.length,
  critical: articles.filter(a => a.sentiment === 'Critical').length
};
