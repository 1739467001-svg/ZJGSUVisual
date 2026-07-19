import { describe, expect, it } from 'vitest'
import { pulseState, tideOccupancy } from '../tides'
import { powerKw, areaFactorOf } from '../energy'
import { trafficOnRoads } from '../traffic'
import { pulseAt, sampleDay } from '../engine'
import { world } from '../../data/world'
import { rooms } from '../../data/seedRooms'

const at = (h: number, m = 0) => new Date(2026, 2, 3, h, m, 0)
const b = (id: string) => world.buildings.find((x) => x.id === id)!

describe('TideModel · 关键时刻值', () => {
  it('10:00 上课中：教学楼高占用 0.75~0.95', () => {
    const occ = tideOccupancy(b('jxa'), 600)
    expect(occ).toBeGreaterThan(0.75)
    expect(occ).toBeLessThan(0.98)
    expect(pulseState(600)).toBe('class')
  })

  it('10:35 下课脉冲：教学楼骤降', () => {
    expect(pulseState(635)).toBe('break')
    expect(tideOccupancy(b('jxa'), 635)).toBeLessThan(0.4)
  })

  it('12:00 食堂窗：occupancy ≈ 0.9', () => {
    expect(tideOccupancy(b('qingfeng'), 720)).toBeGreaterThan(0.85)
  })

  it('14:00 图书馆峰值 ≥0.8', () => {
    expect(tideOccupancy(b('lib'), 840)).toBeGreaterThan(0.8)
  })

  it('22:00 图书馆回落至 0.2', () => {
    expect(tideOccupancy(b('lib'), 1320)).toBeLessThan(0.25)
  })

  it('18:00 傍晚不再全 0（食堂窗 + 场馆傍晚峰）', () => {
    const snap = pulseAt(world, rooms, [], at(18))
    expect(snap.occupancyOverall).toBeGreaterThan(0.1)
    expect(tideOccupancy(b('qingfeng'), 1080)).toBeGreaterThan(0.85)
  })

  it('确定性：同一时刻两次调用结果全等', () => {
    const t = at(10, 35)
    expect(tideOccupancy(b('jxa'), 635)).toBe(tideOccupancy(b('jxa'), 635))
    expect(pulseAt(world, rooms, [], t)).toEqual(pulseAt(world, rooms, [], t))
    expect(trafficOnRoads(world, t)).toEqual(trafficOnRoads(world, t))
  })
})

describe('EnergyModel', () => {
  it('随占用单调递增', () => {
    const af = areaFactorOf(b('lib'))
    expect(powerKw('library', 0.9, af)).toBeGreaterThan(powerKw('library', 0.1, af))
  })

  it('无面积楼宇按 footprint×floors 估算', () => {
    const bare = { ...b('juyuan'), area: undefined }
    expect(areaFactorOf(bare)).toBeCloseTo((70 * 54 * 3) / 10000)
    expect(areaFactorOf(b('lib'))).toBeCloseTo(5.2)
  })
})

describe('TrafficModel', () => {
  it('下课时教学区道路权重显著高于上课时', () => {
    const breakTraffic = trafficOnRoads(world, at(10, 35))
    const classTraffic = trafficOnRoads(world, at(10, 0))
    expect(breakTraffic['rd-axis']).toBeGreaterThan(0.6)
    expect(classTraffic['rd-axis']).toBeLessThan(0.3)
    expect(breakTraffic['rd-axis']).toBeGreaterThan(classTraffic['rd-axis'] * 2)
  })

  it('食堂窗期间环路道路高位', () => {
    const lunch = trafficOnRoads(world, at(12, 0))
    expect(lunch['rd-ring-n']).toBeGreaterThan(0.6)
    expect(lunch['rd-ring-s']).toBeGreaterThan(0.6)
  })
})

describe('pulseAt · snapshot 聚合一致性', () => {
  it('总量 = 分楼之和', () => {
    const snap = pulseAt(world, rooms, [], at(10))
    const headSum = Object.values(snap.pulses).reduce((a, p) => a + p.headcount, 0)
    const kwSum = Object.values(snap.pulses).reduce((a, p) => a + p.powerKw, 0)
    expect(snap.totalHeadcount).toBe(headSum)
    expect(snap.totalPowerKw).toBe(Math.round(kwSum))
    expect(Object.keys(snap.pulses)).toHaveLength(21)
  })

  it('未闭环工单计入该楼 alerts', () => {
    const snap = pulseAt(world, rooms, [
      { id: 'RP-001', roomId: 'jxc-302', desc: '投影坏了', status: 'new', assignee: '待派单', createdAt: '' },
    ], at(10))
    expect(snap.pulses.jxc.alerts).toBe(1)
    expect(snap.pulses.jxa.alerts).toBe(0)
  })

  it('sampleDay：8:00–22:00 每 10 分钟采样且确定', () => {
    const d1 = sampleDay(world, rooms)
    const d2 = sampleDay(world, rooms)
    expect(d1.minutes.length).toBe(85)
    expect(d1).toEqual(d2)
    expect(Math.max(...d1.occupancy)).toBeGreaterThan(30)
  })
})
