import { world } from '../../../data/world'

// 首屏唤醒编排（规格 §15 00-03s）：楼体按离中心距离错峰弹起，中心地标先起
// 确定性延迟：离中心越远越晚，0..1.2s 内铺开；单楼弹起时长 0.7s，约 2s 全场就绪
const POP_S = 0.7
const SPREAD_S = 1.2

const delays = new Map<string, number>()
const maxD = Math.max(...world.buildings.map((b) => Math.hypot(b.position[0], b.position[1])), 1)
for (const b of world.buildings) {
  delays.set(b.id, (Math.hypot(b.position[0], b.position[1]) / maxD) * SPREAD_S)
}

// 唤醒总时长（含单楼弹起），标签等 UI 在此之后入场
export const INTRO_TOTAL_S = SPREAD_S + POP_S

// t 为 clock.elapsedTime（Canvas 挂载起算），返回 0..1 弹起系数（easeOutCubic）
export function introScale(buildingId: string, t: number): number {
  const p = Math.min(Math.max((t - (delays.get(buildingId) ?? 0)) / POP_S, 0), 1)
  return 1 - Math.pow(1 - p, 3)
}
