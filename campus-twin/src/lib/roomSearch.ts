import type { Booking, DeviceType, Room, RoomType } from '../types'
import { overlaps } from './time'

export interface RoomQuery {
  capacity?: number // 容量下限
  equipment?: DeviceType[] // 需全部具备
  types?: RoomType[]
  buildingId?: string
  floor?: number
  at: { start: string; end: string } // HH:mm 区间
}

/** 指定时段空闲：无课表冲突、无有效预约冲突、非报修中 */
export function isRoomFreeAt(room: Room, bookings: Booking[], start: string, end: string): boolean {
  if (room.status === 'repair') return false
  if (room.schedule.some((s) => overlaps(s.start, s.end, start, end))) return false
  return !bookings.some(
    (b) => b.roomId === room.id && b.status === 'ok' && overlaps(b.start, b.end, start, end),
  )
}

export function searchRooms(rooms: Room[], bookings: Booking[], q: RoomQuery): Room[] {
  return rooms.filter((r) => {
    if (q.buildingId && r.buildingId !== q.buildingId) return false
    if (q.floor !== undefined && r.floor !== q.floor) return false
    if (q.types && !q.types.includes(r.type)) return false
    if (q.capacity !== undefined && r.capacity < q.capacity) return false
    if (q.equipment && !q.equipment.every((d) => r.equipment.includes(d))) return false
    return isRoomFreeAt(r, bookings, q.at.start, q.at.end)
  })
}
