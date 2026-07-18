import { beforeEach, describe, expect, it } from 'vitest'
import { useCampusStore } from '../../store/campusStore'
import { resolveBandStatus } from '../bandStatus'
import { resetIds } from '../ids'

// store → 楼顶光带链路（验收硬指标：阶段 2 的 store 事件要在沙盘上可见）
const submit = (text: string) => useCampusStore.getState().submitCommand(text, { stepDelay: 0 })
const statusOf = (buildingId: string) => resolveBandStatus(useCampusStore.getState(), buildingId, 0)

beforeEach(() => {
  resetIds()
  useCampusStore.setState(useCampusStore.getInitialState(), true)
})

describe('光带聚合状态', () => {
  it('初始：无异常的楼为 free', () => {
    expect(statusOf('jxc')).toBe('free')
  })

  it('点选楼宇 → selected', () => {
    useCampusStore.getState().selectBuilding('lib')
    expect(statusOf('lib')).toBe('selected')
    expect(statusOf('jxc')).toBe('free')
  })

  it('预约链路：候选楼 → matched，确认预约 → busy', async () => {
    await submit('帮我找一个现在空着、有投影、能坐 8 个人的会议室')
    const s = useCampusStore.getState()
    const first = s.rooms.find((r) => r.id === s.candidates![0].roomId)!
    expect(statusOf(first.buildingId)).toBe('matched')

    useCampusStore.getState().confirmBooking(first.id)
    expect(statusOf(first.buildingId)).toBe('busy')
  })

  it('报修链路：表单阶段 selected，建工单后 → repair', async () => {
    await submit('三号楼 302 投影坏了')
    expect(statusOf('jxc')).toBe('selected') // 镜头定位目标楼
    useCampusStore.getState().createTicket({ roomId: 'jxc-302', deviceType: 'projector', desc: '投影坏了' })
    expect(statusOf('jxc')).toBe('repair')
  })

  it('态势链路：占用 Top1 → hot', async () => {
    await submit('看一下现在全校哪里最紧张')
    const s = useCampusStore.getState()
    const top1 = s.admin!.top[0].buildingId
    expect(statusOf(top1)).toBe('hot')
  })
})
