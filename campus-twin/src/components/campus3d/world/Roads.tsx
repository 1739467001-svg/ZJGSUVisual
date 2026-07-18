import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { world } from '../../../data/world'
import { ribbonGeometry, withVertexColor } from './ribbon'
import { mulberry32 } from '../../../lib/rng'

const ROAD_COLOR: Record<string, string> = {
  city: '#2b4a6f',
  main: '#3d6ea5',
  minor: '#24405f',
}

// 流动虚线光点：分摊到各路段、沿折线缓慢前行
const DOT_COUNT = 160

interface DotSeg {
  ax: number
  az: number
  bx: number
  bz: number
  len: number
}

export function Roads() {
  const geo = useMemo(() => {
    const parts = world.roads.map((r) =>
      withVertexColor(ribbonGeometry(r.path, r.width, 0.06), ROAD_COLOR[r.kind] ?? ROAD_COLOR.minor, 1.35),
    )
    return mergeGeometries(parts, false)
  }, [])

  const segs = useMemo<DotSeg[]>(() => {
    const out: DotSeg[] = []
    for (const r of world.roads) {
      for (let i = 0; i < r.path.length - 1; i++) {
        const [ax, az] = r.path[i]
        const [bx, bz] = r.path[i + 1]
        out.push({ ax, az, bx, bz, len: Math.hypot(bx - ax, bz - az) })
      }
    }
    return out
  }, [])

  const dotsRef = useRef<THREE.Points>(null)
  const dotState = useMemo(() => {
    const rng = mulberry32(20260303)
    return Array.from({ length: DOT_COUNT }, () => ({
      seg: Math.floor(rng() * segs.length),
      t: rng(),
      speed: 4 + rng() * 4, // m/s，缓慢流动
    }))
  }, [segs])

  const dotGeo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(DOT_COUNT * 3), 3))
    return g
  }, [])

  useFrame((_, delta) => {
    const attr = dotsRef.current?.geometry.getAttribute('position') as THREE.BufferAttribute | undefined
    if (!attr) return
    for (let i = 0; i < DOT_COUNT; i++) {
      const d = dotState[i]
      const s = segs[d.seg]
      d.t = (d.t + (d.speed * delta) / s.len) % 1
      attr.setXYZ(i, s.ax + (s.bx - s.ax) * d.t, 0.35, s.az + (s.bz - s.az) * d.t)
    }
    attr.needsUpdate = true
  })

  return (
    <group>
      {geo && (
        <mesh geometry={geo}>
          <meshBasicMaterial vertexColors transparent opacity={0.9} />
        </mesh>
      )}
      <points ref={dotsRef} geometry={dotGeo}>
        <pointsMaterial
          color="#9fd8ff"
          size={2.4}
          sizeAttenuation
          transparent
          opacity={0.85}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  )
}
