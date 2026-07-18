import type { AgentStep, Intent, TaskResult } from '../types'
import { parseIntent } from './parseIntent'
import { enhanceParse } from './llm'
import type { CampusEffects, Handler, HandlerContext, StepDraft } from './handlerTypes'
import { bookingHandler } from './handlers/bookingHandler'
import { repairHandler } from './handlers/repairHandler'
import { navigationHandler } from './handlers/navigationHandler'
import { overviewHandler } from './handlers/overviewHandler'
import { infoHandler } from './handlers/infoHandler'
import { INTENT_LABEL } from './parseIntent'

const HANDLERS: Partial<Record<Intent['intent'], Handler>> = {
  book_room: bookingHandler,
  find_free_classroom: bookingHandler,
  schedule_query: bookingHandler,
  repair: repairHandler,
  navigate: navigationHandler,
  where_is: navigationHandler,
  admin_overview: overviewHandler,
  energy_insight: overviewHandler,
  unknown: infoHandler,
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export interface DispatchOptions {
  stepDelay?: number // 步骤播放间隔（规格 §8.3：200~450ms；测试传 0）
}

export interface DispatchResult {
  intent: Intent
  result: TaskResult
  effects: CampusEffects
}

/**
 * 编排器（规格 §8.1）：调度Agent 解析 → 领域Agent plan/act/verify → TaskResult。
 * 步骤随业务真实执行逐条产出，UI 只是可视化。
 */
export async function dispatchCommand(
  text: string,
  ctx: HandlerContext,
  emit: (step: AgentStep) => void,
  opts: DispatchOptions = {},
): Promise<DispatchResult> {
  const delay = opts.stepDelay ?? 320
  let seq = 0
  const play = async (draft: StepDraft) => {
    if (seq > 0 && delay > 0) await sleep(delay)
    emit({ ...draft, id: `step-${Date.now()}-${seq++}`, status: 'done', ts: Date.now() })
  }

  // LLM 增强插槽默认关闭直接回 null，规则层兜底（断网可演）
  const enhanced = await enhanceParse(text)
  const intent = enhanced ?? parseIntent(text, ctx.virtualTs)

  await play({
    agent: '调度Agent',
    phase: 'plan',
    title: '识别意图',
    detail: `意图=${INTENT_LABEL[intent.intent]}(${intent.intent}) · 置信度 ${intent.confidence.toFixed(2)}`,
  })

  const handler = HANDLERS[intent.intent] ?? infoHandler
  const { steps, result, effects } = handler(intent, ctx)
  for (const s of steps) await play(s)

  const closing: Partial<Record<TaskResult['type'], string>> = {
    booking_candidates: '候选已推送右栏，等待确认',
    navigation: '路径与分段指引已推送右栏',
    overview: '态势面板已更新',
  }
  const closingText = closing[result.type]
  if (closingText) {
    await play({ agent: '调度Agent', phase: 'act', title: '联动右栏', detail: closingText })
  }

  return { intent, result, effects: effects ?? {} }
}
