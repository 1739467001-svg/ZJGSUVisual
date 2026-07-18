import { Pause } from 'lucide-react'
import { useCampusStore, type CampusState } from '../../store/campusStore'

const SCENE_MODES = ['总览', '搜寻', '剖层', '热力', '导航'] as const
const RATES: { rate: CampusState['clock']['rate']; label: string }[] = [
  { rate: 1, label: '1x' },
  { rate: 10, label: '10x' },
  { rate: 60, label: '60x' },
]

export function BottomBar() {
  const rate = useCampusStore((s) => s.clock.rate)
  const setClockRate = useCampusStore((s) => s.setClockRate)

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

      {/* 时间轴：变速已接入 store，时钟驱动沙盘在阶段 5 接入 */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-slate-400">时间轴</span>
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
      </div>
    </footer>
  )
}
