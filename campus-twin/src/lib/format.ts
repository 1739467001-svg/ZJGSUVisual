import type { DeviceType, Room } from '../types'
import { buildingById } from '../data/world'

export const DEVICE_LABEL: Record<DeviceType, string> = {
  projector: '投影',
  ac: '空调',
  light: '灯光',
  mic: '麦克风',
  screen: '屏幕',
  computer: '电脑',
}

export function buildingName(id: string): string {
  return buildingById(id)?.name ?? id
}

export function roomLabel(room: Room): string {
  return `${buildingName(room.buildingId)} ${room.name}`
}

export function deviceLabel(t: DeviceType): string {
  return DEVICE_LABEL[t]
}

export function equipmentText(equipment: DeviceType[]): string {
  return equipment.map(deviceLabel).join(' / ')
}

export function walkText(walkMin: number): string {
  return `步行约 ${walkMin} 分钟`
}

export function hhmmOf(isoTs: string): string {
  return isoTs.slice(11, 16)
}
