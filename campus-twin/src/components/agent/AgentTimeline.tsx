import { AnimatePresence, motion } from 'framer-motion'
import { useCampusStore } from '../../store/campusStore'
import { AgentStepCard } from './AgentStepCard'

export function AgentTimeline() {
  const steps = useCampusStore((s) => s.agentSteps)
  if (!steps.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 p-4 text-center">
        <p className="text-xs text-slate-400">规划 → 执行 → 验证</p>
        <p className="mt-1 text-[11px] text-slate-300">发送指令后，Agent 步骤流在此渲染</p>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-1.5">
      <AnimatePresence initial={false}>
        {steps.map((s) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <AgentStepCard step={s} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
