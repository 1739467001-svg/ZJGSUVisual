import { describe, expect, it } from 'vitest'
import { drillToLevel, type Drill } from '../drill'

describe('drill · 面包屑层级转换', () => {
  const lv3: Drill = { level: 3, buildingId: 'lib', floor: 3, roomId: 'lib-301' }

  it('Lv3 → 楼名(Lv1)：丢弃楼层与房间', () => {
    expect(drillToLevel(lv3, 1)).toEqual({ level: 1, buildingId: 'lib' })
  })

  it('Lv3 → xF(Lv2)：保留楼层、丢弃房间', () => {
    expect(drillToLevel(lv3, 2)).toEqual({ level: 2, buildingId: 'lib', floor: 3 })
  })

  it('任意层 → 校园(Lv0)：清空上下文', () => {
    expect(drillToLevel(lv3, 0)).toEqual({ level: 0 })
    expect(drillToLevel({ level: 1, buildingId: 'lib' }, 0)).toEqual({ level: 0 })
  })

  it('无楼宇时 Lv1/Lv2 回落到 Lv0', () => {
    expect(drillToLevel({ level: 0 }, 1)).toEqual({ level: 0 })
    expect(drillToLevel({ level: 0 }, 2)).toEqual({ level: 0 })
  })
})
