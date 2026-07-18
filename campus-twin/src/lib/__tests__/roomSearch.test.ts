import { describe, expect, it } from 'vitest'
import type { Booking, Room } from '../../types'
import { isRoomFreeAt, searchRooms } from '../roomSearch'
import { rooms } from '../../data/seedRooms'

const mkRoom = (over: Partial<Room>): Room => ({
  id: 'x-301',
  buildingId: 'x',
  floor: 3,
  name: '301',
  type: 'classroom',
  capacity: 40,
  equipment: ['projector'],
  status: 'free',
  schedule: [],
  ...over,
})

describe('roomSearch · 容量与设备过滤', () => {
  const at = { start: '09:58', end: '10:58' }

  it('容量下限', () => {
    const found = searchRooms(rooms, [], { capacity: 8, types: ['meeting'], at })
    expect(found.length).toBeGreaterThan(0)
    for (const r of found) {
      expect(r.capacity).toBeGreaterThanOrEqual(8)
      expect(r.type).toBe('meeting')
    }
  })

  it('设备须全部具备', () => {
    const found = searchRooms(rooms, [], { capacity: 8, equipment: ['projector'], types: ['meeting'], at })
    for (const r of found) expect(r.equipment).toContain('projector')
  })

  it('容量不达标的房间被剔除', () => {
    const list = [mkRoom({ capacity: 6 })]
    expect(searchRooms(list, [], { capacity: 8, at })).toHaveLength(0)
  })
})

describe('roomSearch · 占用冲突', () => {
  const busy: Room = mkRoom({
    schedule: [{ start: '10:00', end: '11:40', title: '高等数学', by: '教务处' }],
  })

  it('课表时段内不可订', () => {
    expect(isRoomFreeAt(busy, [], '10:30', '11:00')).toBe(false)
    expect(searchRooms([busy], [], { at: { start: '10:30', end: '11:00' } })).toHaveLength(0)
  })

  it('课表时段外可订', () => {
    expect(isRoomFreeAt(busy, [], '09:00', '09:50')).toBe(true)
    expect(isRoomFreeAt(busy, [], '12:00', '13:00')).toBe(true)
  })

  it('有效预约冲突不可订，已取消不算', () => {
    const booking: Booking = {
      id: 'B-001',
      roomId: busy.id,
      user: 'u',
      start: '13:00',
      end: '14:00',
      status: 'ok',
      createdAt: '',
    }
    expect(isRoomFreeAt(busy, [booking], '13:30', '14:30')).toBe(false)
    expect(isRoomFreeAt(busy, [{ ...booking, status: 'cancelled' }], '13:30', '14:30')).toBe(true)
  })

  it('报修中的房间不可订', () => {
    expect(isRoomFreeAt(mkRoom({ status: 'repair' }), [], '09:00', '10:00')).toBe(false)
  })
})
