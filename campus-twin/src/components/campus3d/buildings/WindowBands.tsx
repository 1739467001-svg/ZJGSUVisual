import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { world } from '../../../data/world'
import { liveSky } from '../liveSky'

// 夜景窗带（规格 §9.3）：每楼 4~8 条横向带，自发光 = windowGlow × (0.3 + 0.7×楼占用率)
// 全部楼合并为一个 InstancedMesh；加色混合，白天近零不可见
const WARM = new THREE.Color('#ffcf99')

interface BandMeta {
  buildingId: string
}

export function WindowBands({ occupancy }: { occupancy: Map<string, number> }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const occRef = useRef(occupancy)
  occRef.current = occupancy

  const meta = useMemo<BandMeta[]>(() => {
    const out: BandMeta[] = []
    for (const b of world.buildings) {
      const n = Math.max(4, Math.min(8, b.floors))
      for (let i = 0; i < n; i++) out.push({ buildingId: b.id })
    }
    return out
  }, [])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const dummy = new THREE.Object3D()
    const black = new THREE.Color(0, 0, 0)
    let i = 0
    for (const b of world.buildings) {
      const n = Math.max(4, Math.min(8, b.floors))
      const h = b.floors * b.floorHeight
      for (let k = 0; k < n; k++) {
        const y = h * (0.18 + (0.68 * k) / (n - 1))
        dummy.position.set(b.position[0], y, b.position[1])
        // 凸出楼体 0.7m：780m 总览视距下仍可见
        dummy.scale.set(b.footprint[0] + 1.4, 0.9, b.footprint[1] + 1.4)
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
        mesh.setColorAt(i, black)
        i++
      }
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [meta])

  useFrame(() => {
    const mesh = ref.current
    if (!mesh) return
    const g = liveSky.current.windowGlow
    const color = new THREE.Color()
    for (let i = 0; i < meta.length; i++) {
      const occ = occRef.current.get(meta[i].buildingId) ?? 0
      const k = g * (0.35 + 0.65 * occ)
      color.copy(WARM).multiplyScalar(k * 1.5)
      mesh.setColorAt(i, color)
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  })

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, meta.length]} key={meta.length}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial blending={THREE.AdditiveBlending} transparent depthWrite={false} toneMapped={false} />
    </instancedMesh>
  )
}
