import type { AdminOverview, BuildingKind, Room } from '../../types'
import { overlaps } from '../../lib/time'
import { nowHHMM, endPlus } from '../../lib/time'
import { buildingName, deviceLabel, roomLabel } from '../../lib/format'
import type { Handler, HandlerContext } from '../handlerTypes'

// 各业态基础功率（kW，每万㎡）；潮汐精修在阶段 5
const BASE_KW: Record<BuildingKind, number> = {
  library: 120,
  admin: 90,
  teaching: 60,
  faculty: 70,
  venue: 80,
  sports: 100,
  canteen: 90,
  dorm: 50,
}

function roomOccupied(r: Room, ctx: HandlerContext, now: string): boolean {
  const end = endPlus(now, 30)
  if (r.schedule.some((s) => overlaps(s.start, s.end, now, end))) return true
  return ctx.bookings.some((b) => b.roomId === r.id && b.status === 'ok' && overlaps(b.start, b.end, now, end))
}

export function summarize(ctx: HandlerContext): AdminOverview {
  const now = nowHHMM(ctx.virtualTs)
  const perBuilding = ctx.world.buildings.map((b) => {
    const rooms = ctx.rooms.filter((r) => r.buildingId === b.id)
    if (!rooms.length) return { buildingId: b.id, occupancy: 0, headcount: 0 }
    const busy = rooms.filter((r) => roomOccupied(r, ctx, now))
    const occupancy = busy.length / rooms.length
    const headcount = busy.reduce((acc, r) => acc + Math.round(r.capacity * 0.8), 0)
    return { buildingId: b.id, occupancy, headcount }
  })

  const withRooms = perBuilding.filter((p) => ctx.rooms.some((r) => r.buildingId === p.buildingId))
  const occupancyOverall = withRooms.length
    ? withRooms.reduce((a, p) => a + p.occupancy, 0) / withRooms.length
    : 0
  const headcount = perBuilding.reduce((a, p) => a + p.headcount, 0)
  const totalPowerKw = ctx.world.buildings.reduce((acc, b) => {
    const occ = perBuilding.find((p) => p.buildingId === b.id)?.occupancy ?? 0
    const areaFactor = (b.area ?? 10000) / 10000
    return acc + BASE_KW[b.kind] * (0.35 + 0.65 * occ) * areaFactor
  }, 0)

  const active = ctx.tickets.filter((t) => t.status !== 'done')
  const anomalies: AdminOverview['anomalies'] = [
    ...ctx.devices
      .filter((d) => d.status === 'fault')
      .map((d) => {
        const room = ctx.rooms.find((r) => r.id === d.roomId)
        return {
          id: `dev-${d.id}`,
          text: `${room ? roomLabel(room) : d.roomId} ${deviceLabel(d.type)}故障`,
          ...(room ? { buildingId: room.buildingId, roomId: room.id } : {}),
        }
      }),
    ...active.map((t) => {
      const room = ctx.rooms.find((r) => r.id === t.roomId)
      return {
        id: t.id,
        text: `${t.id} ${room ? roomLabel(room) : t.roomId}：${t.desc}（${t.status === 'new' ? '待受理' : '处理中'}）`,
        ...(room ? { buildingId: room.buildingId } : {}),
        roomId: t.roomId,
      }
    }),
  ]

  const top = [...perBuilding].sort((a, b) => b.occupancy - a.occupancy).slice(0, 5)

  const advice: string[] = []
  const newTicket = ctx.tickets.find((t) => t.status === 'new')
  if (newTicket) {
    const room = ctx.rooms.find((r) => r.id === newTicket.roomId)
    advice.push(`${room ? roomLabel(room) : newTicket.roomId} 报修未受理（${newTicket.id}），建议派员处理`)
  }
  const busiest = top[0]
  if (busiest && busiest.occupancy >= 0.5) {
    advice.push(`${buildingName(busiest.buildingId)}占用率 ${Math.round(busiest.occupancy * 100)}%，接近饱和，建议引导至邻近教学楼`)
  }
  if (!advice.length) advice.push('当前全校运行平稳，无待处理异常')

  return {
    occupancyOverall,
    headcount,
    totalPowerKw: Math.round(totalPowerKw),
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
    effects: { activePanel: 'admin', sceneMode: 'overview', admin: data },
  }
}
