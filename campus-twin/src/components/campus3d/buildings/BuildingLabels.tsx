import { Html } from '@react-three/drei'
import { world } from '../../../data/world'
import { useCampusStore } from '../../../store/campusStore'

// 悬浮牌（规格 §9.3）：landmark 楼 + 选中楼，上限 12 个
export function BuildingLabels({ occupancy }: { occupancy: Map<string, number> }) {
  const selectedBuildingId = useCampusStore((s) => s.selectedBuildingId)
  const shown = world.buildings.filter((b) => b.landmark || b.id === selectedBuildingId).slice(0, 12)

  return (
    <>
      {shown.map((b) => (
        <Html
          key={b.id}
          position={[b.position[0], b.floors * b.floorHeight + 9, b.position[1]]}
          center
          zIndexRange={[20, 0]}
        >
          <div className="pointer-events-none whitespace-nowrap rounded-md border border-white/10 bg-ink/80 px-2 py-1 text-[11px] text-slate-200 backdrop-blur-sm">
            {b.name}
            <span className="ml-1.5 tabular-nums text-brand-light">
              {Math.round((occupancy.get(b.id) ?? 0) * 100)}%
            </span>
          </div>
        </Html>
      ))}
    </>
  )
}
