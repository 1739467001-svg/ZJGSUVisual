import type { DeviceType, RoomType } from '../../types'
import { nowHHMM } from '../../lib/time'
import { searchRooms } from '../../lib/roomSearch'
import { walkMinFromMainGate } from '../../lib/pathfind'
import { extractRoomTypes } from '../aliases'
import type { Handler, HandlerContext } from '../handlerTypes'

// 楼宇步行分钟数起算一次后缓存（路网静态）
const walkCache = new Map<string, number | null>()
function walkOf(ctx: HandlerContext, buildingId: string): number | null {
  if (!walkCache.has(buildingId)) walkCache.set(buildingId, walkMinFromMainGate(ctx.world, buildingId))
  return walkCache.get(buildingId) ?? null
}

const TYPE_LABEL: Record<RoomType, string> = {
  meeting: '会议室',
  classroom: '教室',
  lab: '实验室',
  study: '自习空间',
  venue: '场馆',
}

export const bookingHandler: Handler = (intent, ctx) => {
  const { slots } = intent
  const start = slots.start ?? nowHHMM(ctx.virtualTs)
  const end = slots.end ?? start

  if (intent.intent === 'schedule_query') {
    const floorMatch = slots.room?.match(/^(\d+)F$/)
    const types = extractRoomTypes(intent.rawText)
    const found = searchRooms(ctx.rooms, ctx.bookings, {
      ...(slots.buildingId ? { buildingId: slots.buildingId } : {}),
      ...(floorMatch ? { floor: Number(floorMatch[1]) } : {}),
      ...(types.length ? { types } : {}),
      at: { start, end },
    })
    const names = found.slice(0, 6).map((r) => r.name).join('、')
    return {
      steps: [
        { agent: '预约Agent', phase: 'plan', title: '抽取槽位', detail: `楼宇=${slots.building ?? '不限'} · 层位=${slots.room ?? '不限'} · 类型=${types.map((t) => TYPE_LABEL[t]).join('/') ?? '不限'}` },
        { agent: '预约Agent', phase: 'act', title: '查询排期', detail: `当前时段(${start} 起)空闲 ${found.length} 间` },
        { agent: '预约Agent', phase: 'verify', title: '课表交叉验证', detail: '已剔除课表与预约冲突' },
      ],
      result: {
        type: 'booking_candidates',
        message: found.length
          ? `当前时段空闲：${names}${found.length > 6 ? ` 等 ${found.length} 间` : ''}，已在右栏列出。`
          : '该时段没有空闲的匹配房间，可换个时段试试。',
        roomIds: found.map((r) => r.id),
      },
      effects: {
        activePanel: 'booking',
        sceneMode: 'booking',
        candidates: found.slice(0, 8).map((r) => ({ roomId: r.id, walkMin: walkOf(ctx, r.buildingId) })),
        highlightedRoomIds: found.map((r) => r.id),
      },
    }
  }

  const isClassroom = intent.intent === 'find_free_classroom'
  const mentioned = extractRoomTypes(intent.rawText)
  const types: RoomType[] = isClassroom
    ? ['classroom', 'study']
    : mentioned.length
      ? mentioned
      : ['meeting']

  const found = searchRooms(ctx.rooms, ctx.bookings, {
    types,
    ...(slots.capacity !== undefined ? { capacity: slots.capacity } : {}),
    ...(slots.equipment?.length ? { equipment: slots.equipment as DeviceType[] } : {}),
    ...(slots.buildingId ? { buildingId: slots.buildingId } : {}),
    at: { start, end },
  })
  const candidates = found
    .map((r) => ({ roomId: r.id, walkMin: walkOf(ctx, r.buildingId) }))
    .sort((a, b) => (a.walkMin ?? 999) - (b.walkMin ?? 999))
    .slice(0, 6)

  const slotDesc = [
    slots.capacity !== undefined ? `容量≥${slots.capacity}` : null,
    slots.equipment?.length ? `设备=${slots.equipment.length} 项` : null,
    `时间=${slots.time ?? `现在(${start})`}`,
    isClassroom ? '类型=教室/自习' : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return {
    steps: [
      { agent: '预约Agent', phase: 'plan', title: '抽取槽位', detail: slotDesc },
      { agent: '预约Agent', phase: 'act', title: '检索候选', detail: `检索 ${ctx.world.buildings.length} 栋楼 ${ctx.rooms.length} 间房间 → 命中 ${found.length} 间` },
      { agent: '预约Agent', phase: 'verify', title: '课表交叉验证', detail: `${found.length} 间候选当前时段均无课、无预约、非报修` },
    ],
    result: {
      type: 'booking_candidates',
      message: candidates.length
        ? `找到 ${candidates.length} 间候选${isClassroom ? '教室' : '空间'}，按距正门步行时间排序，请在右栏确认。`
        : '当前时段没有完全匹配的空闲房间，可降低人数或换个时段。',
      roomIds: candidates.map((c) => c.roomId),
      buildingIds: [...new Set(found.map((r) => r.buildingId))],
    },
    effects: {
      activePanel: 'booking',
      sceneMode: 'booking',
      candidates,
      highlightedRoomIds: candidates.map((c) => c.roomId),
    },
  }
}
