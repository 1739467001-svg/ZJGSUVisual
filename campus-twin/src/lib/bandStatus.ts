import type { CampusState } from '../store/campusStore'

// 楼顶光带聚合状态（规格 §9.3）。抽成纯函数：组件与测试共用同一份逻辑
export type BandStatus = 'free' | 'busy' | 'repair' | 'matched' | 'selected' | 'hot'

export const BAND_COLOR: Record<BandStatus, string> = {
  free: '#34d399',
  busy: '#6b7280',
  repair: '#ef4444',
  matched: '#38bdf8',
  selected: '#f5c542',
  hot: '#fb7185',
}

/** 优先级：repair > selected > matched > hot > busy(占用≥0.6 或有 busy 房间) > free */
export function resolveBandStatus(s: CampusState, buildingId: string, occupancy: number): BandStatus {
  if (s.rooms.some((r) => r.buildingId === buildingId && r.status === 'repair')) return 'repair'
  if (s.selectedBuildingId === buildingId) return 'selected'
  if (s.highlightedRoomIds.some((id) => id.startsWith(`${buildingId}-`))) return 'matched'
  if (s.admin && s.activePanel === 'admin' && s.admin.top[0]?.buildingId === buildingId) return 'hot'
  if (occupancy >= 0.6 || s.rooms.some((r) => r.buildingId === buildingId && r.status === 'busy')) return 'busy'
  return 'free'
}
