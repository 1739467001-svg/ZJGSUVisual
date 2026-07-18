import { Clock } from 'lucide-react'
import { useCampusStore } from '../../store/campusStore'

const VALUE_TAGS = ['N系统→1入口', '10秒办事', '可复制到社区·园区·医院·政务', '新生·访客·无障碍友好']
const ROLES = ['访客', '学生', '管理员'] as const
const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'] as const

export function TopBar() {
  const virtualTs = useCampusStore((s) => s.clock.virtualTs)
  const d = new Date(virtualTs)
  const hhmm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

  return (
    <header className="flex h-12 shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-4">
      <div className="flex items-center gap-2.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand text-[13px] font-bold text-white">
          C
        </span>
        <span className="text-sm font-semibold tracking-tight text-slate-900">CampusTwin</span>
        <span className="text-sm text-slate-400">·</span>
        <span className="text-sm text-slate-600">浙商大下沙</span>
        <span className="rounded border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-400">
          v3.0 Demo
        </span>
      </div>

      <div className="mx-auto flex items-center gap-2 text-slate-700">
        <Clock size={14} className="text-brand" />
        <span className="text-sm font-semibold tabular-nums">
          {WEEKDAYS[d.getDay()]} {hhmm}
        </span>
        <span className="text-[11px] text-slate-400">虚拟时钟 · 1s=1min</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-1.5 xl:flex">
          {VALUE_TAGS.map((t) => (
            <span
              key={t}
              className="whitespace-nowrap rounded-full bg-brand/10 px-2 py-0.5 text-[11px] text-brand-dark"
            >
              {t}
            </span>
          ))}
        </div>
        {/* 角色切换占位，权限视图阶段 2 接入 */}
        <div className="flex rounded-md border border-slate-200 p-0.5 text-[11px]">
          {ROLES.map((r) => (
            <button
              key={r}
              type="button"
              className={
                r === '学生'
                  ? 'rounded bg-brand px-2 py-0.5 text-white'
                  : 'rounded px-2 py-0.5 text-slate-500'
              }
            >
              {r}
            </button>
          ))}
        </div>
      </div>
    </header>
  )
}
