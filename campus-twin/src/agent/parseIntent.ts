import type { AgentName, Intent, IntentName } from '../types'
import { parseTimeWord } from '../lib/time'
import { extractBuildingMention, extractDevices, resolvePlace } from './aliases'

export const INTENT_LABEL: Record<IntentName, string> = {
  book_room: '预约空间',
  find_free_classroom: '找空教室',
  repair: '设备报修',
  navigate: '路径导航',
  admin_overview: '管理态势',
  where_is: '位置查询',
  schedule_query: '排期查询',
  energy_insight: '能耗洞察',
  unknown: '未识别',
}

const INTENT_AGENT: Record<IntentName, AgentName> = {
  book_room: '预约Agent',
  find_free_classroom: '预约Agent',
  schedule_query: '预约Agent',
  repair: '报修Agent',
  navigate: '导航Agent',
  where_is: '导航Agent',
  admin_overview: '态势Agent',
  energy_insight: '态势Agent',
  unknown: '调度Agent',
}

const PUNCT = /[？?！!。\s]+$/

function classify(text: string): IntentName {
  if (/坏|故障|报修|不亮|不工作|没反应|失灵|用不了|不能用|维修/.test(text)) return 'repair'
  if (/从.+?(到|往|去).+/.test(text.replace(/怎么|如何/g, ''))) return 'navigate'
  if (/怎么走|怎么去|如何去|往哪走/.test(text)) return 'navigate'
  // 「在哪」前面不能是「现」（"现在哪有…"不是位置询问）
  if (/(?<!现)在哪|在哪里|在哪儿|什么位置/.test(text)) return 'where_is'
  if (/耗电|能耗|用电|电费|功率/.test(text)) return 'energy_insight'
  if (/紧张|拥挤|态势|占用率|人流|忙不忙|运行情况|overview/i.test(text)) return 'admin_overview'
  if (/接下来|课表|排期|档期|什么时候有空/.test(text)) return 'schedule_query'
  if (/空教室|自习/.test(text)) return 'find_free_classroom'
  if (/会议室|研讨间|讨论间|预约|预订|订个|场地|找个|找一个|找间/.test(text)) return 'book_room'
  return 'unknown'
}

/** 规则层意图解析（规格 §8.1：关键词+正则+别名表+槽位抽取，断网可演） */
export function parseIntent(rawText: string, virtualTs: string): Intent {
  const text = rawText.trim().replace(PUNCT, '')
  const intent = classify(text)
  const slots: Intent['slots'] = {}
  let score = 0.5

  // 楼宇提及：命中后从句中抹除，避免"计算机学院"被设备词"电脑/计算机"误扫
  const mention = extractBuildingMention(text)
  let rest = text
  if (mention) {
    slots.building = mention.surface
    slots.buildingId = mention.id
    rest = rest.replace(mention.surface, '　')
    score += 0.15
  }

  const devices = extractDevices(rest)
  if (devices.length) {
    slots.equipment = devices
    slots.device = devices[0]
    score += 0.1
  }

  const cap = rest.match(/(?:能坐|可容纳|坐|容纳)?\s*(\d{1,3})\s*(?:个)?人/)
  if (cap) {
    slots.capacity = Number(cap[1])
    score += 0.1
  }

  const room = rest.match(/(?<![\d:])(\d{3,4})(?![\d:])/)
  if (room) {
    slots.room = room[1]
    score += 0.1
  } else {
    const floor = rest.match(/(\d{1,2})\s*(?:楼|层)/)
    if (floor) {
      slots.room = `${Number(floor[1])}F`
      score += 0.05
    }
  }

  const time = parseTimeWord(text, virtualTs)
  if (time) {
    slots.time = time.label
    slots.start = time.start
    slots.end = time.end
    score += 0.05
  }

  if (intent === 'navigate') {
    const cleaned = text.replace(/怎么|如何/g, '')
    const m = cleaned.match(/从(.+?)(?:到|往|去)(.+)/)
    if (m) {
      const from = resolvePlace(m[1].trim())
      const to = resolvePlace(m[2].trim())
      if (from) {
        slots.from = m[1].trim()
        slots.fromId = from.id
        score += 0.1
      }
      if (to) {
        slots.target = m[2].trim()
        slots.targetId = to.id
        score += 0.15
      }
    } else {
      const m2 = text.match(/(.+?)(?:怎么走|怎么去|如何去|往哪走)/)
      if (m2) {
        const to = resolvePlace(m2[1].trim())
        if (to) {
          slots.target = m2[1].trim()
          slots.targetId = to.id
          score += 0.15
        }
      }
    }
  }

  if (intent === 'where_is' && mention) {
    slots.target = mention.surface
    slots.targetId = mention.id
    score += 0.1
  }

  if (intent === 'unknown') score = 0.25

  return {
    intent,
    slots,
    agent: INTENT_AGENT[intent],
    confidence: Math.min(0.97, Math.round(score * 100) / 100),
    rawText,
  }
}
