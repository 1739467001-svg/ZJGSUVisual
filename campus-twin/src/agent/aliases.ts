import type { DeviceType, RoomType } from '../types'
import { resolveSpokenName, world } from '../data/world'

// 设备口语别名。注意「计算机」不收——会误伤"计算机学院"，电脑类只认"电脑"
export const DEVICE_ALIAS: Record<string, DeviceType> = {
  投影仪: 'projector',
  投影机: 'projector',
  投影: 'projector',
  空调: 'ac',
  灯光: 'light',
  电灯: 'light',
  灯: 'light',
  麦克风: 'mic',
  话筒: 'mic',
  显示屏: 'screen',
  大屏: 'screen',
  屏幕: 'screen',
  电脑: 'computer',
}

export const ROOM_TYPE_ALIAS: Record<string, RoomType> = {
  会议室: 'meeting',
  研讨间: 'meeting',
  讨论间: 'meeting',
  教室: 'classroom',
  实验室: 'lab',
  机房: 'lab',
  自习室: 'study',
  阅览室: 'study',
  报告厅: 'venue',
}

export interface PlaceRef {
  kind: 'gate' | 'building'
  id: string
  name: string
  surface: string
}

/** 场所解析：大门按 name/alias，楼宇统一走 resolveSpokenName（含口语别名表） */
export function resolvePlace(surface: string): PlaceRef | undefined {
  const s = surface.trim()
  if (!s) return undefined
  for (const g of world.gates) {
    if (g.name === s || g.alias.includes(s) || g.alias.some((a) => s.includes(a))) {
      return { kind: 'gate', id: g.id, name: g.name, surface: s }
    }
  }
  const b = resolveSpokenName(s)
  if (b) return { kind: 'building', id: b.id, name: b.name, surface: s }
  return undefined
}

// 楼宇提法词典：name + alias + spokenAliases 键，用于在长句中定位楼宇提及
const buildingSurfaces: { surface: string; id: string; name: string }[] = (() => {
  const out: { surface: string; id: string; name: string }[] = []
  for (const b of world.buildings) {
    for (const s of [b.name, ...b.alias]) out.push({ surface: s, id: b.id, name: b.name })
  }
  for (const [alias, id] of Object.entries(world.spokenAliases)) {
    const b = world.buildings.find((x) => x.id === id)
    if (b) out.push({ surface: alias, id, name: b.name })
  }
  // 长提法优先，避免"计算机学院"被"信息学院"之类短词截胡
  return out.sort((a, b) => b.surface.length - a.surface.length)
})()

/** 在句子中找楼宇提及（最长命中），命中段可被抹除以免干扰设备扫描 */
export function extractBuildingMention(text: string): { surface: string; id: string; name: string } | undefined {
  for (const entry of buildingSurfaces) {
    if (text.includes(entry.surface)) return entry
  }
  return undefined
}

export function extractDevices(text: string): DeviceType[] {
  const found: DeviceType[] = []
  for (const [alias, type] of Object.entries(DEVICE_ALIAS)) {
    if (text.includes(alias) && !found.includes(type)) found.push(type)
  }
  return found
}

export function extractRoomTypes(text: string): RoomType[] {
  const found: RoomType[] = []
  for (const [alias, type] of Object.entries(ROOM_TYPE_ALIAS)) {
    if (text.includes(alias) && !found.includes(type)) found.push(type)
  }
  return found
}
