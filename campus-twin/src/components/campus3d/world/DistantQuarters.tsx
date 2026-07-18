import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { world } from '../../../data/world'
import { mulberry32 } from '../../../lib/rng'

// 远景生活区（规格 §9.2）：低精度体块，只参与天际线，不可下钻
export function DistantQuarters() {
  const ref = useRef<THREE.InstancedMesh>(null)

  const blocks = useMemo(() => {
    const rng = mulberry32(99)
    const out: { x: number; z: number; w: number; d: number; h: number }[] = []
    for (const q of world.distantQuarters) {
      const cols = Math.ceil(Math.sqrt(q.blocks))
      for (let i = 0; i < q.blocks; i++) {
        const col = i % cols
        const row = Math.floor(i / cols)
        out.push({
          x: q.center[0] + (col - cols / 2) * (q.blockSize[0] + 14) + (rng() - 0.5) * 6,
          z: q.center[1] + (row - 1) * (q.blockSize[1] + 22) + (rng() - 0.5) * 6,
          w: q.blockSize[0],
          d: q.blockSize[1],
          h: q.floors * 3,
        })
      }
    }
    return out
  }, [])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const dummy = new THREE.Object3D()
    blocks.forEach((b, i) => {
      dummy.position.set(b.x, b.h / 2, b.z)
      dummy.scale.set(b.w, b.h, b.d)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  }, [blocks])

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, blocks.length]} key={blocks.length}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#1a2637" roughness={1} />
    </instancedMesh>
  )
}
