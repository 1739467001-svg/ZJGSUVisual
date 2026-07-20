import type { Booking, BuildingPulse, CampusSnapshot, Room, Ticket, WorldData } from '../types'
import { endPlus, overlaps, toHHMM } from '../lib/time'
import { minutesOf, tideOccupancy } from './tides'
import { areaFactorOf, powerKw } from './energy'
import { toLocalIso } from './clock'

export { trafficOnRoads } from './traffic'

// 楼容量估算缓存（rooms 引用不变即命中）
let capCache: { rooms: Room[]; caps: Map<string, number>; roomBuilding: Map<string, string> } | null = null
function capacityOf(rooms: Room[]): { caps: Map<string, number>; roomBuilding: Map<string, string> } {
  if (capCache?.rooms === rooms) return capCache
  const caps = new Map<string, number>()
  const roomBuilding = new Map<string, string>()
  for (const r of rooms) {
    caps.set(r.buildingId, (caps.get(r.buildingId) ?? 0) + r.capacity)
    roomBuilding.set(r.id, r.buildingId)
  }
  capCache = { rooms, caps, roomBuilding }
  return capCache
}

/** 模拟引擎主接口（规格 §7）：同一 t 输入必然得到同一输出 */
export function pulseAt(
  world: WorldData,
  rooms: Room[],
  tickets: Ticket[],
  t: Date,
  bookings: Booking[] = [],
): CampusSnapshot {
  const m = minutesOf(t)
  const now = toHHMM(Math.floor(m))
  const { caps, roomBuilding } = capacityOf(rooms)
  const pulses: Record<string, BuildingPulse> = {}
  let totalHeadcount = 0
  let totalPowerKw = 0
  let occSum = 0
  let occN = 0
  for (const b of world.buildings) {
    // 占用 = TideModel + 业务占用加成（规格 §5.1 预约后 KPI 联动）：
    // occupancy = clamp(tide + busyRatio × 0.5, 0, 1)
    // busyRatio = 楼内 busy 房间或当前时刻有进行中预约的房间占比；repair 房间不计入
    const tide = tideOccupancy(b, m)
    const bRooms = rooms.filter((r) => r.buildingId === b.id)
    const busyN = bRooms.filter(
      (r) =>
        r.status === 'busy' ||
        bookings.some((bk) => bk.roomId === r.id && bk.status === 'ok' && overlaps(bk.start, bk.end, now, endPlus(now, 1))),
    ).length
    const occupancy = Math.min(1, Math.max(0.02, tide + (bRooms.length > 0 ? (busyN / bRooms.length) * 0.5 : 0)))
    const cap = caps.get(b.id) ?? 0
    const headcount = Math.round(occupancy * cap)
    const kw = powerKw(b.kind, occupancy, areaFactorOf(b))
    let alerts = 0
    for (const tk of tickets) {
      if (tk.status !== 'done' && roomBuilding.get(tk.roomId) === b.id) alerts++
    }
    pulses[b.id] = { buildingId: b.id, occupancy, headcount, powerKw: kw, alerts }
    totalHeadcount += headcount
    totalPowerKw += kw
    if (cap > 0) {
      occSum += occupancy
      occN++
    }
  }
  return {
    ts: toLocalIso(t),
    pulses,
    totalHeadcount,
    totalPowerKw: Math.round(totalPowerKw),
    occupancyOverall: occN > 0 ? occSum / occN : 0,
  }
}

/** 图表用：对当日 8:00–22:00 每 10 分钟采样（确定性，与工单无关） */
export function sampleDay(world: WorldData, rooms: Room[]): { minutes: number[]; occupancy: number[]; power: number[] } {
  const minutes: number[] = []
  const occupancy: number[] = []
  const power: number[] = []
  const day = new Date(2026, 2, 3, 8, 0, 0)
  for (let m = 480; m <= 1320; m += 10) {
    const t = new Date(day.getTime() + (m - 480) * 60000)
    const snap = pulseAt(world, rooms, [], t)
    minutes.push(m)
    occupancy.push(Math.round(snap.occupancyOverall * 1000) / 10)
    power.push(snap.totalPowerKw)
  }
  return { minutes, occupancy, power }
}
