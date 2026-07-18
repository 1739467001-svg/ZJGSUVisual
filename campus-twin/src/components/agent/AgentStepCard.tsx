import { AlertTriangle, CheckCircle2, Clock, Loader2 } from 'lucide-react'
import type { AgentStep } from '../../types'

const PHASE_STYLE: Record<AgentStep['phase'], string> = {
  plan: 'bg-candidate/15 text-sky-700',
  act: 'bg-brand/10 text-brand-dark',
  verify: 'bg-gold/20 text-amber-700',
}

const STATUS_ICON: Record<AgentStep['status'], typeof CheckCircle2> = {
  done: CheckCircle2,
  running: Loader2,
  waiting: Clock,
  error: AlertTriangle,
}

const STATUS_COLOR: Record<AgentStep['status'], string> = {
  done: 'text-brand',
  running: 'text-candidate animate-spin',
  waiting: 'text-slate-300',
  error: 'text-danger',
}

// 任务调度单风格（规格 §10）：不是聊天气泡
export function AgentStepCard({ step }: { step: AgentStep }) {
  const Icon = STATUS_ICON[step.status]
  return (
    <div className="rounded-md border border-slate-200 border-l-2 border-l-brand bg-white px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-800">{step.agent}</span>
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${PHASE_STYLE[step.phase]}`}>
          {step.phase}
        </span>
        <Icon size={13} className={`ml-auto ${STATUS_COLOR[step.status]}`} />
      </div>
      <p className="mt-1 text-[13px] text-slate-700">{step.title}</p>
      <p className="mt-0.5 text-[11px] leading-4 text-slate-400">{step.detail}</p>
    </div>
  )
}
