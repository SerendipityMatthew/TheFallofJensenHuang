import { useMemo, useState } from 'react';
import type { Article } from '../lib/data';

export default function ArticleTable({ articles }: { articles: Article[] }) {
  const [publication, setPublication] = useState('');
  const [author, setAuthor] = useState('');
  const [sentiment, setSentiment] = useState('');
  const [type, setType] = useState('');
  const [q, setQ] = useState('');

  const publications = useMemo(() => [...new Set(articles.map(a => a.publication))].sort(), [articles]);
  const authors = useMemo(() => [...new Set(articles.flatMap(a => a.authors as string[]))].sort(), [articles]);
  const sentiments = ['Critical', 'Neutral', 'Supportive', 'Mixed'];
  const types = ['News', 'Investigation', 'Opinion', 'Satire', 'Analysis', 'Podcast'];

  const needle = q.trim().toLowerCase();
  const filtered = articles.filter(a =>
    (!publication || a.publication === publication) &&
    (!author || (a.authors as string[]).includes(author)) &&
    (!sentiment || a.sentiment === sentiment) &&
    (!type || a.type === type) &&
    (!needle || a.headline.toLowerCase().includes(needle) || a.summary.toLowerCase().includes(needle))
  );

  return (
    <>
      <div className="filters">
        <input placeholder="Search headlines / summaries…" value={q} onChange={e => setQ(e.target.value)} />
        <select value={publication} onChange={e => setPublication(e.target.value)}>
          <option value="">All publications</option>
          {publications.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={author} onChange={e => setAuthor(e.target.value)}>
          <option value="">All authors</option>
          {authors.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={sentiment} onChange={e => setSentiment(e.target.value)}>
          <option value="">Any sentiment</option>
          {sentiments.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={type} onChange={e => setType(e.target.value)}>
          <option value="">Any type</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <span style={{ color: 'var(--muted)', fontSize: '0.85rem', marginLeft: 'auto' }}>
          {filtered.length} / {articles.length}
        </span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Date</th><th>Headline</th><th>Publication</th><th>Authors</th><th>Type</th><th>Sentiment</th><th>Evidence</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(a => (
            <tr key={a.id}>
              <td style={{ whiteSpace: 'nowrap', color: 'var(--muted)' }}>{a.date}</td>
              <td><a href={a.source} target="_blank" rel="noopener noreferrer">{a.headline}</a></td>
              <td>{a.publication}</td>
              <td>{(a.authors as string[]).join(', ')}</td>
              <td>{a.type}</td>
              <td><span className={`pill ${a.sentiment.toLowerCase()}`}>{a.sentiment}</span></td>
              <td style={{ color: 'var(--muted)' }}>{a.evidence}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {filtered.length === 0 && (
        <p style={{ color: 'var(--muted)', padding: '1rem 0' }}>No articles match these filters.</p>
      )}
    </>
  );
}
