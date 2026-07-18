import type { CampusState } from '../store/campusStore'

export type Drill = CampusState['drill']

/** 面包屑逐级返回（规格 §9.4）：校园 / 楼 / xF / 房间，降级时丢弃更深层状态 */
export function drillToLevel(d: Drill, level: Drill['level']): Drill {
  switch (level) {
    case 0:
      return { level: 0 }
    case 1:
      return d.buildingId ? { level: 1, buildingId: d.buildingId } : { level: 0 }
    case 2:
      return d.buildingId
        ? { level: 2, buildingId: d.buildingId, ...(d.floor !== undefined ? { floor: d.floor } : {}) }
        : { level: 0 }
    default:
      return d
  }
}
