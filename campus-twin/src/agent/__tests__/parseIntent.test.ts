import { describe, expect, it } from 'vitest'
import { parseIntent } from '../parseIntent'

// 固定虚拟时刻：周二 09:58
const TS = '2026-03-03T09:58:00'
const parse = (text: string) => parseIntent(text, TS)

describe('parseIntent · 8 意图覆盖（§8.2 示例句）', () => {
  it('book_room：找个能坐 8 人有投影的会议室', () => {
    const r = parse('找个能坐 8 人有投影的会议室')
    expect(r.intent).toBe('book_room')
    expect(r.agent).toBe('预约Agent')
    expect(r.slots.capacity).toBe(8)
    expect(r.slots.equipment).toContain('projector')
    expect(r.confidence).toBeGreaterThan(0.6)
  })

  it('book_room：演示语句原句', () => {
    const r = parse('帮我找一个现在空着、有投影、能坐 8 个人的会议室')
    expect(r.intent).toBe('book_room')
    expect(r.slots.capacity).toBe(8)
    expect(r.slots.start).toBe('09:58')
  })

  it('find_free_classroom：现在哪有空教室自习', () => {
    expect(parse('现在哪有空教室自习').intent).toBe('find_free_classroom')
  })

  it('find_free_classroom：下午想找个教室自习', () => {
    const r = parse('下午想找个教室自习')
    expect(r.intent).toBe('find_free_classroom')
    expect(r.slots.start).toBeDefined()
  })

  it('repair：三号楼 302 投影坏了（别名 + 房间 + 设备）', () => {
    const r = parse('三号楼 302 投影坏了')
    expect(r.intent).toBe('repair')
    expect(r.agent).toBe('报修Agent')
    expect(r.slots.buildingId).toBe('jxc')
    expect(r.slots.room).toBe('302')
    expect(r.slots.device).toBe('projector')
  })

  it('repair：信电学院楼 404 空调坏了', () => {
    const r = parse('信电学院楼 404 空调坏了')
    expect(r.intent).toBe('repair')
    expect(r.slots.buildingId).toBe('xindian')
    expect(r.slots.device).toBe('ac')
    expect(r.slots.room).toBe('404')
  })

  it('navigate：从正门怎么去图书馆', () => {
    const r = parse('从正门怎么去图书馆')
    expect(r.intent).toBe('navigate')
    expect(r.agent).toBe('导航Agent')
    expect(r.slots.fromId).toBe('gate-east')
    expect(r.slots.targetId).toBe('lib')
  })

  it('navigate：演示语句原句（带主语与问号）', () => {
    const r = parse('我从正门怎么去图书馆？')
    expect(r.intent).toBe('navigate')
    expect(r.slots.fromId).toBe('gate-east')
    expect(r.slots.targetId).toBe('lib')
  })

  it('navigate：信电学院怎么走（只有终点）', () => {
    const r = parse('信电学院怎么走')
    expect(r.intent).toBe('navigate')
    expect(r.slots.targetId).toBe('xindian')
  })

  it('where_is：信电学院在哪', () => {
    const r = parse('信电学院在哪')
    expect(r.intent).toBe('where_is')
    expect(r.slots.targetId).toBe('xindian')
  })

  it('where_is：图书馆在哪里', () => {
    const r = parse('图书馆在哪里')
    expect(r.intent).toBe('where_is')
    expect(r.slots.targetId).toBe('lib')
  })

  it('admin_overview：全校哪里最紧张', () => {
    const r = parse('全校哪里最紧张')
    expect(r.intent).toBe('admin_overview')
    expect(r.agent).toBe('态势Agent')
  })

  it('admin_overview：演示语句原句', () => {
    expect(parse('看一下现在全校哪里最紧张').intent).toBe('admin_overview')
  })

  it('energy_insight：今天哪栋楼最耗电', () => {
    const r = parse('今天哪栋楼最耗电')
    expect(r.intent).toBe('energy_insight')
    expect(r.agent).toBe('态势Agent')
  })

  it('energy_insight：看看全校能耗情况', () => {
    expect(parse('看看全校能耗情况').intent).toBe('energy_insight')
  })

  it('schedule_query：图书馆 5 楼研讨间接下来有空的吗', () => {
    const r = parse('图书馆 5 楼研讨间接下来有空的吗')
    expect(r.intent).toBe('schedule_query')
    expect(r.slots.buildingId).toBe('lib')
    expect(r.slots.room).toBe('5F')
  })

  it('schedule_query：下午 3 点研讨间接下来有空的吗', () => {
    const r = parse('下午 3 点研讨间接下来有空的吗')
    expect(r.intent).toBe('schedule_query')
    expect(r.slots.start).toBe('15:00')
  })

  it('unknown：今天天气怎么样', () => {
    const r = parse('今天天气怎么样')
    expect(r.intent).toBe('unknown')
    expect(r.agent).toBe('调度Agent')
    expect(r.confidence).toBeLessThan(0.5)
  })
})

describe('parseIntent · 口语别名归一化', () => {
  it.each([
    ['信电学院在哪', 'xindian'],
    ['新电学院在哪', 'xindian'],
    ['三号楼 302 投影坏了', 'jxc'],
    ['图文在哪', 'lib'],
    ['经管楼怎么走', 'jingguan'],
  ])('%s → %s', (text, id) => {
    const r = parse(text)
    expect(r.slots.buildingId ?? r.slots.targetId).toBe(id)
  })
})

describe('parseIntent · 槽位抽取', () => {
  it('容量：能坐 12 人', () => {
    expect(parse('找个能坐 12 人有屏幕的会议室').slots.capacity).toBe(12)
  })

  it('设备多选：投影 + 麦克风', () => {
    const r = parse('找个有投影和麦克风的会议室')
    expect(r.slots.equipment).toEqual(expect.arrayContaining(['projector', 'mic']))
  })

  it('时间词：明天下午 2 点', () => {
    const r = parse('帮我订明天下午 2 点的会议室')
    expect(r.slots.start).toBe('14:00')
  })

  it('"计算机学院"不误扫出电脑设备', () => {
    const r = parse('计算机学院怎么走')
    expect(r.slots.buildingId).toBe('jsj')
    expect(r.slots.equipment ?? []).not.toContain('computer')
  })
})
