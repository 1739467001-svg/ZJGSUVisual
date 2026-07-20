import { Pause } from 'lucide-react'
import { useCampusStore, type CampusState } from '../../store/campusStore'
import { DEMO_SCENARIOS } from '../../data/demoScenarios'

const RATES: { rate: CampusState['clock']['rate']; label: string }[] = [
  { rate: 1, label: '1x' },
  { rate: 10, label: '10x' },
  { rate: 60, label: '60x' },
]

const HEAT_MODES: { id: CampusState['heatMode']; label: string }[] = [
  { id: 'none', label: '无' },
  { id: 'occupancy', label: '占用' },
  { id: 'energy', label: '能耗' },
  { id: 'traffic', label: '人流' },
]

type ChipId = 'overview' | 'search' | 'drill' | 'heat' | 'navigation'

// 场景条高亮唯一化：热力 > 剖层 > 导航 > 搜索 > 总览
function activeChip(s: CampusState): ChipId {
  if (s.heatMode !== 'none' || s.sceneMode === 'overview') return 'heat'
  if (s.drill.level >= 2) return 'drill'
  if (s.sceneMode === 'navigation') return 'navigation'
  if (s.sceneMode === 'searching' || s.sceneMode === 'booking') return 'search'
  return 'overview'
}

function TimeSlider() {
  const virtualTs = useCampusStore((s) => s.clock.virtualTs)
  const setVirtualTs = useCampusStore((s) => s.setVirtualTs)
  const mins = Number(virtualTs.slice(11, 13)) * 60 + Number(virtualTs.slice(14, 16))
  return (
    <span className="flex items-center gap-1.5">
      <input
        type="range"
        min={0}
        max={1439}
        value={mins}
        onChange={(e) => {
          const v = Number(e.target.value)
          const hh = String(Math.floor(v / 60)).padStart(2, '0')
          const mm = String(v % 60).padStart(2, '0')
          setVirtualTs(`${virtualTs.slice(0, 10)}T${hh}:${mm}:00`)
        }}
        className="h-1 w-36 cursor-pointer accent-teal-600"
        title="拖动设定虚拟时刻"
      />
      <span className="text-[11px] tabular-nums text-slate-600">{virtualTs.slice(11, 16)}</span>
    </span>
  )
}

export function BottomBar() {
  const rate = useCampusStore((s) => s.clock.rate)
  const running = useCampusStore((s) => s.running)
  const quality = useCampusStore((s) => s.quality)
  const heatMode = useCampusStore((s) => s.heatMode)
  const drill = useCampusStore((s) => s.drill)
  const chip = useCampusStore(activeChip)
  const setClockRate = useCampusStore((s) => s.setClockRate)
  const setQuality = useCampusStore((s) => s.setQuality)
  const setHeatMode = useCampusStore((s) => s.setHeatMode)
  const setDrill = useCampusStore((s) => s.setDrill)
  const resetView = useCampusStore((s) => s.resetView)
  const runDemoScript = useCampusStore((s) => s.runDemoScript)

  const drillEnabled = (drill.level === 1 && !!drill.buildingId) || drill.level === 2
  const chipCls = (id: ChipId, enabled = true) =>
    chip === id
      ? 'rounded-md bg-ink px-2.5 py-1 text-[11px] font-medium text-white'
      : enabled
        ? 'rounded-md border border-slate-200 px-2.5 py-1 text-[11px] text-slate-500 hover:border-brand/50 hover:text-slate-700'
        : 'cursor-not-allowed rounded-md border border-slate-100 px-2.5 py-1 text-[11px] text-slate-300'

  return (
    <footer className="flex h-11 shrink-0 items-center justify-between border-t border-slate-200 bg-white px-4">
      {/* 场景模式条：高亮跟随 store 真实状态 */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-slate-400">场景模式</span>
        <div className="flex gap-1">
          <button type="button" className={chipCls('overview')} onClick={() => resetView()}>
            总览
          </button>
          <button type="button" disabled className={chipCls('search', false)} title="由找空间/预约指令触发">
            搜索
          </button>
          <button
            type="button"
            disabled={!drillEnabled}
            title={drillEnabled ? '剖层 / 返回楼宇' : '先点击楼宇进入 Lv1'}
            className={chipCls('drill', drillEnabled)}
            onClick={() => {
              if (drill.level === 1 && drill.buildingId) setDrill({ level: 2, buildingId: drill.buildingId })
              else if (drill.level === 2 && drill.buildingId) setDrill({ level: 1, buildingId: drill.buildingId })
            }}
          >
            剖层
          </button>
          <button
            type="button"
            className={chipCls('heat')}
            onClick={() => setHeatMode(heatMode === 'none' ? 'occupancy' : 'none')}
          >
            热力
          </button>
          <button type="button" disabled className={chipCls('navigation', false)} title="由导航指令触发">
            导航
          </button>
        </div>
        {/* 热力模式四档：无 / 占用 / 能耗 / 人流 */}
        <div className="ml-1 flex items-center gap-1 border-l border-slate-200 pl-2">
          {HEAT_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setHeatMode(m.id)}
              className={
                heatMode === m.id
                  ? 'rounded bg-brand px-1.5 py-0.5 text-[10px] font-medium text-white'
                  : 'rounded px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-slate-600'
              }
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* 演示脚本一键触发（规格 §4 底栏） */}
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-slate-400">演示脚本</span>
        {DEMO_SCENARIOS.map((s) => (
          <button
            key={s.id}
            type="button"
            disabled={running}
            onClick={() => void runDemoScript(s.id)}
            className="rounded-md border border-brand/30 px-2 py-1 text-[11px] text-brand-dark transition-colors hover:bg-brand/10 disabled:opacity-50"
          >
            {s.title.replace(/链路. · /, '')}
          </button>
        ))}
      </div>

      {/* 时间轴：滑杆设时刻（验证 24h 昼夜）+ 变速 + 画质 */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-slate-400">时间轴</span>
        <TimeSlider />
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setClockRate(0)}
            title="暂停"
            className={
              rate === 0
                ? 'flex items-center rounded-md bg-brand px-2.5 py-1 text-[11px] font-medium text-white'
                : 'flex items-center rounded-md border border-slate-200 px-2.5 py-1 text-[11px] text-slate-500 hover:border-brand/50'
            }
          >
            <Pause size={11} />
          </button>
          {RATES.map(({ rate: r, label }) => (
            <button
              key={label}
              type="button"
              onClick={() => setClockRate(r)}
              className={
                rate === r
                  ? 'rounded-md bg-brand px-2.5 py-1 text-[11px] font-medium text-white tabular-nums'
                  : 'rounded-md border border-slate-200 px-2.5 py-1 text-[11px] text-slate-500 tabular-nums hover:border-brand/50'
              }
            >
              {label}
            </button>
          ))}
        </div>
        {/* 画质切换：低配关 Bloom、粒子减半、dpr=1（规格 §9.7） */}
        <div className="ml-2 flex items-center gap-1 border-l border-slate-200 pl-2">
          <span className="text-[11px] text-slate-400">画质</span>
          {(['high', 'low'] as const).map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setQuality(q)}
              className={
                quality === q
                  ? 'rounded-md bg-ink px-2 py-1 text-[11px] font-medium text-white'
                  : 'rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-500 hover:border-brand/50'
              }
            >
              {q === 'high' ? '高' : '低'}
            </button>
          ))}
        </div>
      </div>
    </footer>
  )
}
