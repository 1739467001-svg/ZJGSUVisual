import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { world } from '../../../data/world'
import { liveSky } from '../liveSky'
import { scanlineX, scanlineZ } from '../../../lib/outline'

// 夜景窗带（规格 §9.3）：每楼 4~8 条横向带，自发光 = windowGlow × (0.3 + 0.7×楼占用率)
// 全部楼合并为一个 InstancedMesh；加色混合，白天近零不可见
const WARM = new THREE.Color('#ffcf99')

interface BandMeta {
  buildingId: string
  x: number
  y: number
  z: number
  sx: number
  sz: number
}

// 轮廓楼：沿 bbox 四边各取一条扫描线截段（1m 内缩处截真实轮廓，≥6m 才放带），凸出 0.7m
function outlineSideBands(b: (typeof world.buildings)[number], y: number): BandMeta[] {
  const o = b.outline!
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity
  for (const [x, z] of o) {
    x0 = Math.min(x0, x); x1 = Math.max(x1, x)
    z0 = Math.min(z0, z); z1 = Math.max(z1, z)
  }
  const out: BandMeta[] = []
  const longest = (segs: [number, number][]) =>
    segs.reduce<[number, number] | null>((best, s) => (s[1] - s[0] >= 6 && (!best || s[1] - s[0] > best[1] - best[0]) ? s : best), null)
  const fb = longest(scanlineX(o, z1 - 1))
  if (fb) out.push({ buildingId: b.id, x: (fb[0] + fb[1]) / 2, y, z: z1 + 0.7, sx: fb[1] - fb[0] + 0.6, sz: 1.4 })
  const bb = longest(scanlineX(o, z0 + 1))
  if (bb) out.push({ buildingId: b.id, x: (bb[0] + bb[1]) / 2, y, z: z0 - 0.7, sx: bb[1] - bb[0] + 0.6, sz: 1.4 })
  const rb = longest(scanlineZ(o, x1 - 1))
  if (rb) out.push({ buildingId: b.id, x: x1 + 0.7, y, z: (rb[0] + rb[1]) / 2, sx: 1.4, sz: rb[1] - rb[0] + 0.6 })
  const lb = longest(scanlineZ(o, x0 + 1))
  if (lb) out.push({ buildingId: b.id, x: x0 - 0.7, y, z: (lb[0] + lb[1]) / 2, sx: 1.4, sz: lb[1] - lb[0] + 0.6 })
  return out
}

export function WindowBands({ occupancy }: { occupancy: Map<string, number> }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const occRef = useRef(occupancy)
  occRef.current = occupancy

  const meta = useMemo<BandMeta[]>(() => {
    const out: BandMeta[] = []
    for (const b of world.buildings) {
      const n = Math.max(4, Math.min(8, b.floors))
      const h = b.floors * b.floorHeight
      for (let k = 0; k < n; k++) {
        const y = h * (0.18 + (0.68 * k) / (n - 1))
        if (b.outline?.length) out.push(...outlineSideBands(b, y))
        else
          out.push({
            buildingId: b.id,
            x: b.position[0],
            y,
            z: b.position[1],
            sx: b.footprint[0] + 1.4,
            sz: b.footprint[1] + 1.4,
          })
      }
    }
    return out
  }, [])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const dummy = new THREE.Object3D()
    const black = new THREE.Color(0, 0, 0)
    meta.forEach((m, i) => {
      dummy.position.set(m.x, m.y, m.z)
      dummy.scale.set(m.sx, 0.9, m.sz)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      mesh.setColorAt(i, black)
    })
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
