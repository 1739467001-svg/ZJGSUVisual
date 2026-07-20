import { TopBar } from './TopBar'
import { CommandPanel } from './CommandPanel'
import { ServiceDesk } from './ServiceDesk'
import { BottomBar } from './BottomBar'
import { CampusCanvas } from '../campus3d/CampusCanvas'
import { Breadcrumb } from '../campus3d/Breadcrumb'
import { useCampusStore } from '../../store/campusStore'
import { world } from '../../data/world'

// 规格 §4 信息架构：顶栏 / 左栏指挥台 / 中栏沙盘 / 右栏服务台 / 底栏时间轴
// 左右栏可折叠成 44px 窄条（grid 列过渡动画，Canvas 随容器自适应）
export function AppShell() {
  const collapsed = useCampusStore((s) => s.panelCollapsed)
  const gridTemplateColumns = `${collapsed.left ? '44px' : '300px'} minmax(0, 1fr) ${collapsed.right ? '44px' : '348px'}`

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-panel">
      <TopBar />
      <div
        className="grid min-h-0 flex-1 transition-[grid-template-columns] duration-300 ease-out"
        style={{ gridTemplateColumns }}
      >
        <CommandPanel />
        <main className="relative min-w-0 bg-ink">
          <CampusCanvas />
          <Breadcrumb />
          <div className="pointer-events-none absolute bottom-3 left-4 z-10 text-[11px] leading-5 text-slate-500">
            <p>
              原点 · 图书馆前广场 · {world.bounds.east - world.bounds.west}m × {world.bounds.south - world.bounds.north}m · 底图 ©
              OpenStreetMap contributors
            </p>
          </div>
        </main>
        <ServiceDesk />
      </div>
      <BottomBar />
    </div>
  )
}
