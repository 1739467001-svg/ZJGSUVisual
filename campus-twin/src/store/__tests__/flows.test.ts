import { beforeEach, describe, expect, it } from 'vitest'
import { useCampusStore } from '../campusStore'
import { resetIds } from '../../lib/ids'

// 无头驱动 store：四条演示语句全链路（stepDelay=0）
const submit = (text: string) => useCampusStore.getState().submitCommand(text, { stepDelay: 0 })
const state = () => useCampusStore.getState()

beforeEach(() => {
  resetIds()
  useCampusStore.setState(useCampusStore.getInitialState(), true)
})

describe('链路一 · 一句话预约', () => {
  it('候选落库 → 确认预约 → 房间 busy + 回执', async () => {
    await submit('帮我找一个现在空着、有投影、能坐 8 个人的会议室')
    const s = state()
    expect(s.activePanel).toBe('booking')
    expect(s.currentIntent?.intent).toBe('book_room')
    expect(s.agentSteps.length).toBeGreaterThanOrEqual(4)
    expect(s.agentSteps[0].agent).toBe('调度Agent')
    expect(s.candidates).not.toBeNull()
    expect(s.candidates!.length).toBeGreaterThan(0)

    const first = s.rooms.find((r) => r.id === s.candidates![0].roomId)!
    expect(first.capacity).toBeGreaterThanOrEqual(8)
    expect(first.equipment).toContain('projector')

    state().confirmBooking(first.id)
    const s2 = state()
    expect(s2.bookings).toHaveLength(1)
    expect(s2.bookings[0].id).toBe('B-001')
    expect(s2.rooms.find((r) => r.id === first.id)!.status).toBe('busy')
    expect(s2.messages[s2.messages.length - 1].text).toContain('B-001')
  })
})

describe('链路二 · 一句话报修', () => {
  it('表单预填 → 建工单 → 状态推进闭环', async () => {
    await submit('三号楼 302 投影坏了')
    const s = state()
    expect(s.activePanel).toBe('repair')
    expect(s.currentIntent?.intent).toBe('repair')
    expect(s.repairDraft?.roomId).toBe('jxc-302')
    expect(s.repairDraft?.deviceType).toBe('projector')
    expect(s.selectedBuildingId).toBe('jxc')

    const ticket = state().createTicket({ roomId: 'jxc-302', deviceType: 'projector', desc: '三号楼 302 投影坏了' })
    expect(ticket.id).toBe('RP-001')
    expect(ticket.status).toBe('new')
    expect(state().rooms.find((r) => r.id === 'jxc-302')!.status).toBe('repair')
    expect(state().repairDraft).toBeNull()

    state().advanceTicket('RP-001')
    expect(state().tickets[0].status).toBe('doing')
    state().advanceTicket('RP-001')
    expect(state().tickets[0].status).toBe('done')
    expect(state().rooms.find((r) => r.id === 'jxc-302')!.status).toBe('free')
  })
})

describe('链路三 · 一句话态势', () => {
  it('态势数据落库：KPI / Top5 / 建议', async () => {
    await submit('看一下现在全校哪里最紧张')
    const s = state()
    expect(s.activePanel).toBe('admin')
    expect(s.currentIntent?.intent).toBe('admin_overview')
    expect(s.admin).not.toBeNull()
    expect(s.admin!.top).toHaveLength(5)
    expect(s.admin!.advice.length).toBeGreaterThanOrEqual(1)
    expect(s.admin!.occupancyOverall).toBeGreaterThan(0)
    expect(s.sceneMode).toBe('overview')
  })
})

describe('链路四 · 新生导航', () => {
  it('路径落库：分段指引 + 步行时间', async () => {
    await submit('我从正门怎么去图书馆？')
    const s = state()
    expect(s.activePanel).toBe('navigation')
    expect(s.currentIntent?.intent).toBe('navigate')
    expect(s.lastRoute).not.toBeNull()
    expect(s.lastRoute!.distanceM).toBeGreaterThan(300)
    expect(s.lastRoute!.segments.length).toBeGreaterThanOrEqual(3)
    expect(s.lastRoute!.segments.map((x) => x.text).join('')).toContain('图书馆前广场')
    expect(s.sceneMode).toBe('navigation')
  })
})

describe('unknown 兜底', () => {
  it('无法识别时给示例指令', async () => {
    await submit('今天天气怎么样')
    const s = state()
    expect(s.currentIntent?.intent).toBe('unknown')
    expect(s.messages[s.messages.length - 1].text).toContain('三号楼 302 投影坏了')
  })
})
