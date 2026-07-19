import type { BuildingSpec } from '../types'
import { mulberry32 } from '../lib/rng'

// TideModel（规格 §7）：课表脉冲 + 食堂窗 + 图书馆曲线。
// 全部输出为（buildingId, 时刻）的纯函数 + 确定性噪声，同一时刻任何刷新结果一致。

/** 下课脉冲时刻（整 50 分钟切换，规格 §7 与任务清单） */
export const PULSES = [580, 630, 680, 840, 890, 940, 990, 1160] as const // 09:40 10:30 11:20 14:00 14:50 15:40 16:30 19:20
const CLASS_SPANS: [number, number][] = [
  [480, 730], // 08:00–12:10
  [800, 1040], // 13:20–17:20
  [1110, 1210], // 18:30–20:10
]
const MEAL_WINDOWS: [number, number][] = [
  [690, 750], // 11:30–12:30
  [1020, 1110], // 17:00–18:30
]

export type PulseState = 'class' | 'break' | 'off'

export function minutesOf(d: Date): number {
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60
}

export function pulseState(m: number): PulseState {
  for (const [s, e] of CLASS_SPANS) {
    if (m < s || m >= e) continue
    return PULSES.some((p) => m >= p && m < p + 10) ? 'break' : 'class'
  }
  return 'off'
}

export function isMealWindow(m: number): boolean {
  return MEAL_WINDOWS.some(([s, e]) => m >= s && m < e)
}

/** 最近一次下课脉冲距 m 的分钟数（非下课态返回 Infinity） */
export function sinceLastPulse(m: number): number {
  if (pulseState(m) !== 'break') return Infinity
  return Math.min(...PULSES.filter((p) => m >= p).map((p) => m - p))
}

function hash01(key: string): number {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return mulberry32(h >>> 0)()
}

/** 确定性噪声：按 buildingId + 10 分钟槽取 ±0.5 */
export function tideNoise(id: string, m: number): number {
  return hash01(`${id}@${Math.floor(m / 10)}`) - 0.5
}

function libraryCurve(m: number): number {
  if (m < 420) return 0.05 // 7:00 前
  if (m < 480) return 0.05 + ((m - 420) / 60) * 0.25 // 7:00–8:00 预热
  if (m < 840) return 0.3 + ((m - 480) / 360) * 0.55 // 8:00–14:00 爬升至峰 0.85
  if (m < 1290) return 0.85 - ((m - 840) / 450) * 0.3 // 14:00–21:30 缓降
  if (m < 1320) return 0.55 - ((m - 1290) / 30) * 0.35 // 21:30–22:00 落至 0.2
  return 0.2
}

function canteenCurve(m: number): number {
  if (isMealWindow(m)) return 0.9
  if (m >= 420 && m < 480) return 0.5 // 早餐
  return 0.1
}

function adminCurve(m: number): number {
  if (m >= 510 && m < 690) return 0.6 // 上午办公
  if (m >= 690 && m < 810) return 0.35 // 午休
  if (m >= 810 && m < 1050) return 0.6 // 下午办公
  return 0.1
}

/** 楼宇级占用率（TideModel 输出，含脉冲联动与确定性噪声） */
export function tideOccupancy(b: BuildingSpec, m: number): number {
  const st = pulseState(m)
  let base: number
  switch (b.kind) {
    case 'teaching':
      base = st === 'class' ? 0.85 : st === 'break' ? 0.25 : 0.08
      break
    case 'faculty':
      base = st === 'class' ? 0.6 : st === 'break' ? 0.3 : 0.15
      break
    case 'library':
      base = libraryCurve(m)
      if (st === 'break') base += 0.3 // 下课涌入
      break
    case 'canteen':
      base = canteenCurve(m)
      if (st === 'break') base += 0.3
      break
    case 'admin':
      base = adminCurve(m)
      break
    case 'venue':
      base = m >= 1080 && m <= 1260 ? 0.6 : 0.15 // 傍晚活动场
      break
    case 'sports':
      base = m >= 1050 && m <= 1260 ? 0.7 : m >= 720 && m < 780 ? 0.5 : 0.2 // 傍晚+午间
      break
    case 'dorm':
      base = m < 480 || m > 1260 ? 0.8 : 0.25
      break
  }
  return Math.min(0.98, Math.max(0.02, base + tideNoise(b.id, m) * 0.1))
}
