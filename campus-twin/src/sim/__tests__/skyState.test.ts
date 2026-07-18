import { describe, expect, it } from 'vitest'
import { skyStateAt } from '../skyState'

const at = (h: number, m = 0) => new Date(2026, 2, 3, h, m, 0)

function hexRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]
}

describe('skyState · 24h 关键帧', () => {
  it('12:00 白天：窗带熄灭、灯柱关、太阳高强度', () => {
    const s = skyStateAt(at(12))
    expect(s.isNight).toBe(false)
    expect(s.windowGlow).toBe(0)
    expect(s.lampsOn).toBe(false)
    expect(s.sunIntensity).toBeGreaterThanOrEqual(1.8)
    expect(s.sunDir[1]).toBeGreaterThan(0.7) // 接近最高点
  })

  it('06:30 日出：暖色、低角度', () => {
    const s = skyStateAt(at(6, 30))
    expect(s.isNight).toBe(false)
    const [r, g, b] = hexRgb(s.sunColor)
    expect(r).toBeGreaterThan(g)
    expect(g).toBeGreaterThan(b)
    expect(s.sunDir[1]).toBeLessThan(0.3) // 低角度
    expect(s.sunDir[0]).toBeGreaterThan(0.8) // 偏东
  })

  it('17:30 黄昏：horizonGlow 高、地平线偏橙', () => {
    const s = skyStateAt(at(17, 30))
    expect(s.horizonGlow).toBeGreaterThan(0.5)
    const [r, , b] = hexRgb(s.skyHorizon)
    expect(r).toBeGreaterThan(b)
  })

  it('22:00 夜晚：窗带全亮、灯柱开、深蓝月光', () => {
    const s = skyStateAt(at(22))
    expect(s.isNight).toBe(true)
    expect(s.windowGlow).toBe(1)
    expect(s.lampsOn).toBe(true)
    expect(s.sunIntensity).toBeLessThanOrEqual(0.2)
    expect(s.sunColor).toBe('#8aa4c8')
    const [r, , b] = hexRgb(s.skyTop)
    expect(b).toBeGreaterThan(r)
    expect(b).toBeLessThan(80) // 深蓝夜空
  })

  it('连续性：相邻分钟无跳变', () => {
    for (let min = 0; min < 24 * 60 - 1; min++) {
      const a = skyStateAt(at(Math.floor(min / 60), min % 60))
      const b = skyStateAt(at(Math.floor((min + 1) / 60), (min + 1) % 60))
      expect(Math.abs(a.windowGlow - b.windowGlow)).toBeLessThan(0.05)
      expect(Math.abs(a.sunIntensity - b.sunIntensity)).toBeLessThan(0.1)
      expect(Math.abs(a.horizonGlow - b.horizonGlow)).toBeLessThan(0.05)
    }
  })
})
