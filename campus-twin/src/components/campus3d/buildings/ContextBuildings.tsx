import { useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { world } from '../../../data/world'
import { extrudeOutline } from '../../../lib/outline'

// v4：OSM 配角建筑灰色体量（不可点、无标签）——全部合并为一个 mesh，1 次 drawCall
// 视觉定位：低饱和深色体量，衬托 21 栋可交互主角楼
export function ContextBuildings() {
  const geo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = []
    for (const c of world.contextBuildings) {
      const [cx, cz] = c.outline.reduce(([ax, az], [x, z]) => [ax + x / c.outline.length, az + z / c.outline.length], [0, 0])
      parts.push(extrudeOutline(c.outline, cx, cz, c.height).translate(cx, 0, cz))
    }
    if (parts.length === 0) return null
    return mergeGeometries(parts, false)
  }, [])

  if (!geo) return null
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial color="#232f42" roughness={0.85} metalness={0.05} transparent opacity={0.92} />
    </mesh>
  )
}
