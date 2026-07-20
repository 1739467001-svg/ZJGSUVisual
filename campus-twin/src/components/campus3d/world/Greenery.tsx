import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { world } from '../../../data/world'
import { mulberry32, chance, randInt } from '../../../lib/rng'
import { pointInOutline } from '../../../lib/outline'

// 树阵（规格 §9.2）：~600 棵低多边形锥形树，种子固定
// v4：避让真实建筑轮廓（含配楼）与水体；40% 撒进 OSM 绿地块内，其余沿路两侧
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
    const lakes = world.water.filter((w) => w.kind === 'lake')
    const rivers = world.water.filter((w) => w.kind === 'river')
    const buildingOutlines = world.buildings.map((b) => b.outline).filter((o): o is [number, number][] => !!o?.length)
    const contextOutlines = world.contextBuildings.map((c) => c.outline)

    const usable = (x: number, z: number): boolean => {
      for (const o of buildingOutlines) if (pointInOutline(x, z, o)) return false
      for (const o of contextOutlines) if (pointInOutline(x, z, o)) return false
      // 无轮廓盒体楼按矩形避让
      for (const b of world.buildings) {
        if (b.outline?.length) continue
        if (Math.abs(x - b.position[0]) < b.footprint[0] / 2 + 8 && Math.abs(z - b.position[1]) < b.footprint[1] / 2 + 8) return false
      }
      for (const l of lakes) if (pointInOutline(x, z, l.outline)) return false
      for (const r of rivers) {
        for (let i = 0; i < r.path.length - 1; i++) {
          if (distToSeg(x, z, r.path[i][0], r.path[i][1], r.path[i + 1][0], r.path[i + 1][1]) < 10) return false
        }
      }
      return true
    }

    // 40% 撒进 OSM 绿地块
    const greenTarget = Math.floor(TARGET * 0.4)
    let guard = greenTarget * 30
    while (out.length < greenTarget && guard-- > 0) {
      const g = world.greenery[randInt(rng, 0, world.greenery.length - 1)]
      if (!g) break
      let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity
      for (const [x, z] of g.outline) {
        x0 = Math.min(x0, x); x1 = Math.max(x1, x)
        z0 = Math.min(z0, z); z1 = Math.max(z1, z)
      }
      const x = x0 + rng() * (x1 - x0)
      const z = z0 + rng() * (z1 - z0)
      if (pointInOutline(x, z, g.outline) && usable(x, z)) out.push([x, z])
    }

    // 其余沿路两侧（候选先收齐再随机取，避免前几条路占满配额）
    const candidates: [number, number][] = []
    for (const r of world.roads) {
      for (let i = 0; i < r.path.length - 1; i++) {
        const [ax, az] = r.path[i]
        const [bx, bz] = r.path[i + 1]
        const len = Math.hypot(bx - ax, bz - az)
        if (len < 8) continue
        const nx = -(bz - az) / len
        const nz = (bx - ax) / len
        for (let d = 0; d < len; d += 24) {
          if (!chance(rng, 0.5)) continue
          const side = chance(rng, 0.5) ? 1 : -1
          const off = r.width / 2 + randInt(rng, 4, 14)
          candidates.push([ax + ((bx - ax) * d) / len + nx * off * side, az + ((bz - az) * d) / len + nz * off * side])
        }
      }
    }
    // Fisher–Yates 洗牌（用固定种子保持确定性）
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      ;[candidates[i], candidates[j]] = [candidates[j], candidates[i]]
    }
    for (const [x, z] of candidates) {
      if (out.length >= TARGET) break
      if (usable(x, z)) out.push([x, z])
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
