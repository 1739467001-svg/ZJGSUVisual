// 四条演示链路一键脚本（规格 §5 演示语句）
export interface DemoScenario {
  id: 'booking' | 'repair' | 'overview' | 'navigate'
  title: string
  text: string
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  { id: 'booking', title: '链路一 · 预约', text: '帮我找一个现在空着、有投影、能坐 8 个人的会议室' },
  { id: 'repair', title: '链路二 · 报修', text: '三号楼 302 投影坏了' },
  { id: 'overview', title: '链路三 · 态势', text: '看一下现在全校哪里最紧张' },
  { id: 'navigate', title: '链路四 · 导航', text: '我从正门怎么去图书馆？' },
]
