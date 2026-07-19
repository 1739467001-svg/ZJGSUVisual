import { useMemo } from 'react'
import type { EChartsCoreOption } from 'echarts/core'
import { useCampusStore } from '../../store/campusStore'
import { sampleDay } from '../../sim/engine'
import { EChart } from './EChart'

const AXIS = { axisLine: { lineStyle: { color: '#e2e8f0' } }, axisLabel: { color: '#94a3b8', fontSize: 10 } }
const GRID = { left: 34, right: 10, top: 22, bottom: 20 }

function hhmm(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(Math.floor(m % 60)).padStart(2, '0')}`
}

function useNowMinute(): number {
  const ts = useCampusStore((s) => s.clock.virtualTs)
  return Number(ts.slice(11, 13)) * 60 + Number(ts.slice(14, 16))
}

// 当日 8:00–22:00 全校平均占用率曲线（确定性采样）+ 当前时刻 markLine
export function OccupancyChart() {
  const world = useCampusStore((s) => s.world)
  const rooms = useCampusStore((s) => s.rooms)
  const nowMin = useNowMinute()
  const day = useMemo(() => sampleDay(world, rooms), [world, rooms])

  const option = useMemo<EChartsCoreOption>(
    () => ({
      grid: GRID,
      tooltip: { trigger: 'axis', valueFormatter: (v: number) => `${v}%` },
      xAxis: { type: 'category', data: day.minutes.map(hhmm), ...AXIS },
      yAxis: { type: 'value', max: 100, name: '%', ...AXIS },
      series: [
        {
          type: 'line',
          data: day.occupancy,
          smooth: true,
          symbol: 'none',
          lineStyle: { color: '#0ea5a3', width: 2 },
          areaStyle: { color: '#0ea5a3', opacity: 0.12 },
          markLine: {
            symbol: 'none',
            lineStyle: { color: '#f5c542', width: 1.5 },
            label: { formatter: '现在', color: '#b45309', fontSize: 10 },
            data: [{ xAxis: hhmm(nowMin) }],
          },
        },
      ],
    }),
    [day, nowMin],
  )
  return <EChart option={option} />
}

// 当日能耗趋势（kW）+ 当前时刻 markLine
export function EnergyTrendChart() {
  const world = useCampusStore((s) => s.world)
  const rooms = useCampusStore((s) => s.rooms)
  const nowMin = useNowMinute()
  const day = useMemo(() => sampleDay(world, rooms), [world, rooms])

  const option = useMemo<EChartsCoreOption>(
    () => ({
      grid: GRID,
      tooltip: { trigger: 'axis', valueFormatter: (v: number) => `${v} kW` },
      xAxis: { type: 'category', data: day.minutes.map(hhmm), ...AXIS },
      yAxis: { type: 'value', name: 'kW', ...AXIS },
      series: [
        {
          type: 'line',
          data: day.power,
          smooth: true,
          symbol: 'none',
          lineStyle: { color: '#f5c542', width: 2 },
          areaStyle: { color: '#f5c542', opacity: 0.12 },
          markLine: {
            symbol: 'none',
            lineStyle: { color: '#0ea5a3', width: 1.5 },
            label: { formatter: '现在', color: '#0b7c7a', fontSize: 10 },
            data: [{ xAxis: hhmm(nowMin) }],
          },
        },
      ],
    }),
    [day, nowMin],
  )
  return <EChart option={option} />
}
