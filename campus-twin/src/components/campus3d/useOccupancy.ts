import { useMemo } from 'react'
import { useCampusStore } from '../../store/campusStore'
import { occupancyByBuilding } from '../../lib/occupancy'

/** 按楼占用率 Map：随 rooms/bookings/虚拟时刻（分钟级）重算 */
export function useOccupancyMap(): Map<string, number> {
  const rooms = useCampusStore((s) => s.rooms)
  const bookings = useCampusStore((s) => s.bookings)
  const nowMinute = useCampusStore((s) => s.clock.virtualTs.slice(11, 16))
  return useMemo(
    () => occupancyByBuilding(rooms, bookings, nowMinute),
    [rooms, bookings, nowMinute],
  )
}
