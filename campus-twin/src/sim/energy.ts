import type { BuildingKind, BuildingSpec } from '../types'
import { BASE_KW } from '../lib/heatMath'

// EnergyModel（规格 §7）：powerKw = base(kind) × (0.35 + 0.65×occupancy) × areaFactor

/** 面积因子：档案面积优先，缺省按 footprint×floors 估算 */
export function areaFactorOf(b: BuildingSpec): number {
  if (b.area) return b.area / 10000
  return (b.footprint[0] * b.footprint[1] * b.floors) / 10000
}

export function powerKw(kind: BuildingKind, occupancy: number, areaFactor: number): number {
  return BASE_KW[kind] * (0.35 + 0.65 * occupancy) * areaFactor
}
