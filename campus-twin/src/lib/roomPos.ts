import type { BuildingSpec, Room } from '../types'

/**
 * 房间内化的世界坐标（抽象布局：按序号沿楼面横向排布，确定性）。
 * expand=剖层展开系数（Lv2/3 为 1.8），elevated=Lv1+ 楼体抬升 12m。
 */
export function roomWorldPos(b: BuildingSpec, room: Room, expand = 1, elevated = false): [number, number, number] {
  const seq = Number(room.name.slice(-2)) || 1
  const col = (seq - 1) % 4
  const x = b.position[0] + ((col - 1.5) / 3) * b.footprint[0] * 0.6
  const y = (elevated ? 12 : 0) + (room.floor - 1) * b.floorHeight * expand + b.floorHeight / 2
  return [x, y, b.position[1]]
}
