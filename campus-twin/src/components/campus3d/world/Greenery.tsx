import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { world } from '../../../data/world'
import { mulberry32, chance, randInt } from '../../../lib/rng'

// 树阵（规格 §9.2）：~600 棵低多边形锥形树，沿道路与广场边缘伪随机分布，种子固定
const TARGET = 600
const TREE_COLORS = ['#1e4634', '#265840', '#2c5f46', '#1a3d2e']

function distToSeg(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax
  const dz = bz - az
  const len2 = dx * dx + dz * dz
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / len2))
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t))
}

export function Greenery() {
  const ref = useRef<THREE.InstancedMesh>(null)

  const spots = useMemo(() => {
    const rng = mulberry32(42)
    const out: [number, number][] = []
    const lake = world.water.find((w) => w.kind === 'lake')
    const river = world.water.find((w) => w.kind === 'river')

    const usable = (x: number, z: number): boolean => {
      for (const b of world.buildings) {
        if (Math.abs(x - b.position[0]) < b.footprint[0] / 2 + 8 && Math.abs(z - b.position[1]) < b.footprint[1] / 2 + 8) return false
      }
      if (lake && lake.kind === 'lake') {
        const ex = (x - lake.center[0]) / (lake.radius[0] + 8)
        const ez = (z - lake.center[1]) / (lake.radius[1] + 8)
        if (ex * ex + ez * ez < 1) return false
      }
      if (river && river.kind === 'river') {
        for (let i = 0; i < river.path.length - 1; i++) {
          if (distToSeg(x, z, river.path[i][0], river.path[i][1], river.path[i + 1][0], river.path[i + 1][1]) < 14) return false
        }
      }
      return true
    }

    // 沿路两侧
    for (const r of world.roads) {
      for (let i = 0; i < r.path.length - 1; i++) {
        const [ax, az] = r.path[i]
        const [bx, bz] = r.path[i + 1]
        const len = Math.hypot(bx - ax, bz - az)
        const nx = (-(bz - az) / len)
        const nz = (bx - ax) / len
        for (let d = 0; d < len; d += 16) {
          if (!chance(rng, 0.6)) continue
          const side = chance(rng, 0.5) ? 1 : -1
          const off = r.width / 2 + randInt(rng, 5, 16)
          const x = ax + ((bx - ax) * d) / len + nx * off * side
          const z = az + ((bz - az) * d) / len + nz * off * side
          if (usable(x, z)) out.push([x, z])
          if (out.length >= TARGET) return out
        }
      }
    }
    // 广场边缘补齐
    for (const p of world.plazas) {
      for (let i = 0; i < 14 && out.length < TARGET; i++) {
        const edge = randInt(rng, 0, 3)
        const x = p.center[0] + (edge === 0 ? -p.size[0] / 2 - 6 : edge === 1 ? p.size[0] / 2 + 6 : (rng() - 0.5) * p.size[0])
        const z = p.center[1] + (edge === 2 ? -p.size[1] / 2 - 6 : edge === 3 ? p.size[1] / 2 + 6 : (rng() - 0.5) * p.size[1])
        if (usable(x, z)) out.push([x, z])
      }
    }
    return out
  }, [])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const dummy = new THREE.Object3D()
    const rng = mulberry32(7)
    const color = new THREE.Color()
    spots.forEach(([x, z], i) => {
      const s = 0.8 + rng() * 0.6
      dummy.position.set(x, (7 * s) / 2, z)
      dummy.scale.setScalar(s)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      mesh.setColorAt(i, color.set(TREE_COLORS[Math.floor(rng() * TREE_COLORS.length)]))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [spots])

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, spots.length]} key={spots.length}>
      <coneGeometry args={[2.4, 7, 5]} />
      <meshStandardMaterial roughness={1} />
    </instancedMesh>
  )
}
