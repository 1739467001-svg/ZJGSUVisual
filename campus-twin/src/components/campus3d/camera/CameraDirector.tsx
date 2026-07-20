import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { Shot } from '../../../types'
import { buildingById, worldCenter } from '../../../data/world'
import { rooms } from '../../../data/seedRooms'
import { roomWorldPos } from '../../../lib/roomPos'
import { buildRouteCurve } from '../../../lib/routeCurve'
import { useCampusStore } from '../../../store/campusStore'

const POS = new THREE.Vector3()
const TARGET = new THREE.Vector3()
const PT = new THREE.Vector3()
const TAN = new THREE.Vector3()

// 规格 §9.6：useFrame 中 damp 插值 position/target；用户拖拽打断，1.2s 后柔和回导演位
export function CameraDirector() {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as unknown as OrbitControlsImpl | null
  const shot = useCampusStore((s) => s.cameraShot)
  const selectBuilding = useCampusStore((s) => s.selectBuilding)
  const setDrill = useCampusStore((s) => s.setDrill)
  const dragging = useRef(false)
  const resumeAt = useRef(0)
  const followStart = useRef<number | null>(null)
  const followCurve = useRef<THREE.CurvePath<THREE.Vector3> | null>(null)

  useEffect(() => {
    followStart.current = null
    followCurve.current = shot?.kind === 'follow' ? buildRouteCurve(shot.route.waypoints) : null
  }, [shot])

  useEffect(() => {
    if (!controls) return
    const onStart = () => {
      dragging.current = true
    }
    const onEnd = () => {
      dragging.current = false
    }
    controls.addEventListener('start', onStart)
    controls.addEventListener('end', onEnd)
    return () => {
      controls.removeEventListener('start', onStart)
      controls.removeEventListener('end', onEnd)
    }
  }, [controls])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        selectBuilding(undefined)
        setDrill({ level: 0 })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectBuilding, setDrill])

  useFrame((state, delta) => {
    if (!controls) return
    if (dragging.current) {
      resumeAt.current = state.clock.elapsedTime + 1.2
      return
    }
    if (state.clock.elapsedTime < resumeAt.current) return
    desiredShot(shot, state.clock.elapsedTime, followStart, followCurve.current)
    const lambda = 2.2
    camera.position.x = THREE.MathUtils.damp(camera.position.x, POS.x, lambda, delta)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, POS.y, lambda, delta)
    camera.position.z = THREE.MathUtils.damp(camera.position.z, POS.z, lambda, delta)
    controls.target.x = THREE.MathUtils.damp(controls.target.x, TARGET.x, lambda, delta)
    controls.target.y = THREE.MathUtils.damp(controls.target.y, TARGET.y, lambda, delta)
    controls.target.z = THREE.MathUtils.damp(controls.target.z, TARGET.z, lambda, delta)
    controls.update()
  })

  return null
}

function desiredShot(
  shot: Shot | undefined,
  t: number,
  followStart: React.MutableRefObject<number | null>,
  curve: THREE.CurvePath<THREE.Vector3> | null,
): void {
  if (shot?.kind === 'push') {
    const b = buildingById(shot.buildingId)
    if (b) {
      const h = b.floors * b.floorHeight
      // 距离随楼宇尺度缩放：大盘楼（图书馆 150m）推到 200m+，小楼约 120m
      const d = Math.max(140, Math.max(b.footprint[0], b.footprint[1]) * 1.5)
      TARGET.set(b.position[0], h * 0.5, b.position[1])
      POS.set(b.position[0] + d * 0.62, h * 0.5 + d * 0.42, b.position[1] + d * 0.62)
      return
    }
  }
  if (shot?.kind === 'orbit') {
    const b = buildingById(shot.buildingId)
    if (b) {
      const h = b.floors * b.floorHeight
      const r = Math.max(150, Math.max(b.footprint[0], b.footprint[1]) * 1.35)
      const a = (t * Math.PI * 2) / 20 // 20s 一圈缓慢环绕
      TARGET.set(b.position[0], h * 0.5, b.position[1])
      POS.set(b.position[0] + Math.cos(a) * r, h * 0.5 + r * 0.55, b.position[1] + Math.sin(a) * r)
      return
    }
  }
  if (shot?.kind === 'room') {
    const room = rooms.find((r) => r.id === shot.roomId)
    const b = room ? buildingById(room.buildingId) : undefined
    if (room && b) {
      const [x, y, z] = roomWorldPos(b, room, 1.8, true)
      TARGET.set(x, y, z)
      POS.set(x + 26, y + 20, z + 26)
      return
    }
  }
  if (shot?.kind === 'follow' && curve) {
    if (followStart.current === null) followStart.current = t
    const p = THREE.MathUtils.clamp((t - followStart.current) / (shot.ms / 1000), 0, 1)
    if (p >= 1 && shot.route.to.kind === 'building') {
      // 跟拍结束停在终点楼 push 位
      desiredShot({ kind: 'push', buildingId: shot.route.to.id, ms: 1200 }, t, followStart, curve)
      return
    }
    curve.getPointAt(p, PT)
    curve.getTangentAt(p, TAN)
    TARGET.copy(PT).addScaledVector(TAN, 25)
    POS.copy(PT).addScaledVector(TAN, -35)
    POS.y = 28
    return
  }
  if (shot?.kind === 'topdown') {
    TARGET.set(worldCenter[0], 0, worldCenter[1])
    POS.set(worldCenter[0] + 1, 1300, worldCenter[1] + 1)
    return
  }
  // overview：场景中心东南 45° 俯视（v4 随 OSM bounds 定锚），呼吸浮动 ±6m/8s
  TARGET.set(worldCenter[0], 0, worldCenter[1])
  POS.set(worldCenter[0] + 620, 500 + Math.sin((t * Math.PI * 2) / 8) * 6, worldCenter[1] + 620)
}
