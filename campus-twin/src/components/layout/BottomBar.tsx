import { Pause } from 'lucide-react'
import { useCampusStore, type CampusState } from '../../store/campusStore'
import { DEMO_SCENARIOS } from '../../data/demoScenarios'

const SCENE_MODES = ['总览', '搜寻', '剖层', '热力', '导航'] as const
const RATES: { rate: CampusState['clock']['rate']; label: string }[] = [
  { rate: 1, label: '1x' },
  { rate: 10, label: '10x' },
  { rate: 60, label: '60x' },
]

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
  const setClockRate = useCampusStore((s) => s.setClockRate)
  const setQuality = useCampusStore((s) => s.setQuality)
  const runDemoScript = useCampusStore((s) => s.runDemoScript)

  return (
    <footer className="flex h-11 shrink-0 items-center justify-between border-t border-slate-200 bg-white px-4">
      {/* 场景模式条占位：由 Agent 任务驱动（阶段 2/3） */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-slate-400">场景模式</span>
        <div className="flex gap-1">
          {SCENE_MODES.map((m) => (
            <span
              key={m}
              className={
                m === '总览'
                  ? 'rounded-md bg-ink px-2.5 py-1 text-[11px] font-medium text-white'
                  : 'rounded-md border border-slate-200 px-2.5 py-1 text-[11px] text-slate-400'
              }
            >
              {m}
            </span>
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

      {/* 时间轴：滑杆设时刻（验证 24h 昼夜）+ 变速 */}
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
