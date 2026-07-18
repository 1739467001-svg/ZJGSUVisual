import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useCampusStore } from '../../../store/campusStore'
import { liveFx } from '../liveFx'

// Wow#2 扫描命中（链路一）：全场降亮 40% → 扫描光 1.2s 自西向东掠场
// → 候选楼依次点亮金光（间隔 200ms）→ 镜头 1.4s 推到最近候选楼
const SWEEP_START = 0.3
const SWEEP_END = 1.5
const DIM_RELEASE = 2.1

export function ScanBeam() {
  const nonce = useCampusStore((s) => s.sceneNonce)
  const setCameraShot = useCampusStore((s) => s.setCameraShot)
  const beamRef = useRef<THREE.Mesh>(null)
  const playing = useRef(false)
  const t0 = useRef(0)
  const pending = useRef<{ buildingIds: string[]; goldDone: boolean; pushed: boolean }>({
    buildingIds: [],
    goldDone: false,
    pushed: false,
  })
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const s = useCampusStore.getState()
    if (s.sceneMode !== 'searching') return
    const buildingIds = [
      ...new Set(
        (s.candidates ?? [])
          .map((c) => s.rooms.find((r) => r.id === c.roomId)?.buildingId)
          .filter((x): x is string => !!x),
      ),
    ]
    liveFx.scanKeep = new Set(buildingIds)
    liveFx.goldUntil.clear()
    pending.current = { buildingIds, goldDone: false, pushed: false }
    playing.current = true
    t0.current = -1
  }, [nonce])

  useFrame(({ clock }, delta) => {
    if (!playing.current) return
    const beam = beamRef.current
    if (t0.current < 0) t0.current = clock.elapsedTime
    const t = clock.elapsedTime - t0.current

    // 降亮：0→0.4 淡入，1.9s 后释放
    const up = THREE.MathUtils.clamp(t / SWEEP_START, 0, 1)
    const down = THREE.MathUtils.clamp((t - DIM_RELEASE) / 0.6, 0, 1)
    liveFx.scanDim = 0.4 * up * (1 - down)

    // 扫描光掠场
    if (beam) {
      const p = THREE.MathUtils.clamp((t - SWEEP_START) / (SWEEP_END - SWEEP_START), 0, 1)
      beam.visible = t >= SWEEP_START && t <= SWEEP_END + 0.1
      beam.position.x = THREE.MathUtils.lerp(-560, 560, p)
    }

    // 候选楼依次金光点亮
    const { buildingIds } = pending.current
    if (!pending.current.goldDone && t >= SWEEP_END) {
      buildingIds.forEach((id, i) => liveFx.goldUntil.set(id, clock.elapsedTime + 0.2 * i + 1.2))
      pending.current.goldDone = true
    }
    // 镜头推到最近候选楼
    if (pending.current.goldDone && !pending.current.pushed && t >= SWEEP_END + 0.2 * buildingIds.length + 0.4) {
      pending.current.pushed = true
      if (buildingIds.length) setCameraShot({ kind: 'push', buildingId: buildingIds[0], ms: 1400 })
    }
    if (t > DIM_RELEASE + 0.8) {
      playing.current = false
      liveFx.scanDim = 0
      liveFx.scanKeep.clear()
      if (beam) beam.visible = false
    }
    void delta
  })

  return (
    <mesh ref={beamRef} visible={false} position={[0, 130, 0]} rotation-y={Math.PI / 2}>
      <planeGeometry args={[1200, 260]} />
      <meshBasicMaterial
        color="#38bdf8"
        transparent
        opacity={0.22}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}
