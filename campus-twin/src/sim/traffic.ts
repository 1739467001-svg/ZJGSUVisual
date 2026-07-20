import type { Road, WorldData } from '../types'
import { isMealWindow, minutesOf, pulseState, sinceLastPulse, tideNoise } from './tides'

// TrafficModel（规格 §7）：下课脉冲时教学楼→食堂/图书馆方向道路权重升高并衰减；
// 食堂窗期间食堂周边道路高位；其余时间 0.1~0.2 底噪。输出确定性。
// v4：道路角色不再硬编码 rd-*，按与楼的实测距离分类——食堂 60m 内 = canteen，
// 教学/学院/图书/行政 60m 内 = teaching，其余 mixed
const ROLE_NEAR_M = 60

export function roadRoleOf(world: WorldData, road: Road): 'teaching' | 'canteen' | 'mixed' {
  let canteenD = Infinity
  let teachingD = Infinity
  for (const b of world.buildings) {
    const isCanteen = b.kind === 'canteen'
    const isTeaching = b.kind === 'teaching' || b.kind === 'faculty' || b.kind === 'library' || b.kind === 'admin'
    if (!isCanteen && !isTeaching) continue
    for (let i = 0; i < road.path.length - 1; i++) {
      const d = distToSeg(b.position[0], b.position[1], road.path[i], road.path[i + 1])
      if (isCanteen && d < canteenD) canteenD = d
      if (isTeaching && d < teachingD) teachingD = d
    }
  }
  if (canteenD <= ROLE_NEAR_M && canteenD <= teachingD) return 'canteen'
  if (teachingD <= ROLE_NEAR_M) return 'teaching'
  if (canteenD <= ROLE_NEAR_M) return 'canteen'
  return 'mixed'
}

export function trafficOnRoads(world: WorldData, t: Date): Record<string, number> {
  const m = minutesOf(t)
  const st = pulseState(m)
  const since = sinceLastPulse(m) // break 态时 0..10
  const out: Record<string, number> = {}
  for (const r of world.roads) {
    const role = roadRoleOf(world, r)
    let w = 0.15
    if (st === 'break') {
      const decay = Math.max(0, 1 - since / 10)
      if (role === 'teaching') w = 0.6 + 0.4 * decay
      else if (role === 'canteen') w = 0.45 + 0.2 * decay
      else w = 0.3
    }
    if (role === 'canteen' && isMealWindow(m)) w = Math.max(w, 0.65)
    out[r.id] = Math.min(1, Math.max(0.05, w + tideNoise(r.id, m) * 0.06))
  }
  return out
}

/** 楼宇热力的人流指标：该楼最近道路的人流权重 */
export function buildingTrafficWeights(world: WorldData, t: Date): Map<string, number> {
  const traffic = trafficOnRoads(world, t)
  const out = new Map<string, number>()
  for (const b of world.buildings) {
    let best = Infinity
    let w = 0.1
    for (const r of world.roads) {
      for (let i = 0; i < r.path.length - 1; i++) {
        const d = distToSeg(b.position[0], b.position[1], r.path[i], r.path[i + 1])
        if (d < best) {
          best = d
          w = traffic[r.id] ?? 0.1
        }
      }
    }
    out.set(b.id, w)
  }
  return out
}

function distToSeg(px: number, pz: number, a: readonly [number, number], b: readonly [number, number]): number {
  const dx = b[0] - a[0]
  const dz = b[1] - a[1]
  const len2 = dx * dx + dz * dz
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - a[0]) * dx + (pz - a[1]) * dz) / len2))
  return Math.hypot(px - (a[0] + dx * t), pz - (a[1] + dz * t))
}
