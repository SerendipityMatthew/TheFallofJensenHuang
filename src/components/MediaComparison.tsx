import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { Article } from '../lib/data';

const COLORS: Record<string, string> = { Critical: '#e2534a', Mixed: '#e0b060', Neutral: '#8ea0bd', Supportive: '#6fb98f' };
const SENTIMENTS = ['Critical', 'Mixed', 'Neutral', 'Supportive'];

export default function MediaComparison({ articles }: { articles: Article[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current, 'dark');
    const publications = [...new Set(articles.map(a => a.publication))].sort();

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { data: SENTIMENTS, textStyle: { color: '#e7edf6' } },
      grid: { left: 200, right: 30, top: 50, bottom: 40 },
      xAxis: { type: 'value', minInterval: 1, axisLabel: { color: '#8ea0bd' } },
      yAxis: { type: 'category', data: publications, axisLabel: { color: '#e7edf6' } },
      series: SENTIMENTS.map(s => ({
        name: s,
        type: 'bar',
        stack: 'total',
        itemStyle: { color: COLORS[s] },
        data: publications.map(p => articles.filter(a => a.publication === p && a.sentiment === s).length),
      })),
    });

    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [articles]);

  return <div ref={ref} style={{ width: '100%', height: 420, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8 }} />;
}
