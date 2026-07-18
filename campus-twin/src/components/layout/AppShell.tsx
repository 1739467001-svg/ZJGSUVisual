import { TopBar } from './TopBar'
import { CommandPanel } from './CommandPanel'
import { ServiceDesk } from './ServiceDesk'
import { BottomBar } from './BottomBar'

// 规格 §4 信息架构：顶栏 / 左栏指挥台 / 中栏沙盘 / 右栏服务台 / 底栏时间轴
export function AppShell() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-panel">
      <TopBar />
      <div className="grid min-h-0 flex-1 grid-cols-[300px_minmax(0,1fr)_348px]">
        <CommandPanel />
        <main className="sandbox-grid relative min-w-0">
          <div className="pointer-events-none absolute left-4 top-4 text-[11px] leading-5 text-slate-500">
            <p>原点 · 图书馆前广场</p>
            <p className="tabular-nums">1040m × 980m · +X 东 / +Z 南</p>
          </div>
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="mb-3 text-[11px] font-medium tracking-[0.35em] text-brand-light/80">
                CAMPUS TWIN · 3D SANDBOX
              </p>
              <h2 className="text-xl font-semibold text-slate-200">
                3D 数字孪生沙盘 · 阶段 3 接入
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                楼宇弹起 / 扫描剖层 / 人流潮汐 / 无人机运镜
              </p>
            </div>
          </div>
        </main>
        <ServiceDesk />
      </div>
      <BottomBar />
    </div>
  )
}
