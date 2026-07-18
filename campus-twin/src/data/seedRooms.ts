import type { BuildingSpec, Device, DeviceType, Room, RoomType, ScheduleItem } from '../types'
import { chance, mulberry32, pick, randInt } from '../lib/rng'
import { world } from './world'

// 固定种子：任何刷新/重跑生成完全一致的演示数据（规格 §3.3 真实锚点策略）
const rng = mulberry32(20260303)

const CLASS_SLOTS: readonly (readonly [string, string])[] = [
  ['08:00', '09:40'],
  ['10:00', '11:40'],
  ['13:30', '15:10'],
  ['15:30', '17:10'],
  ['18:30', '20:10'],
]

const COURSES = ['高等数学', '大学英语', '数据结构', '宏观经济学', '大学物理', '程序设计基础', '线性代数', '管理学原理'] as const
const MEETINGS = ['课题研讨', '项目例会', '学术沙龙', '评审会', '课题组组会'] as const
const ORGS = ['教务处', '学生处', '信电学院', '计算机学院', '经济学院', '管理学院', '外语学院', '学生会'] as const

function scheduleFor(type: RoomType): ScheduleItem[] {
  const p =
    type === 'classroom' ? 0.55
    : type === 'lab' ? 0.5
    : type === 'study' ? 0.4
    : type === 'meeting' ? 0.35
    : 0.25
  const items: ScheduleItem[] = []
  for (const [start, end] of CLASS_SLOTS) {
    if (!chance(rng, p)) continue
    const title =
      type === 'classroom' || type === 'lab' ? pick(rng, COURSES)
      : type === 'venue' ? '活动排期'
      : pick(rng, MEETINGS)
    items.push({ start, end, title, by: pick(rng, ORGS) })
  }
  return items
}

function equipmentFor(type: RoomType, capacity: number): DeviceType[] {
  switch (type) {
    case 'classroom':
      return capacity >= 80 ? ['projector', 'computer', 'mic'] : ['projector', 'computer']
    case 'meeting':
      return chance(rng, 0.5) ? ['projector', 'mic'] : ['screen']
    case 'lab':
      return ['computer', 'screen']
    case 'study':
      return ['light']
    case 'venue':
      return ['mic', 'screen', 'light', 'ac']
  }
}

function roomsForBuilding(b: BuildingSpec): Room[] {
  const rooms: Room[] = []
  const push = (floor: number, seq: number, type: RoomType, capacity: number) => {
    const name = `${floor}${String(seq).padStart(2, '0')}`
    rooms.push({
      id: `${b.id}-${name}`,
      buildingId: b.id,
      floor,
      name,
      type,
      capacity,
      equipment: equipmentFor(type, capacity),
      status: 'free',
      schedule: scheduleFor(type),
    })
  }

  switch (b.kind) {
    case 'teaching': {
      // 每层 3~4 间教室：大流量楼（A/B/C/E，E 楼含报告厅）4 间，其余 3 间
      const perFloor = ['jxa', 'jxb', 'jxc', 'jxe'].includes(b.id) ? 4 : 3
      for (let f = 1; f <= b.floors; f++) {
        for (let s = 1; s <= perFloor; s++) push(f, s, 'classroom', randInt(rng, 3, 12) * 10)
      }
      break
    }
    case 'faculty':
      // 每层 1 间研讨/会议室 + 1 间实验室
      for (let f = 1; f <= b.floors; f++) {
        push(f, 1, 'meeting', randInt(rng, 3, 10) * 2)
        push(f, 2, 'lab', randInt(rng, 2, 4) * 10)
      }
      break
    case 'library': {
      // floors=6 含地下 1 层，房间只铺地上 5 层（与 floorGuide 对齐）
      for (let f = 1; f <= 4; f++) push(f, 1, 'study', randInt(rng, 4, 20) * 10) // 借阅/阅览区
      push(5, 1, 'study', randInt(rng, 6, 12) * 10) // 电子阅览
      for (let s = 2; s <= 4; s++) push(5, s, 'meeting', randInt(rng, 2, 4) * 2) // 研讨间 4~8 人
      break
    }
    case 'admin':
      for (let f = 1; f <= b.floors; f++) push(f, 1, 'meeting', randInt(rng, 4, 10) * 2)
      break
    case 'venue':
      push(1, 1, 'venue', 800) // 剧院观众厅
      break
    case 'sports':
      push(1, 1, 'venue', 300)
      push(1, 2, 'venue', 150)
      break
    case 'canteen':
      push(1, 1, 'venue', randInt(rng, 30, 45) * 10)
      break
    case 'dorm':
      break
  }
  return rooms
}

export const rooms: Room[] = world.buildings.flatMap(roomsForBuilding)

// 房间设备逐台建档；约 3%  deterministic 故障，供报修链路演示
export const devices: Device[] = rooms.flatMap((room) =>
  room.equipment.map((type) => ({
    id: `${room.id}-${type}`,
    roomId: room.id,
    type,
    status: chance(rng, 0.03) ? ('fault' as const) : ('ok' as const),
  })),
)
