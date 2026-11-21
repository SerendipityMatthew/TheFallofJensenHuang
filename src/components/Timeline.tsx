import { useEffect, useMemo, useRef, useState } from 'react';
import type { ECharts } from 'echarts';
import type { Article, ArchiveEvent } from '../lib/data';
import { loadArticles } from '../lib/public';
import { nextDay } from '../lib/timeline.mjs';
import { dateInZone } from '../lib/archive.mjs';

const tones = ['Critical', 'Mixed', 'Neutral', 'Supportive'];
const colors = ['#e0645d', '#d7a86a', '#5b8fa9', '#73b695'];

export default function Timeline({ articles, events }: { articles: Article[]; events: ArchiveEvent[] }) {
  const [records, setRecords] = useState(articles);
  const [publication, setPublication] = useState('All publications');
  const [journalist, setJournalist] = useState('All journalists');
  const [topic, setTopic] = useState('All topics');
  const [type, setType] = useState('All types');
  const [tone, setTone] = useState('All tones');
  const [query, setQuery] = useState('');
  const [zoom, setZoom] = useState<'Day' | 'Week' | 'Month'>('Day');
  const [zone, setZone] = useState('Source date');
  const [start, setStart] = useState('2026-10-01');
  const [end, setEnd] = useState('2026-11-21');
  const [playhead, setPlayhead] = useState(end);
  const [playing, setPlaying] = useState(false);
  const [chartReady, setChartReady] = useState(false);
  const chartNode = useRef<HTMLDivElement>(null);
  const chart = useRef<ECharts | null>(null);

  useEffect(() => { loadArticles(articles).then(setRecords); }, [articles]);
  const datedRecords = useMemo(() => records.map(a => ({ ...a, date: zone !== 'Source date' && a.originalPublishedAt ? dateInZone(a.originalPublishedAt, zone) : a.date })), [records, zone]);
  const filtered = useMemo(() => datedRecords.filter(a =>
    a.date >= start && a.date <= end &&
    (publication === 'All publications' || a.publication === publication) &&
    (journalist === 'All journalists' || a.authors.includes(journalist)) &&
    (topic === 'All topics' || a.topic === topic) &&
    (type === 'All types' || a.type === type) &&
    (tone === 'All tones' || a.sentiment === tone) &&
    `${a.headline} ${a.summary} ${a.publication}`.toLowerCase().includes(query.toLowerCase())
  ), [datedRecords, publication, journalist, topic, type, tone, query, start, end]);
  const dates = useMemo(() => {
    const result: string[] = [];
    for (let day = start; day <= end && result.length < 370; day = nextDay(day, end)) {
      result.push(day);
      if (day === end) break;
    }
    return result;
  }, [start, end]);
  const visible = filtered.filter(a => a.date <= playhead);
  const visibleEvents = events.filter(event => event.publicAt >= start && event.publicAt <= playhead);
  const buckets = useMemo(() => [...new Set(dates.map(day => zoom === 'Day' ? day : zoom === 'Month' ? day.slice(0, 7) : (() => { const date = new Date(`${day}T00:00:00Z`); date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7); return date.toISOString().slice(0, 10); })()))], [dates, zoom]);
  const bucket = (day: string) => zoom === 'Day' ? day : zoom === 'Month' ? day.slice(0, 7) : (() => { const date = new Date(`${day}T00:00:00Z`); date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7); return date.toISOString().slice(0, 10); })();

  useEffect(() => {
    if (!chartNode.current) return;
    let disposed = false;
    let instance: ECharts | undefined;
    import('echarts').then(echarts => {
      if (disposed || !chartNode.current) return;
      instance = echarts.init(chartNode.current);
      chart.current = instance;
      setChartReady(true);
    });
    const resize = () => chart.current?.resize();
    window.addEventListener('resize', resize);
    return () => { disposed = true; window.removeEventListener('resize', resize); instance?.dispose(); chart.current = null; };
  }, []);

  useEffect(() => {
    if (!chartReady || !chart.current) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    chart.current.setOption({
      backgroundColor: 'transparent', color: colors,
      animationDurationUpdate: reducedMotion ? 0 : 140,
      animationEasingUpdate: 'cubicOut',
      tooltip: { trigger: 'axis', backgroundColor: '#17232e', borderColor: '#3b4b59', textStyle: { color: '#eef2f5' } },
      legend: { data: tones, textStyle: { color: '#a7b7c5' }, top: 5 },
      grid: { left: 30, right: 20, top: 58, bottom: 40 },
      xAxis: { type: 'category', data: buckets, axisLabel: { color: '#8293a4', formatter: (value: string) => value.slice(5) }, axisLine: { lineStyle: { color: '#33404d' } } },
      yAxis: { type: 'value', minInterval: 1, axisLabel: { color: '#8293a4' }, splitLine: { lineStyle: { color: '#263541' } } },
      series: tones.map((tone, index) => ({
        name: tone, type: 'bar', stack: 'coverage', barMaxWidth: 18,
        data: buckets.map(day => filtered.filter(a => a.date <= playhead && bucket(a.date) === day && a.sentiment === tone).length),
        ...(index === 0 ? { markLine: { silent: true, symbol: 'none', label: { formatter: 'Documented events', color: '#bccad4', fontSize: 10 }, lineStyle: { color: '#8c9baa', type: 'dashed' }, data: [...new Set(visibleEvents.map(event => bucket(event.publicAt)))].map(xAxis => ({ xAxis })) } } : {})
      }))
    }, { notMerge: true });
  }, [chartReady, buckets, filtered, playhead, zoom, events, start]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setPlayhead(day => nextDay(day, end)), 160);
    return () => window.clearInterval(timer);
  }, [playing, end]);
  useEffect(() => { if (playing && playhead >= end) setPlaying(false); }, [playing, playhead, end]);

  const changeRange = (nextStart: string, nextEnd: string) => {
    setStart(nextStart); setEnd(nextEnd); setPlayhead(nextEnd); setPlaying(false);
  };
  const select = (label: string, value: string, set: (value: string) => void, values: string[]) =>
    <label>{label}<select value={value} onChange={event => set(event.target.value)}>{values.map(v => <option key={v}>{v}</option>)}</select></label>;

  return <>
    <div className="timeline-controls panel">
      {select('PUBLICATION', publication, setPublication, ['All publications', ...new Set(records.map(a => a.publication))])}
      {select('JOURNALIST', journalist, setJournalist, ['All journalists', ...new Set(records.flatMap(a => a.authors))])}
      {select('TOPIC', topic, setTopic, ['All topics', ...new Set(records.map(a => a.topic))])}
      {select('TYPE', type, setType, ['All types', ...new Set(records.map(a => a.type))])}
      {select('TONE', tone, setTone, ['All tones', ...tones])}
      {select('ZOOM', zoom, value => setZoom(value as 'Day' | 'Week' | 'Month'), ['Day', 'Week', 'Month'])}
      {select('TIME ZONE', zone, setZone, ['Source date', 'UTC', 'Asia/Tokyo', 'America/New_York', 'Europe/London'])}
      <label>KEYWORDS<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search coverage" /></label>
      <label>FROM<input type="date" min="2026-10-01" max={end} value={start} onChange={event => changeRange(event.target.value || start, end)} /></label>
      <label>TO<input type="date" min={start} max="2026-11-21" value={end} onChange={event => changeRange(start, event.target.value || end)} /></label>
    </div>
    <div className="chart-panel panel">
      <div className="chart-top"><div><span className="kicker">{zoom.toUpperCase()} VOLUME</span><h2>Coverage over time</h2></div><span className="meta">{visible.length} / {filtered.length} SOURCE CHECKED RECORDS</span></div>
      <div className="playback-bar">
        <button type="button" className="btn playback-button" onClick={() => { if (!playing && playhead >= end) setPlayhead(start); setPlaying(!playing); }} aria-label={playing ? 'Pause timeline animation' : 'Play timeline animation'}>{playing ? 'Pause' : 'Play'} <span aria-hidden="true">{playing ? 'Ⅱ' : '▶'}</span></button>
        <input type="range" min="0" max={Math.max(dates.length - 1, 0)} value={Math.max(0, dates.indexOf(playhead))} onChange={event => { setPlaying(false); setPlayhead(dates[Number(event.target.value)] ?? end); }} aria-label="Timeline date" />
        <time className="playback-date" dateTime={playhead}>{playhead}</time>
        <button type="button" className="playback-reset" onClick={() => { setPlaying(false); setPlayhead(end); }}>Reset</button>
      </div>
      <div ref={chartNode} role="img" aria-label={`Stacked daily chart of ${visible.length} visible articles by tone through ${playhead}`} className="coverage-chart" />
      <p className="chart-caption">Dashed markers show documented events. Event and publication dates describe sequence; they do not imply causation. Date-only records retain the source date when a time zone is selected.</p>
    </div>
    <div className="section-head"><h2>Event track</h2><span className="meta">{visibleEvents.length} DOCUMENTED EVENTS</span></div>
    <div className="timeline-list">{visibleEvents.map(event => <a href={`/events/${event.id}/`} key={event.id}><time>{event.occurredAt}</time><span className="timeline-marker" /><span><strong>{event.title}</strong><small>Occurred {event.occurredAt} · Public {event.publicAt} · {event.summary}</small><small>Evidence: {event.sources.map(source => new URL(source.url).hostname).join(', ')}</small></span><span className="badge neutral">Event</span></a>)}</div>
    <div className="section-head"><h2>Publication track</h2><span className="meta">{visible.length} ARTICLES</span></div>
    <div className="timeline-list">{visible.map(a => <a href={articles.some(seed => seed.id === a.id) ? `/articles/${a.id}/` : a.source} key={a.id}><time>{a.date}</time><span className="timeline-marker" /><span><strong>{a.headline}</strong><small>{a.publication} · {a.authors.join(', ')}</small></span><span className={`badge ${a.sentiment.toLowerCase()}`}>{a.sentiment}</span></a>)}{visible.length === 0 && <div className="empty panel"><strong>No coverage in this selection</strong><p>Adjust the dates, filters, or playback position to see verified records.</p></div>}</div>
  </>;
}
