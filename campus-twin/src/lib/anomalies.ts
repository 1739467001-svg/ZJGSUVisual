import type { AdminOverview, Device, Room, Ticket } from '../types'
import { deviceLabel, roomLabel } from './format'

/** 异常列表：故障设备 + 未闭环工单（overviewHandler 与 AdminPanel 共用） */
export function buildAnomalies(rooms: Room[], tickets: Ticket[], devices: Device[]): AdminOverview['anomalies'] {
  const roomOf = (roomId: string) => rooms.find((r) => r.id === roomId)
  return [
    ...devices
      .filter((d) => d.status === 'fault')
      .map((d) => {
        const room = roomOf(d.roomId)
        return {
          id: `dev-${d.id}`,
          text: `${room ? roomLabel(room) : d.roomId} ${deviceLabel(d.type)}故障`,
          ...(room ? { buildingId: room.buildingId, roomId: room.id } : {}),
        }
      }),
    ...tickets
      .filter((t) => t.status !== 'done')
      .map((t) => {
        const room = roomOf(t.roomId)
        return {
          id: t.id,
          text: `${t.id} ${room ? roomLabel(room) : t.roomId}：${t.desc}（${t.status === 'new' ? '待受理' : '处理中'}）`,
          ...(room ? { buildingId: room.buildingId } : {}),
          roomId: t.roomId,
        }
      }),
  ]
}
