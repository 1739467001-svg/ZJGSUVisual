import { describe, expect, it } from 'vitest'
import { SimClock } from '../clock'

describe('SimClock · 速率语义（虚拟秒/真实秒）', () => {
  it('rate=60：1s 真实 = 60s 虚拟', () => {
    const c = new SimClock('2026-03-03T09:58:00', 60)
    c.tick(1)
    expect(c.now().getTime() - new Date('2026-03-03T09:58:00').getTime()).toBe(60_000)
  })

  it('rate=10 / 1', () => {
    const c10 = new SimClock('2026-03-03T09:58:00', 10)
    c10.tick(2)
    expect(c10.now().getSeconds()).toBe(20)
    const c1 = new SimClock('2026-03-03T09:58:00', 1)
    c1.tick(5)
    expect(c1.now().getSeconds()).toBe(5)
  })

  it('rate=0 暂停', () => {
    const c = new SimClock('2026-03-03T09:58:00', 0)
    c.tick(10)
    expect(c.now().getMinutes()).toBe(58)
  })

  it('setTime 直接设时刻（时间轴滑杆）', () => {
    const c = new SimClock('2026-03-03T09:58:00', 60)
    c.setTime(new Date('2026-03-03T21:30:00'))
    expect(c.now().getHours()).toBe(21)
    expect(c.now().getDate()).toBe(3) // 保持同一天
  })
})
