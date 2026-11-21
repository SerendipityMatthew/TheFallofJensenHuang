import { useEffect, useMemo, useRef, useState } from 'react';
import type { ECharts } from 'echarts';
import type { Article } from '../lib/data';
import { loadArticles } from '../lib/public';
import { nextDay } from '../lib/timeline.mjs';

const tones = ['Critical', 'Mixed', 'Neutral', 'Supportive'];
const colors = ['#e0645d', '#d7a86a', '#5b8fa9', '#73b695'];

export default function Timeline({ articles }: { articles: Article[] }) {
  const [records, setRecords] = useState(articles);
  const [publication, setPublication] = useState('All publications');
  const [journalist, setJournalist] = useState('All journalists');
  const [topic, setTopic] = useState('All topics');
  const [type, setType] = useState('All types');
  const [start, setStart] = useState('2026-10-01');
  const [end, setEnd] = useState('2026-11-21');
  const [playhead, setPlayhead] = useState(end);
  const [playing, setPlaying] = useState(false);
  const [chartReady, setChartReady] = useState(false);
  const chartNode = useRef<HTMLDivElement>(null);
  const chart = useRef<ECharts | null>(null);

  useEffect(() => { loadArticles(articles).then(setRecords); }, [articles]);
  const filtered = useMemo(() => records.filter(a =>
    a.date >= start && a.date <= end &&
    (publication === 'All publications' || a.publication === publication) &&
    (journalist === 'All journalists' || a.authors.includes(journalist)) &&
    (topic === 'All topics' || a.topic === topic) &&
    (type === 'All types' || a.type === type)
  ), [records, publication, journalist, topic, type, start, end]);
  const dates = useMemo(() => {
    const result: string[] = [];
    for (let day = start; day <= end && result.length < 370; day = nextDay(day, end)) {
      result.push(day);
      if (day === end) break;
    }
    return result;
  }, [start, end]);
  const visible = filtered.filter(a => a.date <= playhead);

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
      xAxis: { type: 'category', data: dates, axisLabel: { color: '#8293a4', formatter: (value: string) => value.slice(5) }, axisLine: { lineStyle: { color: '#33404d' } } },
      yAxis: { type: 'value', minInterval: 1, axisLabel: { color: '#8293a4' }, splitLine: { lineStyle: { color: '#263541' } } },
      series: tones.map((tone, index) => ({
        name: tone, type: 'bar', stack: 'coverage', barMaxWidth: 18,
        data: dates.map(day => day <= playhead ? filtered.filter(a => a.date === day && a.sentiment === tone).length : null),
        ...(index === 0 ? { markLine: { silent: true, symbol: 'none', label: { formatter: 'CEO transition · 12 Nov', color: '#bccad4', fontSize: 10 }, lineStyle: { color: '#8c9baa', type: 'dashed' }, data: [{ xAxis: '2026-11-12' }] } } : {})
      }))
    }, { notMerge: true });
  }, [chartReady, dates, filtered, playhead]);

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
      <label>FROM<input type="date" min="2026-10-01" max={end} value={start} onChange={event => changeRange(event.target.value || start, end)} /></label>
      <label>TO<input type="date" min={start} max="2026-11-21" value={end} onChange={event => changeRange(start, event.target.value || end)} /></label>
    </div>
    <div className="chart-panel panel">
      <div className="chart-top"><div><span className="kicker">DAILY VOLUME</span><h2>Coverage over time</h2></div><span className="meta">{visible.length} / {filtered.length} SOURCE CHECKED RECORDS</span></div>
      <div className="playback-bar">
        <button type="button" className="btn playback-button" onClick={() => { if (!playing && playhead >= end) setPlayhead(start); setPlaying(!playing); }} aria-label={playing ? 'Pause timeline animation' : 'Play timeline animation'}>{playing ? 'Pause' : 'Play'} <span aria-hidden="true">{playing ? 'Ⅱ' : '▶'}</span></button>
        <input type="range" min="0" max={Math.max(dates.length - 1, 0)} value={Math.max(0, dates.indexOf(playhead))} onChange={event => { setPlaying(false); setPlayhead(dates[Number(event.target.value)] ?? end); }} aria-label="Timeline date" />
        <time className="playback-date" dateTime={playhead}>{playhead}</time>
        <button type="button" className="playback-reset" onClick={() => { setPlaying(false); setPlayhead(end); }}>Reset</button>
      </div>
      <div ref={chartNode} role="img" aria-label={`Stacked daily chart of ${visible.length} visible articles by tone through ${playhead}`} className="coverage-chart" />
      <p className="chart-caption">Dashed marker: <a href="https://nvidianews.nvidia.com/news/nvidia-announces-ceo-transition/" target="_blank" rel="noopener noreferrer">NVIDIA’s documented CEO transition</a> on 12 November 2026. It does not imply causation.</p>
    </div>
    <div className="timeline-list">{visible.map(a => <a href={articles.some(seed => seed.id === a.id) ? `/articles/${a.id}/` : a.source} key={a.id}><time>{a.date}</time><span className="timeline-marker" /><span><strong>{a.headline}</strong><small>{a.publication} · {a.authors.join(', ')}</small></span><span className={`badge ${a.sentiment.toLowerCase()}`}>{a.sentiment}</span></a>)}{visible.length === 0 && <div className="empty panel"><strong>No coverage in this selection</strong><p>Adjust the dates, filters, or playback position to see verified records.</p></div>}</div>
  </>;
}
