import { useMemo } from 'react'
import * as THREE from 'three'
import { world } from '../../../data/world'

// 地面沙盘底座：bounds 外扩一圈，1m 细网格 + 10m 粗网格，边缘微发光描边
// v4：尺寸直接取 world.bounds（OSM 实测范围 1770m × 910m）
const SIZE_X = world.bounds.east - world.bounds.west
const SIZE_Z = world.bounds.south - world.bounds.north
const CX = (world.bounds.west + world.bounds.east) / 2
const CZ = (world.bounds.north + world.bounds.south) / 2

export function Ground() {
  const edgeGeo = useMemo(() => {
    const hx = SIZE_X / 2
    const hz = SIZE_Z / 2
    const pts = [
      new THREE.Vector3(CX - hx, 0.05, CZ - hz),
      new THREE.Vector3(CX + hx, 0.05, CZ - hz),
      new THREE.Vector3(CX + hx, 0.05, CZ + hz),
      new THREE.Vector3(CX - hx, 0.05, CZ + hz),
      new THREE.Vector3(CX - hx, 0.05, CZ - hz),
    ]
    return new THREE.BufferGeometry().setFromPoints(pts)
  }, [])

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[CX, -0.1, CZ]}>
        <planeGeometry args={[SIZE_X, SIZE_Z]} />
        <meshBasicMaterial color="#0d1420" />
      </mesh>
      <gridHelper
        args={[SIZE_X, SIZE_X, '#7fb2e5', '#7fb2e5']}
        position={[CX, 0.01, CZ]}
        material-transparent
        material-opacity={0.06}
      />
      <gridHelper
        args={[SIZE_X, SIZE_X / 10, '#7fb2e5', '#7fb2e5']}
        position={[CX, 0.02, CZ]}
        material-transparent
        material-opacity={0.12}
      />
      <lineLoop geometry={edgeGeo}>
        <lineBasicMaterial color="#38bdf8" transparent opacity={0.45} />
      </lineLoop>
    </group>
  )
}
