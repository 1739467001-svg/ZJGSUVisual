import type { DeviceType } from '../../types'
import { deviceLabel } from '../../lib/format'
import type { Handler } from '../handlerTypes'

export const repairHandler: Handler = (intent, ctx) => {
  const { slots } = intent
  const building = slots.buildingId ? ctx.world.buildings.find((b) => b.id === slots.buildingId) : undefined

  if (!building || !slots.room) {
    return {
      steps: [
        { agent: '报修Agent', phase: 'plan', title: '抽取槽位', detail: `楼宇=${slots.building ?? '未识别'} · 房间=${slots.room ?? '未识别'}` },
        { agent: '报修Agent', phase: 'verify', title: '空间定位失败', detail: '缺少楼宇或房间号，无法定位' },
      ],
      result: { type: 'answer', message: '没听清是哪栋楼哪个房间，可以说「三号楼 302 投影坏了」这样带楼名和房间号。' },
    }
  }

  const room = ctx.rooms.find((r) => r.buildingId === building.id && r.name === slots.room)
  if (!room) {
    return {
      steps: [
        { agent: '报修Agent', phase: 'plan', title: '抽取槽位', detail: `楼宇=${building.name} · 房间=${slots.room}` },
        { agent: '报修Agent', phase: 'verify', title: '空间定位失败', detail: `${building.name} 没有房间 ${slots.room}` },
      ],
      result: { type: 'answer', message: `${building.name} 没有找到 ${slots.room} 房间，请确认房间号。` },
    }
  }

  const device = slots.device as DeviceType | undefined
  const deviceCount = device ? room.equipment.filter((d) => d === device).length : 0
  return {
    steps: [
      { agent: '报修Agent', phase: 'plan', title: '抽取槽位', detail: `楼宇=${slots.building ?? building.name} → ${building.name} · 房间=${slots.room} · 设备=${device ? deviceLabel(device) : '未指明'}` },
      { agent: '报修Agent', phase: 'act', title: '空间定位', detail: `已定位 ${building.name} ${room.floor}F-${room.name}${device ? `（台帐：${deviceLabel(device)} ${deviceCount} 台）` : ''}` },
      { agent: '报修Agent', phase: 'verify', title: '表单预填', detail: '报修表单已自动填充，待确认提交' },
    ],
    result: {
      type: 'answer',
      message: `已定位 ${building.name} ${room.name}，报修表单已自动填充，请在右栏确认提交。`,
      roomIds: [room.id],
      buildingIds: [building.id],
    },
    effects: {
      activePanel: 'repair',
      sceneMode: 'repair',
      selectedBuildingId: building.id,
      selectedRoomId: room.id,
      repairDraft: {
        buildingId: building.id,
        roomId: room.id,
        ...(device ? { deviceType: device } : {}),
        desc: intent.rawText,
      },
    },
  }
}
