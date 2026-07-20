import { Flag, MapPin, Navigation as NavigationIcon } from 'lucide-react'
import { useCampusStore } from '../../store/campusStore'
import { buildingName, walkText } from '../../lib/format'

export function NavigationPanel() {
  const route = useCampusStore((s) => s.lastRoute)
  const placeInfo = useCampusStore((s) => s.placeInfo)
  const world = useCampusStore((s) => s.world)

  if (route) {
    const nameOf = (ref: { kind: 'gate' | 'building'; id: string }) =>
      ref.kind === 'gate'
        ? (world.gates.find((g) => g.id === ref.id)?.name ?? ref.id)
        : buildingName(ref.id)
    return (
      <div className="p-4">
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-900">
            <NavigationIcon size={14} className="text-brand" />
            {nameOf(route.from)} → {nameOf(route.to)}
          </div>
          <p className="mt-1 text-[11px] tabular-nums text-slate-500">
            全程 {route.distanceM} m · {walkText(route.walkMin)} · 贴路网无穿楼
          </p>
        </div>

        <p className="mb-2 mt-4 text-[11px] font-medium tracking-wide text-slate-400">分段指引</p>
        <div className="flex flex-col gap-1.5">
          {route.segments.map((seg, i) => (
            <div key={i} className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-white p-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/10 text-[10px] font-semibold tabular-nums text-brand-dark">
                {i + 1}
              </span>
              <div>
                <p className="text-[13px] text-slate-700">{seg.text}</p>
                {seg.landmark && (
                  <span className="mt-1 inline-flex items-center gap-1 rounded bg-gold/15 px-1.5 py-0.5 text-[10px] text-amber-700">
                    <MapPin size={9} />
                    {seg.landmark}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] leading-4 text-slate-400">
          无障碍备选：演示版暂未建模坡度数据，接口已预留（route.accessible）
        </p>
      </div>
    )
  }

  if (placeInfo) {
    const b = world.buildings.find((x) => x.id === placeInfo.buildingId)
    return (
      <div className="p-4">
        {b && (
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-900">
              <Flag size={14} className="text-brand" />
              {b.name}
            </div>
            <p className="mt-1 text-[11px] leading-5 text-slate-500">
              {b.fullName ?? b.name}
              <br />
              距正门{placeInfo.walkMin !== null ? walkText(placeInfo.walkMin) : '步行时间未知'} ·{' '}
              {b.realFloors ?? `${b.floors}层`}
            </p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex h-full items-center justify-center p-6 text-center">
      <p className="text-xs leading-5 text-slate-400">
        在左栏说一句导航的话，例如
        <br />
        「我从正门怎么去图书馆？」
      </p>
    </div>
  )
}
