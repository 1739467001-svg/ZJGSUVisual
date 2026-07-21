import type { BuildingSpec, Room } from '../types'
import { pointInOutline, scanlineX } from './outline'

/**
 * 房间内化的世界坐标（确定性，无需随机数）。
 * v4：有真实轮廓的楼，房间按序号落在轮廓内的扫描线截段上（2 行 × 4 列槽位），
 * 保证 601/401 这类定位精确到楼内方位，而非永远楼中心一条线；盒体楼保持原横向排布。
 * expand=剖层展开系数（Lv2/3 为 1.8），elevated=Lv1+ 楼体抬升 12m。
 */
export function roomWorldPos(b: BuildingSpec, room: Room, expand = 1, elevated = false): [number, number, number] {
  const seq = Number(room.name.slice(-2)) || 1
  const slot = (seq - 1) % 8
  const col = slot % 4
  const row = Math.floor(slot / 4)
  const y = (elevated ? 12 : 0) + (room.floor - 1) * b.floorHeight * expand + b.floorHeight / 2

  let x: number
  let z: number
  if (b.outline?.length) {
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity
    for (const [px, pz] of b.outline) {
      x0 = Math.min(x0, px); x1 = Math.max(x1, px)
      z0 = Math.min(z0, pz); z1 = Math.max(z1, pz)
    }
    const zRow = z0 + ((row + 1) / 3) * (z1 - z0) // 两行：1/3、2/3 进深处
    const segs = scanlineX(b.outline, zRow)
    const longest = segs.reduce<[number, number] | null>(
      (best, s) => (best === null || s[1] - s[0] > best[1] - best[0] ? s : best),
      null,
    )
    if (longest) {
      x = longest[0] + ((col + 1) / 5) * (longest[1] - longest[0]) // 4 列均布于真实内部宽度
      z = zRow
    } else {
      x = b.position[0]
      z = b.position[1]
    }
    // 兜底：轮廓噪声导致落点在外时，向质心收缩一半
    if (!pointInOutline(x, z, b.outline)) {
      x = b.position[0] + (x - b.position[0]) * 0.5
      z = b.position[1] + (z - b.position[1]) * 0.5
    }
  } else {
    x = b.position[0] + ((col - 1.5) / 3) * b.footprint[0] * 0.6
    z = b.position[1] + (row - 0.5) * b.footprint[1] * 0.3
  }
  return [x, y, z]
}
