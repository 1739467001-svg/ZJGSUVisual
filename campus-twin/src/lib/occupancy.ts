import type { Booking, Room } from '../types'
import { endPlus, overlaps } from './time'

/** 按楼聚合当前时刻占用率（有课或有有效预约的房间占比） */
export function occupancyByBuilding(rooms: Room[], bookings: Booking[], now: string): Map<string, number> {
  const end = endPlus(now, 30)
  const totals = new Map<string, number>()
  const busy = new Map<string, number>()
  for (const r of rooms) {
    totals.set(r.buildingId, (totals.get(r.buildingId) ?? 0) + 1)
    const occupied =
      r.status === 'busy' ||
      r.schedule.some((s) => overlaps(s.start, s.end, now, end)) ||
      bookings.some((b) => b.roomId === r.id && b.status === 'ok' && overlaps(b.start, b.end, now, end))
    if (occupied) busy.set(r.buildingId, (busy.get(r.buildingId) ?? 0) + 1)
  }
  const out = new Map<string, number>()
  for (const [id, total] of totals) out.set(id, total > 0 ? (busy.get(id) ?? 0) / total : 0)
  return out
}
