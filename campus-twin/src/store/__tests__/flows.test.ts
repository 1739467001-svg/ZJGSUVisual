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
  it('候选按距正门步行时间升序（Wow#2 点亮顺序）', async () => {
    await submit('帮我找一个现在空着、有投影、能坐 8 个人的会议室')
    const ws = state().candidates!.map((c) => c.walkMin ?? Infinity)
    const sorted = [...ws].sort((a, b) => a - b)
    expect(ws).toEqual(sorted)
  })

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

describe('跨指令干扰（批次 1 回归）', () => {
  it('报修 → 预约：草稿/钻取清空，进入扫描场景', async () => {
    await submit('三号楼 302 投影坏了')
    expect(state().repairDraft).not.toBeNull()
    await submit('帮我找一个现在空着、有投影、能坐 8 个人的会议室')
    const s = state()
    expect(s.repairDraft).toBeNull()
    expect(s.sceneMode).toBe('searching')
    expect(s.drill.level).toBe(0)
    expect(s.candidates).not.toBeNull()
    expect(s.candidates!.length).toBeGreaterThan(0)
  })

  it('预约 → 报修：候选清空，进入报修场景', async () => {
    await submit('帮我找一个现在空着、有投影、能坐 8 个人的会议室')
    expect(state().candidates).not.toBeNull()
    await submit('三号楼 302 投影坏了')
    const s = state()
    expect(s.candidates).toBeNull()
    expect(s.sceneMode).toBe('repair')
    expect(s.repairDraft).not.toBeNull()
    expect(s.repairDraft!.roomId).toBe('jxc-302')
  })

  it('预约 → unknown：场景回 idle，候选与高亮清空', async () => {
    await submit('帮我找一个现在空着、有投影、能坐 8 个人的会议室')
    expect(state().highlightedRoomIds.length).toBeGreaterThan(0)
    await submit('今天天气怎么样')
    const s = state()
    expect(s.sceneMode).toBe('idle')
    expect(s.candidates).toBeNull()
    expect(s.highlightedRoomIds).toEqual([])
  })

  it('导航 → where_is：lastRoute 清空不重演跟拍，placeInfo 落库', async () => {
    await submit('我从正门怎么去图书馆？')
    expect(state().lastRoute).not.toBeNull()
    await submit('信电学院在哪')
    const s = state()
    expect(s.lastRoute).toBeNull()
    expect(s.placeInfo).not.toBeNull()
    expect(s.placeInfo!.buildingId).toBe('xindian')
    expect(s.sceneMode).toBe('navigation')
  })

  it('advanceTicket：同房间多工单/有预约的状态推导', () => {
    // 同一房间两个工单：done 其一 → 仍 repair
    state().createTicket({ roomId: 'jxc-302', deviceType: 'projector', desc: '投影坏' })
    state().createTicket({ roomId: 'jxc-302', deviceType: 'computer', desc: '电脑坏' })
    expect(state().rooms.find((r) => r.id === 'jxc-302')!.status).toBe('repair')
    state().advanceTicket('RP-001')
    state().advanceTicket('RP-001')
    expect(state().tickets.find((t) => t.id === 'RP-001')!.status).toBe('done')
    expect(state().rooms.find((r) => r.id === 'jxc-302')!.status).toBe('repair') // RP-002 未闭环
    // 全部 done → 无预约时 free
    state().advanceTicket('RP-002')
    state().advanceTicket('RP-002')
    expect(state().rooms.find((r) => r.id === 'jxc-302')!.status).toBe('free')
    // 有进行中预约的房间：工单 done 后 → busy
    useCampusStore.setState((cur) => ({
      bookings: [
        { id: 'B-900', roomId: 'lib-501', user: 'u', start: '10:00', end: '11:00', status: 'ok', createdAt: '' },
      ],
      rooms: cur.rooms.map((r) => (r.id === 'lib-501' ? { ...r, status: 'busy' as const } : r)),
    }))
    state().createTicket({ roomId: 'lib-501', deviceType: 'light', desc: '灯坏' })
    expect(state().rooms.find((r) => r.id === 'lib-501')!.status).toBe('repair')
    state().advanceTicket('RP-003')
    state().advanceTicket('RP-003')
    expect(state().rooms.find((r) => r.id === 'lib-501')!.status).toBe('busy')
  })
})
