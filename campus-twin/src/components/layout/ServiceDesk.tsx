import { Activity, CalendarCheck, LayoutDashboard, Navigation, PanelRightClose, PanelRightOpen, Wrench } from 'lucide-react'
import { useCampusStore, type CampusState } from '../../store/campusStore'
import { OverviewPanel } from '../service/OverviewPanel'
import { BookingPanel } from '../service/BookingPanel'
import { RepairPanel } from '../service/RepairPanel'
import { AdminPanel } from '../service/AdminPanel'
import { NavigationPanel } from '../service/NavigationPanel'

const TABS: { id: CampusState['activePanel']; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: '总览', icon: LayoutDashboard },
  { id: 'booking', label: '预约', icon: CalendarCheck },
  { id: 'repair', label: '报修', icon: Wrench },
  { id: 'navigation', label: '导航', icon: Navigation },
  { id: 'admin', label: '态势', icon: Activity },
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
  const collapsed = useCampusStore((s) => s.panelCollapsed.right)
  const togglePanel = useCampusStore((s) => s.togglePanel)
  // 新工单推送：管理端「态势」tab 红点计数（未闭环工单数）
  const activeTickets = useCampusStore((s) => s.tickets.filter((t) => t.status !== 'done').length)
  const Panel = PANELS[activePanel]
  // 态势面板 = 教师/领导视图，学生与访客均不可点（Agent 指令流不受角色限制——路演安全）
  const adminLocked = role !== 'admin'

  // 折叠态：44px 窄条，竖排 tab 图标——点击即展开并切到该面板
  if (collapsed) {
    return (
      <aside className="flex min-h-0 flex-col items-center gap-1 border-l border-slate-200 bg-panel py-2">
        <button
          type="button"
          title="展开服务台"
          onClick={() => togglePanel('right')}
          className="mb-1 rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <PanelRightOpen size={15} />
        </button>
        {TABS.map((t) => {
          const disabled = t.id === 'admin' && adminLocked
          const Icon = t.icon
          return (
            <button
              key={t.id}
              type="button"
              disabled={disabled}
              title={disabled ? `${t.label}（教师/管理员权限视图）` : t.label}
              onClick={() => {
                setActivePanel(t.id)
                togglePanel('right')
              }}
              className={
                disabled
                  ? 'cursor-not-allowed p-2 text-slate-200'
                  : activePanel === t.id
                    ? 'rounded-md bg-brand/10 p-2 text-brand-dark'
                    : 'rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600'
              }
            >
              <span className="relative inline-flex">
                <Icon size={15} />
                {t.id === 'admin' && !adminLocked && activeTickets > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 h-2 w-2 rounded-full bg-danger" />
                )}
              </span>
            </button>
          )
        })}
      </aside>
    )
  }

  return (
    <aside className="flex min-h-0 flex-col border-l border-slate-200 bg-panel">
      <div className="flex shrink-0 gap-1 border-b border-slate-200 px-3 pt-2">
        {TABS.map((t) => {
          const disabled = t.id === 'admin' && adminLocked
          return (
            <button
              key={t.id}
              type="button"
              disabled={disabled}
              title={disabled ? '教师/管理员权限视图' : undefined}
              onClick={() => setActivePanel(t.id)}
              className={
                disabled
                  ? 'cursor-not-allowed px-3 py-1.5 text-xs text-slate-300'
                  : activePanel === t.id
                    ? 'rounded-t-md border border-b-0 border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-brand-dark'
                    : 'px-3 py-1.5 text-xs text-slate-400 hover:text-slate-600'
              }
            >
              <span className="relative inline-flex items-center">
                {t.label}
                {t.id === 'admin' && !adminLocked && activeTickets > 0 && (
                  <span className="absolute -right-3 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-semibold text-white">
                    {activeTickets}
                  </span>
                )}
              </span>
            </button>
          )
        })}
        <button
          type="button"
          title="收起服务台"
          onClick={() => togglePanel('right')}
          className="ml-auto shrink-0 self-start rounded-md p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-500"
        >
          <PanelRightClose size={15} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Panel />
      </div>
    </aside>
  )
}
