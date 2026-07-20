import { buildingById } from '../../data/world'
import { drillToLevel } from '../../lib/drill'
import { useCampusStore } from '../../store/campusStore'

// 沙盘面包屑（规格 §9.4）：校园 / 楼名 / xF / 房间号，逐级可点返回；Lv0 隐藏
export function Breadcrumb() {
  const drill = useCampusStore((s) => s.drill)
  const rooms = useCampusStore((s) => s.rooms)
  const setDrill = useCampusStore((s) => s.setDrill)
  if (drill.level === 0) return null

  const b = drill.buildingId ? buildingById(drill.buildingId) : undefined
  const room = drill.roomId ? rooms.find((r) => r.id === drill.roomId) : undefined
  const crumbs: { label: string; level: 0 | 1 | 2 }[] = [{ label: '校园', level: 0 }]
  if (b) crumbs.push({ label: b.name, level: 1 })
  if (drill.floor !== undefined) crumbs.push({ label: `${drill.floor}F`, level: 2 })

  return (
    <div className="absolute left-4 top-4 z-10 flex items-center gap-1.5 rounded-md border border-white/10 bg-ink/85 px-2.5 py-1.5 text-[11px] backdrop-blur-sm">
      {crumbs.map((c, i) => (
        <span key={c.level} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-slate-600">/</span>}
          <button
            type="button"
            onClick={() => setDrill(drillToLevel(drill, c.level))}
            className="text-slate-300 transition-colors hover:text-brand-light"
          >
            {c.label}
          </button>
        </span>
      ))}
      {room && (
        <span className="flex items-center gap-1.5">
          <span className="text-slate-600">/</span>
          <span className="text-gold">{room.name}</span>
        </span>
      )}
      {/* Lv1 → Lv2 剖层入口（与双击楼体等价） */}
      {drill.level === 1 && drill.buildingId && (
        <button
          type="button"
          onClick={() => setDrill({ level: 2, buildingId: drill.buildingId })}
          className="ml-1 rounded border border-brand/40 px-1.5 py-0.5 text-[10px] text-brand-light hover:bg-brand/20"
        >
          剖层
        </button>
      )}
    </div>
  )
}
