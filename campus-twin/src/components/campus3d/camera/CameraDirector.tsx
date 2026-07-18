import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { Shot } from '../../../types'
import { buildingById } from '../../../data/world'
import { useCampusStore } from '../../../store/campusStore'

const POS = new THREE.Vector3()
const TARGET = new THREE.Vector3()

function desiredShot(shot: Shot | undefined, t: number, pos: THREE.Vector3, target: THREE.Vector3): void {
  if (shot?.kind === 'push') {
    const b = buildingById(shot.buildingId)
    if (b) {
      const h = b.floors * b.floorHeight
      target.set(b.position[0], h * 0.5, b.position[1])
      pos.set(b.position[0] + 75, h * 0.5 + 55, b.position[1] + 75) // 楼前约 120m
      return
    }
  }
  if (shot?.kind === 'topdown') {
    target.set(0, 0, 0)
    pos.set(1, 1100, 1)
    return
  }
  // overview：780m 东南 45° 俯视，呼吸浮动 ±6m/8s
  target.set(0, 0, 0)
  pos.set(452, 447 + Math.sin((t * Math.PI * 2) / 8) * 6, 452)
}

// 规格 §9.6：useFrame 中 damp 插值 position/target；用户拖拽打断，1.2s 后柔和回导演位
export function CameraDirector() {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as unknown as OrbitControlsImpl | null
  const shot = useCampusStore((s) => s.cameraShot)
  const selectBuilding = useCampusStore((s) => s.selectBuilding)
  const setCameraShot = useCampusStore((s) => s.setCameraShot)
  const dragging = useRef(false)
  const resumeAt = useRef(0)

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
        setCameraShot({ kind: 'overview' })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectBuilding, setCameraShot])

  useFrame((state, delta) => {
    if (!controls) return
    if (dragging.current) {
      resumeAt.current = state.clock.elapsedTime + 1.2
      return
    }
    if (state.clock.elapsedTime < resumeAt.current) return
    desiredShot(shot, state.clock.elapsedTime, POS, TARGET)
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
