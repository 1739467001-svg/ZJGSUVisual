import { create } from 'zustand'
import type {
  AgentStep,
  Booking,
  CampusSnapshot,
  Device,
  DeviceType,
  Intent,
  Room,
  Shot,
  Ticket,
  WorldData,
} from '../types'
import { world } from '../data/world'
import { devices, rooms } from '../data/seedRooms'

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

  selectedRoomId?: string
  selectedBuildingId?: string
  highlightedRoomIds: string[]
  activePanel: 'overview' | 'booking' | 'repair' | 'navigation' | 'admin'
  sceneMode: 'idle' | 'searching' | 'booking' | 'repair' | 'overview' | 'navigation'
  heatMode: 'none' | 'energy' | 'traffic' | 'occupancy'
  drill: { level: 0 | 1 | 2 | 3; buildingId?: string; floor?: number; roomId?: string }
  cameraShot?: Shot
  quality: 'high' | 'low'

  setActivePanel: (p: CampusState['activePanel']) => void
  setDrill: (d: CampusState['drill']) => void
  setHeatMode: (m: CampusState['heatMode']) => void
  setClockRate: (r: CampusState['clock']['rate']) => void
  selectBuilding: (id?: string) => void
  selectRoom: (id?: string) => void

  // 以下为阶段 2 实现的 Agent/业务闭环，当前保留类型正确的占位
  submitCommand: (text: string) => Promise<void>
  confirmBooking: (roomId: string) => void
  createTicket: (input: { roomId: string; deviceType?: DeviceType; desc: string }) => Ticket
  advanceTicket: (id: string) => void
  runDemoScript: (id: 'booking' | 'repair' | 'overview' | 'navigate') => Promise<void>
}

// 虚拟时钟起点：周二 09:58（规格 §3.4，临近下课、潮汐最戏剧化的时刻）
const CLOCK_START = '2026-03-03T09:58:00'

export const useCampusStore = create<CampusState>((set) => ({
  world,
  rooms,
  devices,
  bookings: [],
  tickets: [],

  clock: { virtualTs: CLOCK_START, rate: 60, running: true },
  snapshot: { ts: CLOCK_START, pulses: {}, totalHeadcount: 0, totalPowerKw: 0, occupancyOverall: 0 },

  agentSteps: [],
  messages: [],

  highlightedRoomIds: [],
  activePanel: 'overview',
  sceneMode: 'idle',
  heatMode: 'none',
  drill: { level: 0 },
  quality: 'high',

  setActivePanel: (p) => set({ activePanel: p }),
  setDrill: (d) => set({ drill: d }),
  setHeatMode: (m) => set({ heatMode: m }),
  setClockRate: (r) => set((s) => ({ clock: { ...s.clock, rate: r, running: r > 0 } })),
  selectBuilding: (id) => set({ selectedBuildingId: id }),
  selectRoom: (id) => set({ selectedRoomId: id }),

  // 阶段 2 实现：规则 Agent 解析 + 编排步骤流
  submitCommand: async () => {},
  // 阶段 2 实现：确认候选房间 -> 生成预约并联动沙盘/面板
  confirmBooking: () => {},
  // 阶段 2 完善：设备关联、agent 回执；当前先保证工单可生成、类型正确
  createTicket: ({ roomId, deviceType, desc }) => {
    const ticket: Ticket = {
      id: `RP-${String(Date.now() % 100000).padStart(5, '0')}`,
      roomId,
      desc,
      status: 'new',
      assignee: '待分配',
      createdAt: new Date().toISOString(),
      ...(deviceType ? { deviceId: `${roomId}-${deviceType}` } : {}),
    }
    set((s) => ({ tickets: [...s.tickets, ticket] }))
    return ticket
  },
  // 阶段 2 实现：工单状态推进 待受理 -> 处理中 -> 已完成
  advanceTicket: () => {},
  // 阶段 2 实现：四条链路一键演示脚本
  runDemoScript: async () => {},
}))
