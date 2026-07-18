import { useMemo } from 'react'
import * as THREE from 'three'
import type { BuildingKind, BuildingSpec } from '../../../types'
import { useCampusStore } from '../../../store/campusStore'
import { StatusLightBand } from './StatusLightBand'

// 按 kind 着色基色（规格 §9.3）
const KIND_COLOR: Record<BuildingKind, string> = {
  library: '#3d7ea6',
  admin: '#4a6fa5',
  teaching: '#3a5f8a',
  faculty: '#35618c',
  canteen: '#4f7a6a',
  venue: '#5a6f9a',
  sports: '#5a6f9a',
  dorm: '#5a6f9a',
}

export function BuildingMesh({ b, occupancy }: { b: BuildingSpec; occupancy: number }) {
  const selectBuilding = useCampusStore((s) => s.selectBuilding)
  const setCameraShot = useCampusStore((s) => s.setCameraShot)
  const h = b.floors * b.floorHeight
  const geo = useMemo(() => new THREE.BoxGeometry(b.footprint[0], h, b.footprint[1]), [b.footprint, h])
  const edges = useMemo(() => new THREE.EdgesGeometry(geo), [geo])

  return (
    <group position={[b.position[0], 0, b.position[1]]}>
      <mesh
        geometry={geo}
        position={[0, h / 2, 0]}
        onClick={(e) => {
          e.stopPropagation()
          selectBuilding(b.id)
          setCameraShot({ kind: 'push', buildingId: b.id, ms: 1400 })
        }}
      >
        <meshPhysicalMaterial color={KIND_COLOR[b.kind]} transmission={0.35} roughness={0.25} thickness={2} />
      </mesh>
      {/* 描边线框（规格 §9.3：#7fb2e5 opacity 0.5） */}
      <lineSegments geometry={edges} position={[0, h / 2, 0]}>
        <lineBasicMaterial color="#7fb2e5" transparent opacity={0.5} />
      </lineSegments>
      <StatusLightBand b={b} height={h} occupancy={occupancy} />
    </group>
  )
}
