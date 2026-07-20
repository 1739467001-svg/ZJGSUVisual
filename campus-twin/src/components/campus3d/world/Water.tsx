import { useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { world } from '../../../data/world'
import { ribbonGeometry } from './ribbon'
import { flatOutline } from '../../../lib/outline'

// v4：水系全部来自 OSM——湖/池塘为真实多边形（合并 1 次绘制），河浜为贴路径条带
const MAT = (
  <meshStandardMaterial color="#123a52" transparent opacity={0.85} roughness={0.15} metalness={0.2} side={THREE.DoubleSide} />
)

export function Water() {
  const lakeGeo = useMemo(() => {
    const parts = world.water.filter((w) => w.kind === 'lake').map((w) => flatOutline(w.outline).translate(0, 0.05, 0))
    return parts.length ? mergeGeometries(parts, false) : null
  }, [])

  const riverGeo = useMemo(() => {
    const parts = world.water
      .filter((w) => w.kind === 'river')
      .map((w) => ribbonGeometry(w.path, w.width, 0.05))
    return parts.length ? mergeGeometries(parts, false) : null
  }, [])

  return (
    <group>
      {lakeGeo && <mesh geometry={lakeGeo}>{MAT}</mesh>}
      {riverGeo && <mesh geometry={riverGeo}>{MAT}</mesh>}
    </group>
  )
}
