import { describe, expect, it } from 'vitest'
import { world } from '../../data/world'
import { buildGraph, findRoute } from '../pathfind'
import { pointInOutline } from '../outline'

describe('pathfind · 建图', () => {
  it('节点与边非空', () => {
    const g = buildGraph(world)
    expect(g.nodeCount).toBeGreaterThan(20)
    expect(g.edgeCount).toBeGreaterThan(10)
  })

  it('全部楼宇从正门可达', () => {
    for (const b of world.buildings) {
      const r = findRoute(world, { kind: 'gate', id: 'gate-east' }, { kind: 'building', id: b.id })
      expect(r, `正门 → ${b.name}`).not.toBeNull()
    }
  })
})

describe('pathfind · 正门 → 图书馆', () => {
  const route = findRoute(world, { kind: 'gate', id: 'gate-east' }, { kind: 'building', id: 'lib' })!

  it('有路且距离合理', () => {
    expect(route).not.toBeNull()
    expect(route.distanceM).toBeGreaterThan(300)
    expect(route.distanceM).toBeLessThan(1200)
    // 步行 80m/min
    expect(Math.abs(route.walkMin - route.distanceM / 80)).toBeLessThan(0.2)
  })

  it('分段指引含出发/抵达与贴路指引', () => {
    // v4：路名为 OSM 实测（部分无名），断言结构而非具体路名
    expect(route.segments.length).toBeGreaterThanOrEqual(3)
    expect(route.segments[0].text).toContain('正门')
    expect(route.segments[route.segments.length - 1].text).toContain('图书馆')
    const body = route.segments.slice(1, -1)
    expect(body.some((s) => /沿.+向[东南西北]前行 \d+m/.test(s.text))).toBe(true)
  })

  it('中间路径点不落入任何楼宇轮廓', () => {
    // 首尾为场所点（可位于自身轮廓内），中间点必须在楼外；v4 按真实轮廓判定
    const inner = route.waypoints.slice(1, -1)
    for (const [x, z] of inner) {
      for (const b of world.buildings) {
        if (b.id === 'lib') continue // 图书馆接入口豁免（规格兜底条款）
        const inside = b.outline?.length
          ? pointInOutline(x, z, b.outline)
          : Math.abs(x - b.position[0]) < b.footprint[0] / 2 && Math.abs(z - b.position[1]) < b.footprint[1] / 2
        expect(inside, `(${x},${z}) 落入 ${b.name}`).toBe(false)
      }
    }
  })
})
