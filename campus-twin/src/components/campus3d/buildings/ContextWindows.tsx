import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { world } from '../../../data/world'
import { liveSky } from '../liveSky'

// 配楼夜景窗灯（v4 补充）：160 栋灰色体量在夜晚亮起暖窗，校园"活着感"延伸到配角建筑
// 每楼 2~6 条横向灯带（按高度折算楼层），全部合并为一个 InstancedMesh（1 drawCall）
const WARM = new THREE.Color('#ffc98a')

interface LampMeta {
  x: number
  y: number
  z: number
  sx: number
  seed: number // 确定性亮度系数（同一楼每晚一致）
}

// 简易字符串哈希 → 0..1（确定性，替代随机数）
function hash01(id: string): number {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 1000) / 1000
}

export function ContextWindows() {
  const ref = useRef<THREE.InstancedMesh>(null)

  const meta = useMemo<LampMeta[]>(() => {
    const out: LampMeta[] = []
    for (const c of world.contextBuildings) {
      let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity
      for (const [x, z] of c.outline) {
        x0 = Math.min(x0, x); x1 = Math.max(x1, x)
        z0 = Math.min(z0, z); z1 = Math.max(z1, z)
      }
      const floors = Math.max(2, Math.min(6, Math.round(c.height / 3.1)))
      const seed = hash01(c.id)
      for (let k = 0; k < floors; k++) {
        const y = c.height * (0.22 + (0.62 * k) / (floors - 1))
        // 贴 bbox 长边外 0.5m
        if (x1 - x0 >= z1 - z0) out.push({ x: (x0 + x1) / 2, y, z: z1 + 0.5, sx: (x1 - x0) * 0.8, seed })
        else out.push({ x: x1 + 0.5, y, z: (z0 + z1) / 2, sx: (z1 - z0) * 0.8, seed })
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
      dummy.scale.set(m.sx, 0.7, 1)
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
      color.copy(WARM).multiplyScalar(g * (0.2 + 0.55 * meta[i].seed) * 1.8)
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
