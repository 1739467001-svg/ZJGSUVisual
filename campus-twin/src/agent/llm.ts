import type { Intent } from '../types'

/**
 * LLM 增强插槽（规格 §8.1，可选、默认关）：
 * 开启时由调度层以 Promise.race 包裹，2.5s 无响应自动回退规则层；
 * 返回 null 表示无增强结果，调用方继续使用 parseIntent 的解析。
 * Demo 全程不依赖此插槽，保持断网可演。
 */
export async function enhanceParse(_text: string): Promise<Intent | null> {
  return null
}
