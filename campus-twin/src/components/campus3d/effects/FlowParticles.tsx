import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { world } from '../../../data/world'
import { mulberry32 } from '../../../lib/rng'
import { liveFx } from '../liveFx'
import { useCampusStore } from '../../../store/campusStore'

// 环境人流粒子（规格 §9.2 路网光点的加强版）：沿路网循环流动，
// 密度基础 400（低画质 200），热力模式 ×3、上限 1200（规格 §9.7）
const POOL = 1200

interface Particle {
  roadId: string
  ax: number
  az: number
  bx: number
  bz: number
  len: number
  t: number
  speed: number
}

export function FlowParticles() {
  const quality = useCampusStore((s) => s.quality)
  const ref = useRef<THREE.Points>(null)

  const particles = useMemo<Particle[]>(() => {
    const rng = mulberry32(20260303)
    const segs: { roadId: string; ax: number; az: number; bx: number; bz: number; len: number }[] = []
    for (const r of world.roads) {
      for (let i = 0; i < r.path.length - 1; i++) {
        const [ax, az] = r.path[i]
        const [bx, bz] = r.path[i + 1]
        segs.push({ roadId: r.id, ax, az, bx, bz, len: Math.hypot(bx - ax, bz - az) })
      }
    }
    const total = segs.reduce((a, s) => a + s.len, 0)
    return Array.from({ length: POOL }, () => {
      // 按段长度加权抽样
      let pick = rng() * total
      let seg = segs[0]
      for (const s of segs) {
        pick -= s.len
        if (pick <= 0) {
          seg = s
          break
        }
      }
      const off = (rng() - 0.5) * 6
      const nx = (-(seg.bz - seg.az) / seg.len) * off
      const nz = ((seg.bx - seg.ax) / seg.len) * off
      return { ...seg, ax: seg.ax + nx, az: seg.az + nz, bx: seg.bx + nx, bz: seg.bz + nz, t: rng(), speed: 3 + rng() * 4 }
    })
  }, [])

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(POOL * 3), 3))
    return g
  }, [])

  useFrame((_, delta) => {
    const points = ref.current
    if (!points) return
    // Wow#7 下课潮汐：ClockBridge 置 tide=1，这里 90s 衰减；密度脉冲 + 高速汇流
    liveFx.tide = Math.max(0, liveFx.tide - delta / 90)
    const tide = liveFx.tide
    const base = quality === 'low' ? 200 : 400
    const active = Math.min(POOL, Math.round(base * (1 + 2 * liveFx.heat) + 500 * tide))
    const attr = points.geometry.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < active; i++) {
      const p = particles[i]
      // 常流即按 traffic 权重调速；下课时整体提速汇向食堂/图书馆方向
      const w = liveFx.traffic[p.roadId] ?? 0.15
      const speed = p.speed * (0.5 + 1.5 * w) * (1 + 1.5 * tide)
      p.t = (p.t + (speed * delta) / p.len) % 1
      attr.setXYZ(i, p.ax + (p.bx - p.ax) * p.t, 1.1, p.az + (p.bz - p.az) * p.t)
    }
    attr.needsUpdate = true
    points.geometry.setDrawRange(0, active)
  })

  return (
    <points ref={ref} geometry={geo} frustumCulled={false}>
      <pointsMaterial color="#cfe6ff" size={1.7} sizeAttenuation transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  )
}
