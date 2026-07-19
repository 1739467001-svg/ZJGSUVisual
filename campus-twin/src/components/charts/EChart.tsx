import { useEffect, useRef } from 'react'
import * as echarts from 'echarts/core'
import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, MarkLineComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsCoreOption } from 'echarts/core'

// 原生 echarts 薄封装（规格 §13 注：不引入 echarts-for-react）
echarts.use([LineChart, BarChart, GridComponent, TooltipComponent, MarkLineComponent, CanvasRenderer])

export function EChart({ option, className }: { option: EChartsCoreOption; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const chart = echarts.init(el, undefined, { renderer: 'canvas' })
    chartRef.current = chart
    const ro = new ResizeObserver(() => chart.resize())
    ro.observe(el)
    return () => {
      ro.disconnect()
      chart.dispose()
      chartRef.current = null
    }
  }, [])

  useEffect(() => {
    chartRef.current?.setOption(option)
  }, [option])

  return <div ref={ref} className={className} style={{ width: '100%', height: '100%' }} />
}
