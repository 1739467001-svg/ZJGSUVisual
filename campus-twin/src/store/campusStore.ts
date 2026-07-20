import { create } from 'zustand'
import type {
  AdminOverview,
  AgentStep,
  Booking,
  CampusSnapshot,
  Device,
  DeviceType,
  Intent,
  NavigationRoute,
  RepairDraft,
  Room,
  RoomCandidate,
  Shot,
  Ticket,
  WorldData,
} from '../types'
import { world } from '../data/world'
import { devices, rooms } from '../data/seedRooms'
import { dispatchCommand, type DispatchOptions } from '../agent/dispatchIntent'
import { nextBookingId, nextTicketId } from '../lib/ids'
import { nowHHMM, endPlus } from '../lib/time'
import { roomLabel } from '../lib/format'
import { DEMO_SCENARIOS } from '../data/demoScenarios'
import { simClock } from '../sim/clock'
import { pulseAt, trafficOnRoads } from '../sim/engine'

export interface CampusState {
  world: WorldData
  rooms: Room[]
  devices: Device[]
  bookings: Booking[]
  tickets: Ticket[]

  clock: { virtualTs: string; rate: 0 | 1 | 10 | 60; running: boolean }
  snapshot: CampusSnapshot // 模拟引擎按 clock 产出，1Hz 节流刷新
  traffic: Record<string, number> // roadId -> 人流权重 0..1（TrafficModel）

  currentIntent?: Intent
  agentSteps: AgentStep[]
  messages: { role: 'user' | 'agent'; text: string; ts: number }[]
  running: boolean // 指令执行中（输入禁用）

  selectedRoomId?: string
  selectedBuildingId?: string
  highlightedRoomIds: string[]
  activePanel: 'overview' | 'booking' | 'repair' | 'navigation' | 'admin'
  sceneMode: 'idle' | 'searching' | 'booking' | 'repair' | 'overview' | 'navigation'
  heatMode: 'none' | 'energy' | 'traffic' | 'occupancy'
  sceneNonce: number // 每次指令落库 +1：Wow 效果组件以此幂等重播
  drill: { level: 0 | 1 | 2 | 3; buildingId?: string; floor?: number; roomId?: string }
  cameraShot?: Shot
  quality: 'high' | 'low'

  // 阶段 2 业务结果（供右栏面板渲染）
  candidates: RoomCandidate[] | null
  repairDraft: RepairDraft | null
  lastRoute: NavigationRoute | null
  placeInfo: { buildingId: string; walkMin: number | null } | null
  admin: AdminOverview | null

  setActivePanel: (p: CampusState['activePanel']) => void
  setDrill: (d: CampusState['drill']) => void
  setHeatMode: (m: CampusState['heatMode']) => void
  setClockRate: (r: CampusState['clock']['rate']) => void
  resetView: () => void
  setVirtualTs: (iso: string) => void
  setCameraShot: (shot?: Shot) => void
  setQuality: (q: CampusState['quality']) => void
  selectBuilding: (id?: string) => void
  selectRoom: (id?: string) => void

  submitCommand: (text: string, opts?: DispatchOptions) => Promise<void>
  confirmBooking: (roomId: string) => void
  createTicket: (input: { roomId: string; deviceType?: DeviceType; desc: string }) => Ticket
  advanceTicket: (id: string) => void
  runDemoScript: (id: 'booking' | 'repair' | 'overview' | 'navigate', opts?: DispatchOptions) => Promise<void>
}

// 虚拟时钟起点：周二 09:58（规格 §3.4，临近下课、潮汐最戏剧化的时刻）
const CLOCK_START = '2026-03-03T09:58:00'

const agentMessage = (text: string) => ({ role: 'agent' as const, text, ts: Date.now() })

// 意图 → 场景模式（批次 1：sceneMode 统一在此重设，handler 不再各自赋值）
const INTENT_SCENE_MODE: Record<Intent['intent'], CampusState['sceneMode']> = {
  book_room: 'searching',
  find_free_classroom: 'searching',
  schedule_query: 'searching',
  repair: 'repair',
  admin_overview: 'overview',
  energy_insight: 'overview',
  navigate: 'navigation',
  where_is: 'navigation',
  unknown: 'idle',
}

export const useCampusStore = create<CampusState>((set, get) => ({
  world,
  rooms,
  devices,
  bookings: [],
  tickets: [],

  clock: { virtualTs: CLOCK_START, rate: 60, running: true },
  snapshot: pulseAt(world, rooms, [], new Date(CLOCK_START)),
  traffic: trafficOnRoads(world, new Date(CLOCK_START)),

  agentSteps: [],
  messages: [],
  running: false,

  highlightedRoomIds: [],
  activePanel: 'overview',
  sceneMode: 'idle',
  heatMode: 'none',
  sceneNonce: 0,
  drill: { level: 0 },
  quality: 'high',

  candidates: null,
  repairDraft: null,
  lastRoute: null,
  placeInfo: null,
  admin: null,

  setActivePanel: (p) => set({ activePanel: p }),
  setDrill: (d) => set({ drill: d }),
  // 手动热力：开 → topdown 俯视，关 → 回总览（任务态热力由 HeatLayer 驱动，不冲突）
  setHeatMode: (m) =>
    set({ heatMode: m, cameraShot: m === 'none' ? { kind: 'overview' } : { kind: 'topdown', ms: 1500 } }),
  setClockRate: (r) => {
    simClock.setRate(r)
    set((s) => ({ clock: { ...s.clock, rate: r, running: r > 0 } }))
  },
  // 视图复位（批次 2）：只复位镜头/钻取/热力/场景，绝不清 candidates/bookings 等业务数据
  resetView: () =>
    set({
      drill: { level: 0 },
      heatMode: 'none',
      sceneMode: 'idle',
      cameraShot: { kind: 'overview' },
      selectedBuildingId: undefined,
      selectedRoomId: undefined,
    }),
  // 时间轴滑杆直接设时刻；snapshot/traffic 立即重算（平时由 ClockBridge 1Hz 刷新）
  setVirtualTs: (iso) => {
    const t = new Date(iso)
    simClock.setTime(t)
    set((s) => ({
      clock: { ...s.clock, virtualTs: iso },
      snapshot: pulseAt(s.world, s.rooms, s.tickets, t),
      traffic: trafficOnRoads(s.world, t),
    }))
  },
  setCameraShot: (shot) => set({ cameraShot: shot }),
  setQuality: (q) => set({ quality: q }),
  selectBuilding: (id) => set({ selectedBuildingId: id }),
  selectRoom: (id) => set({ selectedRoomId: id }),

  submitCommand: async (text, opts) => {
    const s = get()
    if (s.running || !text.trim()) return
    set({
      running: true,
      agentSteps: [],
      currentIntent: undefined,
      // 指令级状态重置（批次 1 根因修复）：仅在此入口发生一次，
      // 跨任务上下文（候选/高亮/路径/报修草稿/钻取）不残留到下一个指令
      candidates: null,
      highlightedRoomIds: [],
      lastRoute: null,
      repairDraft: null,
      placeInfo: null,
      drill: { level: 0 },
      messages: [...s.messages, { role: 'user', text, ts: Date.now() }],
    })
    try {
      const { intent, result, effects } = await dispatchCommand(
        text,
        {
          world: s.world,
          rooms: get().rooms,
          bookings: get().bookings,
          tickets: get().tickets,
          devices: get().devices,
          virtualTs: s.clock.virtualTs,
          snapshot: get().snapshot,
        },
        (step) => set((cur) => ({ agentSteps: [...cur.agentSteps, step] })),
        opts ?? {},
      )
      // sceneMode 按意图统一重设；handler effects 覆盖其余业务字段
      const sceneMode = effects.sceneMode ?? INTENT_SCENE_MODE[intent.intent]
      set((cur) => ({
        currentIntent: intent,
        ...effects,
        sceneMode,
        // 离开态势场景时热力指标复位（除非 handler 显式给出）
        heatMode: effects.heatMode ?? (sceneMode !== 'overview' ? 'none' : cur.heatMode),
        sceneNonce: cur.sceneNonce + 1,
        messages: [...cur.messages, agentMessage(result.message)],
      }))
    } finally {
      set({ running: false })
    }
  },

  confirmBooking: (roomId) => {
    const s = get()
    const room = s.rooms.find((r) => r.id === roomId)
    if (!room) return
    const slots = s.currentIntent?.intent === 'book_room' ? s.currentIntent.slots : undefined
    const start = slots?.start ?? nowHHMM(s.clock.virtualTs)
    const end = slots?.end ?? endPlus(start, 60)
    const booking: Booking = {
      id: nextBookingId(),
      roomId,
      user: '演示用户',
      start,
      end,
      status: 'ok',
      createdAt: new Date().toISOString(),
    }
    set((cur) => ({
      bookings: [...cur.bookings, booking],
      // 任务闭环：清掉候选高亮，该楼光带回落为 busy（沙盘可见状态联动）
      highlightedRoomIds: [],
      rooms: cur.rooms.map((r) => (r.id === roomId ? { ...r, status: 'busy' as const } : r)),
      messages: [
        ...cur.messages,
        agentMessage(`预约成功：${roomLabel(room)}，${start}–${end}，预约号 ${booking.id}。`),
      ],
    }))
  },

  createTicket: ({ roomId, deviceType, desc }) => {
    const s = get()
    const room = s.rooms.find((r) => r.id === roomId)
    const deviceId = deviceType && s.devices.some((d) => d.id === `${roomId}-${deviceType}`)
      ? `${roomId}-${deviceType}`
      : undefined
    const ticket: Ticket = {
      id: nextTicketId(),
      roomId,
      desc,
      status: 'new',
      assignee: '待派单',
      createdAt: new Date().toISOString(),
      ...(deviceId ? { deviceId } : {}),
    }
    set((cur) => ({
      tickets: [...cur.tickets, ticket],
      repairDraft: null,
      rooms: cur.rooms.map((r) => (r.id === roomId ? { ...r, status: 'repair' as const } : r)),
      devices: cur.devices.map((d) => (d.id === deviceId ? { ...d, status: 'fault' as const } : d)),
      messages: [
        ...cur.messages,
        agentMessage(`工单 ${ticket.id} 已创建：${room ? roomLabel(room) : roomId}，${desc}（待受理）。`),
      ],
    }))
    return ticket
  },

  advanceTicket: (id) => {
    const s = get()
    const ticket = s.tickets.find((t) => t.id === id)
    if (!ticket || ticket.status === 'done') return
    const next = ticket.status === 'new' ? ('doing' as const) : ('done' as const)

    // 房间状态推导（批次 1 修正）：done 时——
    // 该房间还有其他未闭环工单 → 保持 repair；否则有进行中预约 → busy；都没有 → free
    let roomStatus: 'free' | 'busy' | 'repair' | null = null
    if (next === 'done') {
      const hasOpenTicket = s.tickets.some((t) => t.roomId === ticket.roomId && t.id !== id && t.status !== 'done')
      const hasActiveBooking = s.bookings.some((b) => b.roomId === ticket.roomId && b.status === 'ok')
      roomStatus = hasOpenTicket ? 'repair' : hasActiveBooking ? 'busy' : 'free'
    }

    set((cur) => ({
      tickets: cur.tickets.map((t) =>
        t.id === id ? { ...t, status: next, assignee: next === 'doing' ? '维修组 · 王师傅' : t.assignee } : t,
      ),
      rooms:
        roomStatus !== null
          ? cur.rooms.map((r) => (r.id === ticket.roomId ? { ...r, status: roomStatus } : r))
          : cur.rooms,
      devices:
        next === 'done'
          ? cur.devices.map((d) => (d.id === ticket.deviceId ? { ...d, status: 'ok' as const } : d))
          : cur.devices,
      messages: [
        ...cur.messages,
        agentMessage(
          `工单 ${id} → ${
            next === 'doing'
              ? '处理中（维修组 · 王师傅）'
              : roomStatus === 'free'
                ? '已完成，房间恢复可用'
                : roomStatus === 'busy'
                  ? '已完成，房间回到占用态'
                  : '已完成，该房间仍有未闭环工单'
          }。`,
        ),
      ],
    }))
  },

  runDemoScript: async (id, opts) => {
    const scenario = DEMO_SCENARIOS.find((s) => s.id === id)
    if (scenario) await get().submitCommand(scenario.text, opts)
  },
}))
