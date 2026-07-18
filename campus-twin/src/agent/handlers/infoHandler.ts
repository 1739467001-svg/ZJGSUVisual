import { DEMO_SCENARIOS } from '../../data/demoScenarios'
import type { Handler } from '../handlerTypes'

// unknown 兜底：友好回复 + 4 条示例指令（规格 §8.2）
export const infoHandler: Handler = () => ({
  steps: [
    { agent: '调度Agent', phase: 'plan', title: '识别意图', detail: '未命中已知意图，转入兜底' },
    { agent: '调度Agent', phase: 'act', title: '给出示例', detail: '已附上 4 条可直接点击的演示指令' },
  ],
  result: {
    type: 'unknown',
    message: `这句话我暂时接不住。你可以这样问我：\n${DEMO_SCENARIOS.map((s) => `· ${s.text}`).join('\n')}`,
  },
})
