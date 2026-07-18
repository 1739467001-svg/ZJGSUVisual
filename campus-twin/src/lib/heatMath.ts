import type { BuildingKind, WorldData } from '../types'

// 热力映射（Wow#5）：metric ∈ [0,1] → 楼高系数与浮层颜色（绿→黄→红）
export function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n))
}

export function heatHeightScale(metric: number): number {
  return 1 + 0.6 * clamp01(metric)
}

const GREEN: [number, number, number] = [52, 211, 153]
const YELLOW: [number, number, number] = [245, 197, 66]
const RED: [number, number, number] = [239, 68, 68]

export function heatColor(metric: number): string {
  const t = clamp01(metric)
  const [a, b, k] = t < 0.5 ? [GREEN, YELLOW, t * 2] : [YELLOW, RED, (t - 0.5) * 2]
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * k))
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

// 各业态基础功率（kW/万㎡，与规格 §7 EnergyModel 同式）
export const BASE_KW: Record<BuildingKind, number> = {
  library: 120,
  admin: 90,
  teaching: 60,
  faculty: 70,
  venue: 80,
  sports: 100,
  canteen: 90,
  dorm: 50,
}

/** 能耗指标：base(kind)×(0.35+0.65·occ)×面积因子，按最大值归一化 */
export function energyMetrics(world: WorldData, occupancy: Map<string, number>): Map<string, number> {
  const raw = new Map<string, number>()
  let max = 0
  for (const b of world.buildings) {
    const occ = occupancy.get(b.id) ?? 0
    const kw = BASE_KW[b.kind] * (0.35 + 0.65 * occ) * ((b.area ?? 10000) / 10000)
    raw.set(b.id, kw)
    if (kw > max) max = kw
  }
  const out = new Map<string, number>()
  if (max > 0) for (const [id, kw] of raw) out.set(id, kw / max)
  return out
}
