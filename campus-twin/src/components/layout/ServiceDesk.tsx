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
  const Panel = PANELS[activePanel]

  return (
    <aside className="flex min-h-0 flex-col border-l border-slate-200 bg-panel">
      <div className="flex shrink-0 gap-1 border-b border-slate-200 px-3 pt-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActivePanel(t.id)}
            className={
              activePanel === t.id
                ? 'rounded-t-md border border-b-0 border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-brand-dark'
                : 'px-3 py-1.5 text-xs text-slate-400 hover:text-slate-600'
            }
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Panel />
      </div>
    </aside>
  )
}
