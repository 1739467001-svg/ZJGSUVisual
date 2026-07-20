import { beforeEach, describe, expect, it } from 'vitest'
import { useCampusStore } from '../campusStore'
import { resetIds } from '../../lib/ids'
import { world } from '../../data/world'
import { buildingTrafficWeights } from '../../sim/traffic'
import { tideOccupancy } from '../../sim/tides'

const state = () => useCampusStore.getState()

beforeEach(() => {
  resetIds()
  useCampusStore.setState(useCampusStore.getInitialState(), true)
})

describe('视图复位 resetView（批次 2）', () => {
  it('只复位视图字段，不清业务数据', () => {
    useCampusStore.setState((cur) => ({
      drill: { level: 2, buildingId: 'lib' },
      heatMode: 'occupancy',
      sceneMode: 'overview',
      selectedBuildingId: 'lib',
      candidates: [{ roomId: 'lib-501', walkMin: 6.5 }],
      bookings: [
        { id: 'B-901', roomId: 'lib-501', user: 'u', start: '10:00', end: '11:00', status: 'ok', createdAt: '' },
      ],
      rooms: cur.rooms,
    }))
    state().resetView()
    const s = state()
    expect(s.drill.level).toBe(0)
    expect(s.heatMode).toBe('none')
    expect(s.sceneMode).toBe('idle')
    expect(s.cameraShot?.kind).toBe('overview')
    expect(s.selectedBuildingId).toBeUndefined()
    // 业务数据原样保留
    expect(s.candidates).toHaveLength(1)
    expect(s.bookings).toHaveLength(1)
  })
})

describe('setHeatMode 镜头联动', () => {
  it("traffic → topdown；none → overview", () => {
    state().setHeatMode('traffic')
    expect(state().heatMode).toBe('traffic')
    expect(state().cameraShot?.kind).toBe('topdown')
    state().setHeatMode('none')
    expect(state().heatMode).toBe('none')
    expect(state().cameraShot?.kind).toBe('overview')
  })
})

describe('traffic 热力指标不是占位', () => {
  it('10:31 下课潮汐：人流指标与占用指标分布不同', () => {
    const t = new Date(2026, 2, 3, 10, 31, 0)
    const traffic = buildingTrafficWeights(world, t)
    const jxaTraffic = traffic.get('jxa') ?? 0
    const jxaOcc = tideOccupancy(world.buildings.find((b) => b.id === 'jxa')!, 631)
    // 下课时教学楼占用骤降，但周边道路人流冲高 —— 两套指标走向相反
    expect(jxaOcc).toBeLessThan(0.4)
    expect(jxaTraffic).toBeGreaterThan(0.5)
    // 且 traffic 指标并非 occupancy 的复制
    const same = world.buildings.every((b) => Math.abs((traffic.get(b.id) ?? 0) - tideOccupancy(b, 631)) < 0.01)
    expect(same).toBe(false)
  })
})
