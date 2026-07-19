import { useMemo } from 'react'
import { useCampusStore } from '../../store/campusStore'

/** 按楼占用率 Map：改读模拟引擎 snapshot（单一数据源，规格 §7） */
export function useOccupancyMap(): Map<string, number> {
  const pulses = useCampusStore((s) => s.snapshot.pulses)
  return useMemo(
    () => new Map(Object.entries(pulses).map(([id, p]) => [id, p.occupancy])),
    [pulses],
  )
}
