import type { AdminOverview } from '../../types'
import { buildingName } from '../../lib/format'
import { buildAnomalies } from '../../lib/anomalies'
import type { Handler, HandlerContext } from '../handlerTypes'

// 态势聚合（规格 §5.3）：全部读模拟引擎 snapshot，与沙盘/KPI/图表同源；
// 调度建议基于工单与占用排行，保持可解释
export function summarize(ctx: HandlerContext): AdminOverview {
  const snap = ctx.snapshot
  const perBuilding = ctx.world.buildings.map((b) => ({
    buildingId: b.id,
    occupancy: snap.pulses[b.id]?.occupancy ?? 0,
  }))
  const top = [...perBuilding].sort((a, b) => b.occupancy - a.occupancy).slice(0, 5)
  const anomalies = buildAnomalies(ctx.rooms, ctx.tickets, ctx.devices)
  const active = ctx.tickets.filter((t) => t.status !== 'done')

  const advice: string[] = []
  const newTicket = ctx.tickets.find((t) => t.status === 'new')
  if (newTicket) {
    const room = ctx.rooms.find((r) => r.id === newTicket.roomId)
    advice.push(`${room ? `${buildingName(room.buildingId)} ${room.name}` : newTicket.roomId} 报修未受理（${newTicket.id}），建议派员处理`)
  }
  const busiest = top[0]
  if (busiest && busiest.occupancy >= 0.5) {
    advice.push(`${buildingName(busiest.buildingId)}占用率 ${Math.round(busiest.occupancy * 100)}%，接近饱和，建议引导至邻近教学楼`)
  }
  if (!advice.length) advice.push('当前全校运行平稳，无待处理异常')

  return {
    occupancyOverall: snap.occupancyOverall,
    headcount: snap.totalHeadcount,
    totalPowerKw: snap.totalPowerKw,
    activeTickets: active.length,
    top,
    anomalies,
    advice,
  }
}

export const overviewHandler: Handler = (intent, ctx) => {
  const data = summarize(ctx)
  const isEnergy = intent.intent === 'energy_insight'
  const pct = Math.round(data.occupancyOverall * 100)
  const topName = data.top[0] ? buildingName(data.top[0].buildingId) : '-'

  return {
    steps: [
      { agent: '态势Agent', phase: 'plan', title: '汇总全校状态', detail: isEnergy ? '按楼聚合能耗估算' : '占用 / 能耗 / 工单三源同采' },
      { agent: '态势Agent', phase: 'act', title: '计算指标', detail: `全校占用率 ${pct}% · 在楼约 ${data.headcount} 人 · ${data.totalPowerKw} kW · 工单 ${data.activeTickets} 单进行中` },
      { agent: '态势Agent', phase: 'verify', title: '生成建议', detail: `Top1 ${isEnergy ? '耗电' : '紧张'}：${topName} · 输出 ${data.advice.length} 条调度建议` },
    ],
    result: {
      type: 'overview',
      message: isEnergy
        ? `当前全校功率约 ${data.totalPowerKw} kW，耗电最高的是${topName}，明细在右栏。`
        : `全校占用率 ${pct}%，最紧张的是${topName}，${data.anomalies.length} 项异常、${data.advice.length} 条建议已在右栏。`,
    },
    effects: { activePanel: 'admin', heatMode: isEnergy ? 'energy' : 'occupancy', admin: data },
  }
}
