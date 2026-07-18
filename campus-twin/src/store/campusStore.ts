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

export interface CampusState {
  world: WorldData
  rooms: Room[]
  devices: Device[]
  bookings: Booking[]
  tickets: Ticket[]

  clock: { virtualTs: string; rate: 0 | 1 | 10 | 60; running: boolean }
  snapshot: CampusSnapshot // 阶段 5 由模拟引擎按 clock 产出，当前为空壳

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
  setVirtualTs: (iso: string) => void
  setCameraShot: (shot?: Shot) => void
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

export const useCampusStore = create<CampusState>((set, get) => ({
  world,
  rooms,
  devices,
  bookings: [],
  tickets: [],

  clock: { virtualTs: CLOCK_START, rate: 60, running: true },
  snapshot: { ts: CLOCK_START, pulses: {}, totalHeadcount: 0, totalPowerKw: 0, occupancyOverall: 0 },

  agentSteps: [],
  messages: [],
  running: false,

  highlightedRoomIds: [],
  activePanel: 'overview',
  sceneMode: 'idle',
  heatMode: 'none',
  drill: { level: 0 },
  quality: 'high',

  candidates: null,
  repairDraft: null,
  lastRoute: null,
  placeInfo: null,
  admin: null,

  setActivePanel: (p) => set({ activePanel: p }),
  setDrill: (d) => set({ drill: d }),
  setHeatMode: (m) => set({ heatMode: m }),
  setClockRate: (r) => {
    simClock.setRate(r)
    set((s) => ({ clock: { ...s.clock, rate: r, running: r > 0 } }))
  },
  // 时间轴滑杆直接设时刻；virtualTs 平时由 ClockBridge 以 ~1Hz 从 simClock 回同步
  setVirtualTs: (iso) => {
    simClock.setTime(new Date(iso))
    set((s) => ({ clock: { ...s.clock, virtualTs: iso } }))
  },
  setCameraShot: (shot) => set({ cameraShot: shot }),
  selectBuilding: (id) => set({ selectedBuildingId: id }),
  selectRoom: (id) => set({ selectedRoomId: id }),

  submitCommand: async (text, opts) => {
    const s = get()
    if (s.running || !text.trim()) return
    set({
      running: true,
      agentSteps: [],
      currentIntent: undefined,
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
        },
        (step) => set((cur) => ({ agentSteps: [...cur.agentSteps, step] })),
        opts ?? {},
      )
      set((cur) => ({
        currentIntent: intent,
        ...effects,
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
    set((cur) => ({
      tickets: cur.tickets.map((t) =>
        t.id === id ? { ...t, status: next, assignee: next === 'doing' ? '维修组 · 王师傅' : t.assignee } : t,
      ),
      // 工单闭环后房间恢复可用、设备恢复在线
      rooms:
        next === 'done'
          ? cur.rooms.map((r) => (r.id === ticket.roomId ? { ...r, status: 'free' as const } : r))
          : cur.rooms,
      devices:
        next === 'done'
          ? cur.devices.map((d) => (d.id === ticket.deviceId ? { ...d, status: 'ok' as const } : d))
          : cur.devices,
      messages: [
        ...cur.messages,
        agentMessage(`工单 ${id} → ${next === 'doing' ? '处理中（维修组 · 王师傅）' : '已完成，房间恢复可用'}。`),
      ],
    }))
  },

  runDemoScript: async (id, opts) => {
    const scenario = DEMO_SCENARIOS.find((s) => s.id === id)
    if (scenario) await get().submitCommand(scenario.text, opts)
  },
}))
