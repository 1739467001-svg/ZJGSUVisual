import { useCampusStore, type CampusState } from '../../store/campusStore'
import { OverviewPanel } from '../service/OverviewPanel'
import { BookingPanel } from '../service/BookingPanel'
import { RepairPanel } from '../service/RepairPanel'
import { AdminPanel } from '../service/AdminPanel'
import { NavigationPanel } from '../service/NavigationPanel'

const TABS: { id: CampusState['activePanel']; label: string }[] = [
  { id: 'overview', label: '总览' },
  { id: 'booking', label: '预约' },
  { id: 'repair', label: '报修' },
  { id: 'navigation', label: '导航' },
  { id: 'admin', label: '态势' },
]

const PANELS: Record<CampusState['activePanel'], () => React.JSX.Element> = {
  overview: OverviewPanel,
  booking: BookingPanel,
  repair: RepairPanel,
  navigation: NavigationPanel,
  admin: AdminPanel,
}

export function ServiceDesk() {
  const activePanel = useCampusStore((s) => s.activePanel)
  const setActivePanel = useCampusStore((s) => s.setActivePanel)
  const role = useCampusStore((s) => s.role)
  const Panel = PANELS[activePanel]

  return (
    <aside className="flex min-h-0 flex-col border-l border-slate-200 bg-panel">
      <div className="flex shrink-0 gap-1 border-b border-slate-200 px-3 pt-2">
        {TABS.map((t) => {
          // 访客隐藏态势面板（视图层权限）；Agent 指令流不受角色限制（路演安全）
          const disabled = t.id === 'admin' && role === 'visitor'
          return (
            <button
              key={t.id}
              type="button"
              disabled={disabled}
              title={disabled ? '管理员权限视图' : undefined}
              onClick={() => setActivePanel(t.id)}
              className={
                disabled
                  ? 'cursor-not-allowed px-3 py-1.5 text-xs text-slate-300'
                  : activePanel === t.id
                    ? 'rounded-t-md border border-b-0 border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-brand-dark'
                    : 'px-3 py-1.5 text-xs text-slate-400 hover:text-slate-600'
              }
            >
              {t.label}
            </button>
          )
        })}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Panel />
      </div>
    </aside>
  )
}
