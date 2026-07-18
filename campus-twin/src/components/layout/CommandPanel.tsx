import { Activity, Navigation, Search, Wrench } from 'lucide-react'
import { DEMO_SCENARIOS } from '../../data/demoScenarios'
import { useCampusStore } from '../../store/campusStore'
import { ChatInput } from '../agent/ChatInput'
import { AgentTimeline } from '../agent/AgentTimeline'
import { MessageList } from '../agent/MessageList'

const CHAIN_ICON = { booking: Search, repair: Wrench, overview: Activity, navigate: Navigation } as const

export function CommandPanel() {
  const running = useCampusStore((s) => s.running)
  const runDemoScript = useCampusStore((s) => s.runDemoScript)

  return (
    <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto border-r border-slate-200 bg-panel p-4">
      <div>
        <h1 className="text-sm font-semibold text-slate-900">一句话指挥台</h1>
        <p className="mt-0.5 text-[11px] text-slate-400">自然语言调度整个校园 · 左栏发起</p>
      </div>

      <ChatInput />

      <div>
        <p className="mb-2 text-[11px] font-medium tracking-wide text-slate-400">示例指令 · 点击即跑</p>
        <div className="grid grid-cols-2 gap-2">
          {DEMO_SCENARIOS.map(({ id, title, text }) => {
            const Icon = CHAIN_ICON[id]
            return (
              <button
                key={id}
                type="button"
                disabled={running}
                onClick={() => void runDemoScript(id)}
                className="rounded-lg border border-slate-200 bg-white p-2.5 text-left transition-colors hover:border-brand/50 disabled:opacity-50"
              >
                <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-brand-dark">
                  <Icon size={12} />
                  {title}
                </div>
                <p className="text-[11px] leading-4 text-slate-500">「{text}」</p>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-medium tracking-wide text-slate-400">Agent 编排</p>
        <AgentTimeline />
      </div>

      <div>
        <p className="mb-2 text-[11px] font-medium tracking-wide text-slate-400">对话与回执</p>
        <MessageList />
      </div>
    </aside>
  )
}
