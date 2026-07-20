import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import type { BuildingKind, BuildingSpec } from '../../../types'
import { useCampusStore, type CampusState } from '../../../store/campusStore'
import { liveFx } from '../liveFx'
import { introScale } from './intro'
import { StatusLightBand } from './StatusLightBand'
import { DrillSlabs } from './DrillSlabs'

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

type Drill = CampusState['drill']

export function BuildingMesh({ b, occupancy, drill }: { b: BuildingSpec; occupancy: number; drill: Drill }) {
  const selectBuilding = useCampusStore((s) => s.selectBuilding)
  const setDrill = useCampusStore((s) => s.setDrill)
  const h = b.floors * b.floorHeight
  // 图书馆 floors=6 含地下 1 层，剖层按地上 5 层（规格 §9.4 注）
  const sliceCount = b.id === 'lib' ? 5 : b.floors

  const geo = useMemo(() => new THREE.BoxGeometry(b.footprint[0], h, b.footprint[1]), [b.footprint, h])
  const edges = useMemo(() => new THREE.EdgesGeometry(geo), [geo])
  const baseColor = useMemo(() => new THREE.Color(KIND_COLOR[b.kind]), [b.kind])

  const groupRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const edgesRef = useRef<THREE.LineSegments>(null)
  const matRef = useRef<THREE.MeshPhysicalMaterial>(null)
  const edgesMatRef = useRef<THREE.LineBasicMaterial>(null)
  const bandWrapRef = useRef<THREE.Group>(null)
  const opacity = useRef(1)
  const expand = useRef(1)

  const isTarget = drill.buildingId === b.id && drill.level >= 1
  const isDimmed = drill.level >= 1 && !isTarget
  const slabMode = isTarget && drill.level >= 2

  useFrame((state, delta) => {
    const g = groupRef.current
    const mesh = meshRef.current
    const mat = matRef.current
    if (!g || !mesh || !mat) return
    // Lv1 抬升 +12m；其余楼降透明 0.15（规格 §9.4）
    g.position.y = THREE.MathUtils.damp(g.position.y, isTarget ? 12 : 0, 3, delta)
    opacity.current = THREE.MathUtils.damp(opacity.current, isDimmed ? 0.15 : 1, 4, delta)
    // 首屏唤醒：错峰弹起（直接驱动，不 damp）；结束后 Wow#5 热力楼高接管
    const intro = introScale(b.id, state.clock.elapsedTime)
    const metric = liveFx.heatMetric.get(b.id) ?? 0
    const scaleY =
      intro < 1 ? intro : THREE.MathUtils.damp(mesh.scale.y, 1 + liveFx.heat * 0.6 * metric, 3, delta)
    mesh.scale.y = scaleY
    mesh.position.y = (h * scaleY) / 2
    if (edgesRef.current) {
      edgesRef.current.scale.y = scaleY
      edgesRef.current.position.y = mesh.position.y
    }
    // Wow#2 扫描：全场降亮，候选楼豁免
    const dim = liveFx.scanKeep.has(b.id) ? 0 : liveFx.scanDim
    mat.color.copy(baseColor).multiplyScalar((1 - dim) * opacity.current)
    // 剖层：展开系数 1→1.8，展开后隐藏实心楼体
    expand.current = THREE.MathUtils.damp(expand.current, slabMode ? 1.8 : 1, 3, delta)
    mesh.visible = expand.current < 1.05
    if (edgesRef.current) edgesRef.current.visible = mesh.visible
    // 光带跟随：剖层时贴最顶层板
    if (bandWrapRef.current) {
      bandWrapRef.current.position.y = slabMode
        ? (sliceCount - 1) * b.floorHeight * expand.current + b.floorHeight + 0.2
        : h * scaleY + 0.2
    }
  })

  return (
    <group ref={groupRef} position={[b.position[0], 0, b.position[1]]}>
      <mesh
        ref={meshRef}
        geometry={geo}
        position={[0, h / 2, 0]}
        onClick={(e) => {
          e.stopPropagation()
          selectBuilding(b.id)
          setDrill({ level: 1, buildingId: b.id })
        }}
        onDoubleClick={(e) => {
          e.stopPropagation()
          selectBuilding(b.id)
          // 双击直接进 Lv2 楼层剖层（规格 §9.4）
          setDrill({ level: 2, buildingId: b.id })
        }}
      >
        <meshPhysicalMaterial
          ref={matRef}
          color={KIND_COLOR[b.kind]}
          transmission={0.35}
          roughness={0.25}
          thickness={2}
          transparent
        />
      </mesh>
      {/* 描边线框（规格 §9.3：#7fb2e5 opacity 0.5） */}
      <lineSegments ref={edgesRef} geometry={edges} position={[0, h / 2, 0]}>
        <lineBasicMaterial ref={edgesMatRef} color="#7fb2e5" transparent opacity={0.5} />
      </lineSegments>
      <group ref={bandWrapRef} position={[0, h + 0.2, 0]}>
        <StatusLightBand b={b} occupancy={occupancy} dimmed={isDimmed} />
      </group>
      {isTarget && <DrillSlabs b={b} drill={drill} sliceCount={sliceCount} expand={expand} />}
    </group>
  )
}
