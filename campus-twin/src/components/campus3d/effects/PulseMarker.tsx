import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { AlertTriangle } from 'lucide-react'
import { buildingById } from '../../../data/world'
import { roomWorldPos } from '../../../lib/roomPos'
import { useCampusStore } from '../../../store/campusStore'

// Wow#4 异常脉冲（链路二）：repairDraft 出现 → 钻取到故障房间 →
// 红色扩散环（半径 6→18m、1s 循环）钉在房间位置 + 告警图标浮起。工单闭环后停止
export function PulseMarker() {
  const nonce = useCampusStore((s) => s.sceneNonce)
  const draft = useCampusStore((s) => s.repairDraft)
  const tickets = useCampusStore((s) => s.tickets)
  const rooms = useCampusStore((s) => s.rooms)
  const setDrill = useCampusStore((s) => s.setDrill)
  const ringRef = useRef<THREE.Mesh>(null)
  const matRef = useRef<THREE.MeshBasicMaterial>(null)
  const first = useRef(true)

  const room = draft?.roomId ? rooms.find((r) => r.id === draft.roomId) : undefined
  const building = room ? buildingById(room.buildingId) : undefined

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    if (room && building) {
      setDrill({ level: 3, buildingId: building.id, floor: room.floor, roomId: room.id })
    }
    // nonce 驱动触发；room/building 派生自 draft
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce])

  // 脉冲存续：表单打开中，或该房间存在未闭环工单
  const active = !!room && (!!draft || tickets.some((t) => t.roomId === room.id && t.status !== 'done'))
  if (!active || !room || !building) return null
  const pos = roomWorldPos(building, room, 1.8, true)

  return (
    <group position={pos}>
      <mesh ref={ringRef} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.85, 1, 48]} />
        <meshBasicMaterial ref={matRef} color="#ef4444" transparent side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
      <PulseAnimator ringRef={ringRef} matRef={matRef} />
      <Html position={[0, 9, 0]} center zIndexRange={[30, 0]}>
        <div className="flex h-7 w-7 animate-bounce items-center justify-center rounded-full bg-danger text-white shadow-lg">
          <AlertTriangle size={15} />
        </div>
      </Html>
    </group>
  )
}

function PulseAnimator({
  ringRef,
  matRef,
}: {
  ringRef: React.RefObject<THREE.Mesh | null>
  matRef: React.RefObject<THREE.MeshBasicMaterial | null>
}) {
  useFrame(({ clock }) => {
    const frac = clock.elapsedTime % 1
    const r = 6 + 12 * frac
    ringRef.current?.scale.set(r, r, 1)
    if (matRef.current) matRef.current.opacity = 0.85 * (1 - frac)
  })
  return null
}
