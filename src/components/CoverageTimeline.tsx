import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { Article } from '../lib/data';

const COLORS: Record<string, string> = { Critical: '#e2534a', Mixed: '#e0b060', Neutral: '#8ea0bd', Supportive: '#6fb98f' };
const SENTIMENTS = ['Critical', 'Mixed', 'Neutral', 'Supportive'];

export default function CoverageTimeline({ articles }: { articles: Article[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current, 'dark');
    const dates = [...new Set(articles.map(a => a.date))].sort();

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: unknown) => {
          const arr = params as { axisValue: string }[];
          const date = arr[0]?.axisValue;
          if (!date) return '';
          const day = articles.filter(a => a.date === date);
          if (!day.length) return date;
          return `<div style="max-width:360px;white-space:normal;line-height:1.4"><b>${date}</b><br/>` +
            day.map(a => `· ${a.headline} <span style="opacity:0.6">(${a.publication})</span>`).join('<br/>') + '</div>';
        },
      },
      legend: { data: SENTIMENTS, textStyle: { color: '#e7edf6' } },
      grid: { left: 60, right: 30, top: 50, bottom: 50 },
      xAxis: { type: 'category', data: dates, axisLabel: { color: '#8ea0bd' } },
      yAxis: { type: 'value', minInterval: 1, axisLabel: { color: '#8ea0bd' } },
      series: SENTIMENTS.map(s => ({
        name: s,
        type: 'bar',
        stack: 'total',
        itemStyle: { color: COLORS[s] },
        data: dates.map(d => articles.filter(a => a.date === d && a.sentiment === s).length),
        emphasis: { focus: 'series' },
      })),
    });

    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [articles]);

  return <div ref={ref} style={{ width: '100%', height: 420, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8 }} />;
}
