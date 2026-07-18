import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { world } from '../../../data/world'
import { liveSky } from '../liveSky'

// 灯柱（规格 §9.2）：~120 个沿路网，夜景时顶端自发光（强度随 skyState 渐变）
const TARGET = 120
const HEAD_WARM = new THREE.Color('#ffdca8')

export function LampPosts() {
  const poleRef = useRef<THREE.InstancedMesh>(null)
  const headRef = useRef<THREE.InstancedMesh>(null)
  const headMatRef = useRef<THREE.MeshBasicMaterial>(null)

  const spots = useMemo(() => {
    const out: [number, number][] = []
    let side = 1
    for (const r of world.roads) {
      for (let i = 0; i < r.path.length - 1 && out.length < TARGET; i++) {
        const [ax, az] = r.path[i]
        const [bx, bz] = r.path[i + 1]
        const len = Math.hypot(bx - ax, bz - az)
        const nx = (-(bz - az) / len)
        const nz = (bx - ax) / len
        for (let d = 20; d < len && out.length < TARGET; d += 78) {
          side = -side
          const off = (r.width / 2 + 3.2) * side
          out.push([ax + ((bx - ax) * d) / len + nx * off, az + ((bz - az) * d) / len + nz * off])
        }
      }
    }
    return out
  }, [])

  useLayoutEffect(() => {
    const dummy = new THREE.Object3D()
    const pole = poleRef.current
    const head = headRef.current
    if (!pole || !head) return
    spots.forEach(([x, z], i) => {
      dummy.position.set(x, 2.3, z)
      dummy.scale.setScalar(1)
      dummy.updateMatrix()
      pole.setMatrixAt(i, dummy.matrix)
      dummy.position.set(x, 4.8, z)
      dummy.updateMatrix()
      head.setMatrixAt(i, dummy.matrix)
    })
    pole.instanceMatrix.needsUpdate = true
    head.instanceMatrix.needsUpdate = true
  }, [spots])

  useFrame(() => {
    const g = 0.06 + 0.94 * liveSky.current.lampGlow
    headMatRef.current?.color.copy(HEAD_WARM).multiplyScalar(g)
  })

  return (
    <group>
      <instancedMesh ref={poleRef} args={[undefined, undefined, spots.length]} key={`p${spots.length}`}>
        <cylinderGeometry args={[0.16, 0.2, 4.6, 5]} />
        <meshStandardMaterial color="#2a3444" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={headRef} args={[undefined, undefined, spots.length]} key={`h${spots.length}`}>
        <sphereGeometry args={[0.55, 6, 5]} />
        <meshBasicMaterial ref={headMatRef} color="#ffdca8" toneMapped={false} />
      </instancedMesh>
    </group>
  )
}
