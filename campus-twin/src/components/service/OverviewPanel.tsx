import { Building2, DoorOpen, Cpu } from 'lucide-react'
import type { BuildingKind } from '../../types'
import { useCampusStore } from '../../store/campusStore'

const KIND_LABEL: Record<BuildingKind, string> = {
  library: '图书馆',
  admin: '行政办公',
  teaching: '教学楼',
  faculty: '学院楼',
  venue: '场馆',
  sports: '体育',
  canteen: '食堂',
  dorm: '宿舍',
}

export function OverviewPanel() {
  const world = useCampusStore((s) => s.world)
  const rooms = useCampusStore((s) => s.rooms)
  const devices = useCampusStore((s) => s.devices)

  const kindCounts = world.buildings.reduce<Partial<Record<BuildingKind, number>>>((acc, b) => {
    acc[b.kind] = (acc[b.kind] ?? 0) + 1
    return acc
  }, {})
  const landmarks = world.buildings.filter((b) => b.landmark)

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex-1 p-4">
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: Building2, label: '楼宇总数', value: world.buildings.length, unit: '栋' },
            { icon: DoorOpen, label: '房间总数', value: rooms.length, unit: '间' },
            { icon: Cpu, label: '在册设备', value: devices.length, unit: '台' },
          ].map(({ icon: Icon, label, value, unit }) => (
            <div key={label} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <Icon size={12} className="text-brand" />
                {label}
              </div>
              <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">
                {value}
                <span className="ml-0.5 text-[11px] font-normal text-slate-400">{unit}</span>
              </p>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {(Object.entries(kindCounts) as [BuildingKind, number][]).map(([kind, n]) => (
            <span
              key={kind}
              className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-500"
            >
              {KIND_LABEL[kind]}
              <span className="ml-1 font-medium tabular-nums text-slate-800">{n}</span>
            </span>
          ))}
        </div>

        <p className="mb-2 mt-5 text-[11px] font-medium tracking-wide text-slate-400">
          地标楼宇 · 档案参数
        </p>
        <div className="flex flex-col gap-2">
          {landmarks.map((b) => (
            <div key={b.id} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-slate-900">{b.name}</span>
                <span className="rounded bg-brand/10 px-1.5 py-0.5 text-[10px] text-brand-dark">
                  {KIND_LABEL[b.kind]}
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-5 text-slate-500">
                {[
                  b.area ? `${b.area.toLocaleString('zh-CN')}㎡` : null,
                  b.realFloors ?? `${b.floors}层`,
                  b.completed ? `${b.completed}年竣工` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              {b.honor && <p className="mt-0.5 text-[11px] text-gold">{b.honor}</p>}
              {b.address && <p className="mt-0.5 text-[11px] text-slate-400">{b.address}</p>}
            </div>
          ))}
        </div>
      </div>

      <div className="sticky bottom-0 border-t border-slate-200 bg-panel/95 px-4 py-2 backdrop-blur">
        <p className="text-center text-[11px] text-slate-400">演示数据 · 结构可替换真实系统</p>
      </div>
    </div>
  )
}
