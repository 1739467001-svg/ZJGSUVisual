import { Activity, AlertTriangle, Lightbulb, Users, Zap } from 'lucide-react'
import { useCampusStore } from '../../store/campusStore'
import { buildAnomalies } from '../../lib/anomalies'
import { buildingName } from '../../lib/format'
import { OccupancyChart, EnergyTrendChart } from '../charts/OccupancyChart'
import { TrafficChart } from '../charts/TrafficChart'

// 规格 §5.3：KPI/图表/排行全部读模拟引擎 snapshot —— 与沙盘光带/热力同源
export function AdminPanel() {
  const snapshot = useCampusStore((s) => s.snapshot)
  const world = useCampusStore((s) => s.world)
  const rooms = useCampusStore((s) => s.rooms)
  const devices = useCampusStore((s) => s.devices)
  const tickets = useCampusStore((s) => s.tickets)
  const admin = useCampusStore((s) => s.admin)
  const selectBuilding = useCampusStore((s) => s.selectBuilding)
  const setCameraShot = useCampusStore((s) => s.setCameraShot)

  const locate = (buildingId?: string) => {
    if (!buildingId) return
    selectBuilding(buildingId)
    setCameraShot({ kind: 'push', buildingId, ms: 1200 })
  }

  const kpis = [
    { icon: Activity, label: '全校占用率', value: `${Math.round(snapshot.occupancyOverall * 100)}%` },
    { icon: Users, label: '估算在楼人数', value: snapshot.totalHeadcount.toLocaleString('zh-CN') },
    { icon: Zap, label: '当前功率', value: `${snapshot.totalPowerKw} kW` },
    { icon: AlertTriangle, label: '进行中工单', value: String(tickets.filter((t) => t.status !== 'done').length) },
  ]

  const top5 = world.buildings
    .map((b) => ({ id: b.id, occ: snapshot.pulses[b.id]?.occupancy ?? 0 }))
    .sort((a, b) => b.occ - a.occ)
    .slice(0, 5)
  const anomalies = admin?.anomalies ?? buildAnomalies(rooms, tickets, devices)
  const advice = admin?.advice ?? []

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

      <p className="mb-1 mt-5 text-[11px] font-medium tracking-wide text-slate-400">今日占用率曲线</p>
      <div className="h-28 rounded-lg border border-slate-200 bg-white p-1">
        <OccupancyChart />
      </div>
      <p className="mb-1 mt-3 text-[11px] font-medium tracking-wide text-slate-400">今日能耗趋势</p>
      <div className="h-28 rounded-lg border border-slate-200 bg-white p-1">
        <EnergyTrendChart />
      </div>
      <p className="mb-1 mt-3 text-[11px] font-medium tracking-wide text-slate-400">道路人流 Top5</p>
      <div className="h-28 rounded-lg border border-slate-200 bg-white p-1">
        <TrafficChart />
      </div>

      <p className="mb-2 mt-5 text-[11px] font-medium tracking-wide text-slate-400">占用排行 Top5</p>
      <div className="flex flex-col gap-1.5">
        {top5.map(({ id, occ }, i) => {
          const pct = Math.round(occ * 100)
          return (
            <button
              key={id}
              type="button"
              onClick={() => locate(id)}
              className="rounded-lg border border-slate-200 bg-white p-2.5 text-left hover:border-brand/50"
            >
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-slate-700">
                  <span className="mr-1.5 tabular-nums text-slate-400">{i + 1}.</span>
                  {buildingName(id)}
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
        异常 · {anomalies.length}
      </p>
      {anomalies.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-3 text-center text-xs text-slate-400">
          当前无异常
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {anomalies.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => locate(a.buildingId)}
              className="flex items-start gap-2 rounded-lg border border-danger/20 bg-danger/5 p-2.5 text-left text-[13px] text-slate-700 hover:border-danger/50"
            >
              <AlertTriangle size={13} className="mt-0.5 shrink-0 text-danger" />
              {a.text}
            </button>
          ))}
        </div>
      )}

      <p className="mb-2 mt-5 text-[11px] font-medium tracking-wide text-slate-400">调度建议</p>
      {advice.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-3 text-center text-xs leading-5 text-slate-400">
          在左栏说「看一下现在全校哪里最紧张」
          <br />
          生成可解释调度建议
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {advice.map((s, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg border border-gold/40 bg-gold/10 p-2.5 text-[13px] text-slate-700">
              <Lightbulb size={13} className="mt-0.5 shrink-0 text-amber-600" />
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
