import { useMemo } from 'react'
import type { EChartsCoreOption } from 'echarts/core'
import { useCampusStore } from '../../store/campusStore'
import { EChart } from './EChart'

// 当前时刻 Top5 道路人流权重横向 bar（TrafficModel 实时输出）
export function TrafficChart() {
  const world = useCampusStore((s) => s.world)
  const traffic = useCampusStore((s) => s.traffic)

  const option = useMemo<EChartsCoreOption>(() => {
    const rows = world.roads
      .map((r) => ({ name: r.name, w: traffic[r.id] ?? 0 }))
      .sort((a, b) => b.w - a.w)
      .slice(0, 5)
      .reverse()
    return {
      grid: { left: 64, right: 26, top: 10, bottom: 20 },
      tooltip: { trigger: 'axis', valueFormatter: (v: number) => `${Math.round(v * 100)}%` },
      xAxis: { type: 'value', max: 1, axisLine: { lineStyle: { color: '#e2e8f0' } }, axisLabel: { color: '#94a3b8', fontSize: 10 } },
      yAxis: { type: 'category', data: rows.map((r) => r.name), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#475569', fontSize: 11 } },
      series: [
        {
          type: 'bar',
          data: rows.map((r) => ({
            value: Math.round(r.w * 100) / 100,
            itemStyle: { color: r.w >= 0.6 ? '#ef4444' : r.w >= 0.4 ? '#f5c542' : '#38bdf8', borderRadius: [0, 3, 3, 0] },
          })),
          barWidth: 10,
          label: { show: true, position: 'right', formatter: ({ value }: { value?: number }) => `${Math.round((value ?? 0) * 100)}%`, color: '#64748b', fontSize: 10 },
        },
      ],
    }
  }, [world.roads, traffic])

  return <EChart option={option} />
}
