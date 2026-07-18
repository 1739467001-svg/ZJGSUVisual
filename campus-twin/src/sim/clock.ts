// SimClock（规格 §7）：虚拟时钟单例。3D 层在 useFrame 直接读，不经 React 重渲染；
// store 以 ~1Hz 节流同步 virtualTs 供 TopBar/BottomBar 显示。
export type ClockRate = 0 | 1 | 10 | 60

export const CLOCK_START = '2026-03-03T09:58:00' // 周二 09:58（规格 §3.4）

export function toLocalIso(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

export class SimClock {
  private date: Date
  private rate: ClockRate

  constructor(start: string = CLOCK_START, rate: ClockRate = 60) {
    this.date = new Date(start)
    this.rate = rate
  }

  /** dtRealSec 为真实秒；rate 语义 = 虚拟秒/真实秒（60 即 1s 真实 = 1min 虚拟） */
  tick(dtRealSec: number): Date {
    if (this.rate > 0 && dtRealSec > 0) {
      this.date = new Date(this.date.getTime() + dtRealSec * this.rate * 1000)
    }
    return this.date
  }

  now(): Date {
    return this.date
  }

  setTime(d: Date): void {
    this.date = d
  }

  setRate(r: ClockRate): void {
    this.rate = r
  }

  getRate(): ClockRate {
    return this.rate
  }
}

export const simClock = new SimClock()
