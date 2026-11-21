import { useEffect, useMemo, useState } from 'react';
import { loadArticles } from '../lib/public';
import type { Article } from '../lib/data';

type SortKey = 'date' | 'headline' | 'publication' | 'sentiment';
const toneOrder = { Critical: 0, Mixed: 1, Neutral: 2, Supportive: 3 };

export default function Explorer({ articles }: { articles: Article[] }) {
  const [records, setRecords] = useState(articles);
  const [query, setQuery] = useState('');
  const [publication, setPublication] = useState('All publications');
  const [sentiment, setSentiment] = useState('All tones');
  const [topic, setTopic] = useState('All topics');
  const [type, setType] = useState('All types');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [ascending, setAscending] = useState(false);

  useEffect(() => { loadArticles(articles).then(setRecords); }, [articles]);

  const pubs = [...new Set(records.map(a => a.publication))].sort();
  const topics = [...new Set(records.map(a => a.topic))].sort();
  const types = [...new Set(records.map(a => a.type))].sort();
  const filtered = useMemo(() => records.filter(a =>
    (publication === 'All publications' || a.publication === publication) &&
    (sentiment === 'All tones' || a.sentiment === sentiment) &&
    (topic === 'All topics' || a.topic === topic) &&
    (type === 'All types' || a.type === type) &&
    `${a.headline} ${a.authors.join(' ')} ${a.publication} ${a.topic}`.toLowerCase().includes(query.toLowerCase())
  ).sort((a, b) => {
    const comparison = sortKey === 'sentiment'
      ? toneOrder[a.sentiment as keyof typeof toneOrder] - toneOrder[b.sentiment as keyof typeof toneOrder]
      : a[sortKey].localeCompare(b[sortKey]);
    return ascending ? comparison : -comparison;
  }), [records, query, publication, sentiment, topic, type, sortKey, ascending]);

  const sort = (key: SortKey) => {
    if (key === sortKey) setAscending(!ascending);
    else { setSortKey(key); setAscending(key !== 'date'); }
  };
  const heading = (label: string, key: SortKey) =>
    <th scope="col" aria-sort={sortKey === key ? ascending ? 'ascending' : 'descending' : 'none'}>
      <button type="button" onClick={() => sort(key)}>{label}<span aria-hidden="true">{sortKey === key ? ascending ? ' ↑' : ' ↓' : ' ↕'}</span></button>
    </th>;

  return <>
    <div className="filters panel">
      <label className="search-label">SEARCH THE FILE<input type="search" placeholder="Headline, reporter, topic..." value={query} onChange={e => setQuery(e.target.value)} /></label>
      <label>PUBLICATION<select value={publication} onChange={e => setPublication(e.target.value)}>{['All publications', ...pubs].map(v => <option key={v}>{v}</option>)}</select></label>
      <label>TONE<select value={sentiment} onChange={e => setSentiment(e.target.value)}>{['All tones', 'Critical', 'Neutral', 'Supportive', 'Mixed'].map(v => <option key={v}>{v}</option>)}</select></label>
      <label>TOPIC<select value={topic} onChange={e => setTopic(e.target.value)}>{['All topics', ...topics].map(v => <option key={v}>{v}</option>)}</select></label>
      <label>TYPE<select value={type} onChange={e => setType(e.target.value)}>{['All types', ...types].map(v => <option key={v}>{v}</option>)}</select></label>
    </div>
    <div className="result-line"><span>{filtered.length} VERIFIED RECORD{filtered.length !== 1 ? 'S' : ''}</span><span>SELECT A COLUMN TO SORT · SCROLL TABLE FOR MORE</span></div>
    <div className="data-table-wrap panel" role="region" aria-label="Verified article table" tabIndex={0}>
      <table className="data-table article-table">
        <thead><tr>{heading('Date', 'date')}{heading('Headline', 'headline')}{heading('Publication', 'publication')}<th scope="col">Authors</th><th scope="col">Type</th>{heading('Tone', 'sentiment')}<th scope="col">Topic</th><th scope="col">Evidence</th><th scope="col">Funding</th><th scope="col">Source</th></tr></thead>
        <tbody>{filtered.map(a => <tr key={a.id} className={`tone-row ${a.sentiment.toLowerCase()}`}>
          <td className="mono-cell">{a.date}</td>
          <td className="headline-cell"><a href={`/articles/${a.id}/`}>{a.headline}</a><small>METADATA VERIFIED</small></td>
          <td>{a.publication}</td><td>{a.authors.join(', ')}</td><td><span className="table-type">{a.type}</span></td>
          <td><span className={`badge ${a.sentiment.toLowerCase()}`}>{a.sentiment}</span></td>
          <td>{a.topic}</td><td><span className="evidence-dot" />{a.evidence}</td><td className="muted">Not established</td>
          <td><a className="source-link" href={a.source} target="_blank" rel="noopener noreferrer" aria-label={`Open original source for ${a.headline}`}>Original ↗</a></td>
        </tr>)}</tbody>
      </table>
      {!filtered.length && <div className="empty"><strong>No records match</strong><p>Try a broader search or another filter. The public file includes only source checked records.</p></div>}
    </div>
  </>;
}
