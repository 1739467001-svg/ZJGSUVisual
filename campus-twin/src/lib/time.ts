// 虚拟时间工具：时钟走字在阶段 5，本阶段 virtualTs 固定从周二 09:58 起
export interface TimeSlot {
  start: string // HH:mm
  end: string
  label: string // 原始时间词，用于步骤文案
}

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export function toHHMM(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function nowHHMM(virtualTs: string): string {
  return virtualTs.slice(11, 16)
}

export function endPlus(start: string, mins: number): string {
  return toHHMM(toMinutes(start) + mins)
}

/** 两个 HH:mm 区间是否重叠 */
export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return toMinutes(aStart) < toMinutes(bEnd) && toMinutes(bStart) < toMinutes(aEnd)
}

/** 时间词解析：现在 / 今天上午 / 今天下午 / 下午N点 / 明天N点（明天复用当日课表结构） */
export function parseTimeWord(text: string, virtualTs: string): TimeSlot | null {
  const now = nowHHMM(virtualTs)

  const tomorrow = /明天/.test(text)
  const clockMatch = text.match(/(上午|下午|中午|晚上|今早)?\s*(\d{1,2})\s*[点时]/)
  if (clockMatch) {
    const period = clockMatch[1] ?? ''
    let h = Number(clockMatch[2])
    if ((period === '下午' || period === '晚上') && h < 12) h += 12
    if (period === '中午' && h < 11) h += 12
    const start = toHHMM(h * 60)
    return { start, end: endPlus(start, 60), label: `${tomorrow ? '明天' : ''}${period}${clockMatch[2]}点` }
  }
  if (/明天上午/.test(text)) return { start: '08:00', end: '11:40', label: '明天上午' }
  if (/明天下午/.test(text)) return { start: '13:00', end: '17:00', label: '明天下午' }
  if (/明天/.test(text)) return { start: '09:00', end: '17:00', label: '明天' }
  if (/今天下午/.test(text)) return { start: '13:00', end: '17:00', label: '今天下午' }
  if (/今天上午|今早/.test(text)) return { start: '08:00', end: '11:40', label: '今天上午' }
  if (/现在|立马|立刻|马上|当前/.test(text)) return { start: now, end: endPlus(now, 60), label: `现在(${now})` }
  if (/下午/.test(text)) return { start: '13:00', end: '17:00', label: '下午' }
  if (/上午/.test(text)) return { start: '08:00', end: '11:40', label: '上午' }
  return null
}
