import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { world } from '../../../data/world'
import { useCampusStore } from '../../../store/campusStore'
import { useOccupancyMap } from '../useOccupancy'
import { energyMetrics, heatColor, heatHeightScale } from '../../../lib/heatMath'
import { buildingTrafficWeights } from '../../../sim/traffic'
import { liveFx } from '../liveFx'

// Wow#5 热力爆发（链路三）：镜头拉高 1100m 俯视 → 楼宇按热力指标升起（楼体缩放
// 在 BuildingMesh 内 damp）→ 楼顶贴合半透明热力浮层（绿→黄→红）→ 人流粒子加密 ×3
export function HeatLayer() {
  const sceneMode = useCampusStore((s) => s.sceneMode)
  const heatMode = useCampusStore((s) => s.heatMode)
  const nonce = useCampusStore((s) => s.sceneNonce)
  const setCameraShot = useCampusStore((s) => s.setCameraShot)
  const occupancy = useOccupancyMap()
  const quadRef = useRef<THREE.InstancedMesh>(null)
  const first = useRef(true)

  const active = sceneMode === 'overview' || heatMode === 'energy' || heatMode === 'traffic'
  const nowMinute = useCampusStore((s) => s.clock.virtualTs)

  // 指标：occupancy 直用 snapshot；energy 归一化估算；traffic 取 TrafficModel 楼宇最近道路权重
  const metrics = useMemo(() => {
    if (heatMode === 'energy') return energyMetrics(world, occupancy)
    if (heatMode === 'traffic') return buildingTrafficWeights(world, new Date(nowMinute))
    return occupancy
  }, [heatMode, occupancy, nowMinute])
  useEffect(() => {
    liveFx.heatMetric = metrics
  }, [metrics])
  useEffect(() => {
    liveFx.heatTarget = active ? 1 : 0
  }, [active])

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    if (sceneMode === 'overview') setCameraShot({ kind: 'topdown', ms: 1500 })
  }, [nonce, sceneMode, setCameraShot])

  useLayoutEffect(() => {
    const mesh = quadRef.current
    if (!mesh) return
    const dummy = new THREE.Object3D()
    world.buildings.forEach((b, i) => {
      dummy.position.set(b.position[0], 0, b.position[1])
      dummy.scale.set(b.footprint[0] * 1.1, 1, b.footprint[1] * 1.1)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  }, [])

  useFrame((_, delta) => {
    liveFx.heat = THREE.MathUtils.damp(liveFx.heat, liveFx.heatTarget, 2, delta)
    const mesh = quadRef.current
    if (!mesh) return
    mesh.visible = liveFx.heat > 0.02
    if (!mesh.visible) return
    const dummy = new THREE.Object3D()
    const color = new THREE.Color()
    world.buildings.forEach((b, i) => {
      const m = liveFx.heatMetric.get(b.id) ?? 0
      const h = b.floors * b.floorHeight * heatHeightScale(m * liveFx.heat)
      dummy.position.set(b.position[0], h + 0.7, b.position[1])
      dummy.scale.set(b.footprint[0] * 1.1, 1, b.footprint[1] * 1.1)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      mesh.setColorAt(i, color.set(heatColor(m)).multiplyScalar(liveFx.heat * 0.85))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  })

  return (
    <instancedMesh ref={quadRef} args={[undefined, undefined, world.buildings.length]} visible={false}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </instancedMesh>
  )
}
