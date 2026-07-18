import { Activity, Navigation, Search, Send, Wrench } from 'lucide-react'

// 四条演示链路（规格 §5），阶段 2 点击即跑 demoScenarios
const EXAMPLES = [
  { icon: Search, chain: '链路一 · 预约', text: '帮我找一个现在空着、有投影、能坐 8 个人的会议室' },
  { icon: Wrench, chain: '链路二 · 报修', text: '三号楼 302 投影坏了' },
  { icon: Activity, chain: '链路三 · 态势', text: '看一下现在全校哪里最紧张' },
  { icon: Navigation, chain: '链路四 · 导航', text: '我从正门怎么去图书馆？' },
] as const

export function CommandPanel() {
  return (
    <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto border-r border-slate-200 bg-panel p-4">
      <div>
        <h1 className="text-sm font-semibold text-slate-900">一句话指挥台</h1>
        <p className="mt-0.5 text-[11px] text-slate-400">自然语言调度整个校园 · 左栏发起</p>
      </div>

      {/* 输入区占位：阶段 2 接入 Agent */}
      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <textarea
          rows={3}
          disabled
          placeholder="例如：帮我找一个现在空着、有投影、能坐 8 个人的会议室…"
          className="w-full resize-none rounded-md border border-slate-200 bg-slate-50 p-2 text-[13px] text-slate-700 placeholder:text-slate-400"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">阶段 2 接入 Agent</span>
          <button
            type="button"
            disabled
            className="flex items-center gap-1.5 rounded-md bg-brand/40 px-3 py-1.5 text-xs font-medium text-white"
          >
            <Send size={12} />
            发送
          </button>
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-medium tracking-wide text-slate-400">示例指令</p>
        <div className="flex flex-col gap-2">
          {EXAMPLES.map(({ icon: Icon, chain, text }) => (
            <div
              key={chain}
              className="cursor-default rounded-lg border border-slate-200 bg-white p-3 transition-colors hover:border-brand/50"
            >
              <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-brand-dark">
                <Icon size={12} />
                {chain}
              </div>
              <p className="text-[13px] leading-5 text-slate-700">「{text}」</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto">
        <p className="mb-2 text-[11px] font-medium tracking-wide text-slate-400">Agent 编排</p>
        <div className="rounded-lg border border-dashed border-slate-300 p-4 text-center">
          <p className="text-xs text-slate-400">规划 → 执行 → 验证</p>
          <p className="mt-1 text-[11px] text-slate-300">步骤流在此渲染 · 阶段 2 接入</p>
        </div>
      </div>
    </aside>
  )
}
