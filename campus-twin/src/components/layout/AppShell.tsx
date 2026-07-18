import { TopBar } from './TopBar'
import { CommandPanel } from './CommandPanel'
import { ServiceDesk } from './ServiceDesk'
import { BottomBar } from './BottomBar'
import { CampusCanvas } from '../campus3d/CampusCanvas'

// 规格 §4 信息架构：顶栏 / 左栏指挥台 / 中栏沙盘 / 右栏服务台 / 底栏时间轴
export function AppShell() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-panel">
      <TopBar />
      <div className="grid min-h-0 flex-1 grid-cols-[300px_minmax(0,1fr)_348px]">
        <CommandPanel />
        <main className="relative min-w-0 bg-ink">
          <CampusCanvas />
          <div className="pointer-events-none absolute left-4 top-4 z-10 text-[11px] leading-5 text-slate-500">
            <p>原点 · 图书馆前广场</p>
            <p className="tabular-nums">1040m × 980m · +X 东 / +Z 南</p>
          </div>
        </main>
        <ServiceDesk />
      </div>
      <BottomBar />
    </div>
  )
}
