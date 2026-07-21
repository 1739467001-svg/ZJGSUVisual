import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import type { BuildingSpec } from '../../../types'
import { useCampusStore, type CampusState } from '../../../store/campusStore'
import { deviceLabel } from '../../../lib/format'
import { extrudeOutline } from '../../../lib/outline'
import { roomWorldPos } from '../../../lib/roomPos'

type Drill = CampusState['drill']

// Lv2 楼层剖层 + Lv3 房间浮出（规格 §9.4）。expand 系数由 BuildingMesh 统一 damp
export function DrillSlabs({
  b,
  drill,
  sliceCount,
  expand,
}: {
  b: BuildingSpec
  drill: Drill
  sliceCount: number
  expand: React.MutableRefObject<number>
}) {
  const rooms = useCampusStore((s) => s.rooms)
  const groupRef = useRef<THREE.Group>(null)
  const roomRef = useRef<THREE.Mesh>(null)
  const lift = useRef(0)

  const hasOutline = !!b.outline?.length
  // v4：轮廓楼剖层 = 真实平面薄板（底面 y=0）；盒体楼 = 中心几何盒
  // 板厚 0.92×层高：展开过渡瞬间相邻板面不共面，消除 z-fighting 频闪
  const slabGeo = useMemo(
    () =>
      hasOutline
        ? extrudeOutline(b.outline!, b.position[0], b.position[1], b.floorHeight * 0.92)
        : new THREE.BoxGeometry(b.footprint[0], b.floorHeight * 0.92, b.footprint[1]),
    [hasOutline, b.outline, b.position, b.footprint, b.floorHeight],
  )
  const slabEdges = useMemo(() => new THREE.EdgesGeometry(slabGeo), [slabGeo])
  const slabMats = useMemo(
    () =>
      Array.from(
        { length: sliceCount },
        () => new THREE.MeshStandardMaterial({ color: '#4a6fa5', roughness: 0.5, transparent: true }),
      ),
    [sliceCount],
  )

  const room = drill.roomId ? rooms.find((r) => r.id === drill.roomId) : undefined
  // v4：房间内点来自 roomWorldPos（真实轮廓内的 2×4 槽位），转楼局部坐标
  const roomLocal = useMemo(() => {
    if (!room) return { x: 0, z: 0 }
    const [wx, , wz] = roomWorldPos(b, room)
    return { x: wx - b.position[0], z: wz - b.position[1] }
  }, [room, b])

  useFrame((_, delta) => {
    const e = expand.current
    const g = groupRef.current
    if (g) {
      g.visible = e > 1.02
      g.children.forEach((slab, i) => {
        // 轮廓薄板底面在 y=0；盒体板为中心几何需抬半高
        slab.position.y = i * b.floorHeight * e + (hasOutline ? 0 : b.floorHeight / 2)
      })
    }
    // Lv3：房间方块从楼层中抬出
    lift.current = THREE.MathUtils.damp(lift.current, drill.level >= 3 && room ? 1 : 0, 3, delta)
    const rm = roomRef.current
    if (rm && room) {
      rm.visible = lift.current > 0.02
      rm.position.set(
        roomLocal.x * (1 + 0.35 * lift.current),
        (room.floor - 1) * b.floorHeight * e + b.floorHeight / 2 + lift.current * b.floorHeight * 0.9,
        roomLocal.z * (1 + 0.35 * lift.current),
      )
    }
  })

  return (
    <>
      <group ref={groupRef} visible={false}>
        {Array.from({ length: sliceCount }, (_, i) => (
          <group key={i}>
            <mesh
              geometry={slabGeo}
              material={slabMats[i]}
              material-opacity={drill.floor !== undefined && drill.level >= 2 && i + 1 !== drill.floor ? 0.25 : 0.95}
            />
            <lineSegments geometry={slabEdges}>
              <lineBasicMaterial color="#7fb2e5" transparent opacity={0.35} />
            </lineSegments>
          </group>
        ))}
      </group>
      {room && (
        <mesh ref={roomRef} visible={false}>
          <boxGeometry args={[b.footprint[0] * 0.16, b.floorHeight * 0.55, b.footprint[1] * 0.3]} />
          <meshBasicMaterial color="#f5c542" toneMapped={false} />
          <Html position={[0, b.floorHeight * 0.8 + 2, 0]} center zIndexRange={[30, 0]}>
            <div className="pointer-events-none whitespace-nowrap rounded-md border border-gold/40 bg-ink/90 px-2.5 py-1.5 text-[11px] leading-4 text-slate-200">
              <span className="font-semibold text-gold">{room.name}</span> · {room.capacity}人 ·{' '}
              {room.equipment.map(deviceLabel).join('/')} ·{' '}
              {room.status === 'free' ? '空闲' : room.status === 'busy' ? '占用' : '报修中'}
            </div>
          </Html>
        </mesh>
      )}
    </>
  )
}
