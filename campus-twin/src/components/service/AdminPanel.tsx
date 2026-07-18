import { Activity, AlertTriangle, Lightbulb, Users, Zap } from 'lucide-react'
import { useCampusStore } from '../../store/campusStore'
import { buildingName } from '../../lib/format'

// 纯 CSS 条形，ECharts 趋势图在阶段 5 接入
export function AdminPanel() {
  const admin = useCampusStore((s) => s.admin)
  const selectBuilding = useCampusStore((s) => s.selectBuilding)

  if (!admin) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <p className="text-xs leading-5 text-slate-400">
          在左栏说一句态势的话，例如
          <br />
          「看一下现在全校哪里最紧张」
        </p>
      </div>
    )
  }

  const kpis = [
    { icon: Activity, label: '全校占用率', value: `${Math.round(admin.occupancyOverall * 100)}%` },
    { icon: Users, label: '估算在楼人数', value: admin.headcount.toLocaleString('zh-CN') },
    { icon: Zap, label: '当前功率', value: `${admin.totalPowerKw} kW` },
    { icon: AlertTriangle, label: '进行中工单', value: String(admin.activeTickets) },
  ]

  return (
    <div className="p-4">
      <div className="grid grid-cols-2 gap-2">
        {kpis.map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <Icon size={12} className="text-brand" />
              {label}
            </div>
            <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      <p className="mb-2 mt-5 text-[11px] font-medium tracking-wide text-slate-400">占用排行 Top5</p>
      <div className="flex flex-col gap-1.5">
        {admin.top.map(({ buildingId, occupancy }, i) => {
          const pct = Math.round(occupancy * 100)
          return (
            <button
              key={buildingId}
              type="button"
              onClick={() => selectBuilding(buildingId)}
              className="rounded-lg border border-slate-200 bg-white p-2.5 text-left hover:border-brand/50"
            >
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-slate-700">
                  <span className="mr-1.5 tabular-nums text-slate-400">{i + 1}.</span>
                  {buildingName(buildingId)}
                </span>
                <span className="tabular-nums text-slate-500">{pct}%</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${pct >= 60 ? 'bg-danger' : pct >= 40 ? 'bg-gold' : 'bg-brand'}`}
                  style={{ width: `${Math.max(pct, 2)}%` }}
                />
              </div>
            </button>
          )
        })}
      </div>

      <p className="mb-2 mt-5 text-[11px] font-medium tracking-wide text-slate-400">
        异常 · {admin.anomalies.length}
      </p>
      {admin.anomalies.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-3 text-center text-xs text-slate-400">
          当前无异常
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {admin.anomalies.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => a.buildingId && selectBuilding(a.buildingId)}
              className="flex items-start gap-2 rounded-lg border border-danger/20 bg-danger/5 p-2.5 text-left text-[13px] text-slate-700 hover:border-danger/50"
            >
              <AlertTriangle size={13} className="mt-0.5 shrink-0 text-danger" />
              {a.text}
            </button>
          ))}
        </div>
      )}

      <p className="mb-2 mt-5 text-[11px] font-medium tracking-wide text-slate-400">调度建议</p>
      <div className="flex flex-col gap-1.5">
        {admin.advice.map((s, i) => (
          <div key={i} className="flex items-start gap-2 rounded-lg border border-gold/40 bg-gold/10 p-2.5 text-[13px] text-slate-700">
            <Lightbulb size={13} className="mt-0.5 shrink-0 text-amber-600" />
            {s}
          </div>
        ))}
      </div>
    </div>
  )
}
