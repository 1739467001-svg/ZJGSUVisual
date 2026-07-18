import { describe, expect, it } from 'vitest'
import { buildRouteCurve } from '../routeCurve'
import { clamp01, energyMetrics, heatColor, heatHeightScale } from '../heatMath'
import { world } from '../../data/world'
import { findRoute } from '../pathfind'

describe('heatMath · 热力映射', () => {
  it('楼高系数：1 + 0.6×metric，单调', () => {
    expect(heatHeightScale(0)).toBe(1)
    expect(heatHeightScale(1)).toBeCloseTo(1.6)
    expect(heatHeightScale(0.5)).toBeCloseTo(1.3)
    expect(heatHeightScale(0.3)).toBeLessThan(heatHeightScale(0.7))
  })

  it('浮层颜色：绿→黄→红端点与中间过渡', () => {
    expect(heatColor(0)).toBe('#34d399')
    expect(heatColor(1)).toBe('#ef4444')
    expect(heatColor(0.5)).toBe('#f5c542')
    const mid = heatColor(0.25)
    expect(mid).not.toBe(heatColor(0))
    expect(mid).not.toBe(heatColor(0.5))
  })

  it('越界输入收敛', () => {
    expect(heatHeightScale(9)).toBeCloseTo(1.6)
    expect(heatColor(-1)).toBe('#34d399')
    expect(clamp01(2)).toBe(1)
  })

  it('能耗指标归一化：最大值=1，范围[0,1]', () => {
    const occ = new Map(world.buildings.map((b) => [b.id, 0.5]))
    const m = energyMetrics(world, occ)
    const vals = [...m.values()]
    expect(Math.max(...vals)).toBeCloseTo(1)
    expect(Math.min(...vals)).toBeGreaterThan(0)
  })
})

describe('routeCurve · 路径曲线采样', () => {
  const route = findRoute(world, { kind: 'gate', id: 'gate-east' }, { kind: 'building', id: 'lib' })!

  it('曲线长度 ≈ 路径距离，端点一致', () => {
    const curve = buildRouteCurve(route.waypoints)
    expect(curve.getLength()).toBeGreaterThan(route.distanceM * 0.9)
    expect(curve.getLength()).toBeLessThan(route.distanceM * 1.1)
    const start = curve.getPointAt(0)
    const end = curve.getPointAt(1)
    expect(start.x).toBeCloseTo(route.waypoints[0][0], 1)
    expect(end.z).toBeCloseTo(route.waypoints[route.waypoints.length - 1][1], 1)
  })

  it('采样点贴合折线（y 恒定）', () => {
    const curve = buildRouteCurve(route.waypoints, 1.6)
    for (const u of [0.1, 0.35, 0.6, 0.85]) {
      expect(curve.getPointAt(u).y).toBeCloseTo(1.6)
    }
  })
})
