// 规格 v3.0 §6 数据模型全量类型

// —— 世界（静态，来自 campus-zjgsu.json）——
export type BuildingKind =
  | 'library'
  | 'admin'
  | 'teaching'
  | 'faculty'
  | 'venue'
  | 'sports'
  | 'canteen'
  | 'dorm'

export interface BuildingSpec {
  id: string
  name: string
  fullName?: string
  alias: string[]
  kind: BuildingKind
  position: [number, number] // x, z（米）
  footprint: [number, number] // 宽, 深（米）
  floors: number
  floorHeight: number
  realFloors?: string
  area?: number
  completed?: number
  honor?: string
  address?: string
  landmark?: boolean
  layoutConfidence?: 'archive' | 'abstract' | 'osm'
  outline?: [number, number][] // v4：OSM 真实平面轮廓（本地坐标，未闭合）；缺省时按 footprint 盒体渲染
  tags: string[]
  floorGuide?: { level: number; name: string }[]
}

// v4：核心区内 OSM 配角建筑（灰色体量，不可交互）
export interface ContextBuilding {
  id: string
  name?: string
  outline: [number, number][]
  height: number
}

// v4：OSM 绿地/公园多边形
export interface GreeneryPatch {
  id: string
  kind: string
  outline: [number, number][]
}

export interface Gate {
  id: string
  name: string
  alias: string[]
  position: [number, number, number] // x, y, z（米）
}

export interface Road {
  id: string
  name: string
  kind: 'city' | 'main' | 'minor'
  width: number
  path: [number, number][]
}

export type WaterBody =
  | { id: string; name: string; kind: 'lake'; outline: [number, number][] }
  | { id: string; name: string; kind: 'river'; width: number; path: [number, number][] }

export interface Plaza {
  id: string
  name: string
  center: [number, number]
  size: [number, number]
}

export interface DistantQuarter {
  id: string
  name: string
  kind: 'dorm'
  center: [number, number]
  blocks: number
  blockSize: [number, number]
  floors: number
}

export interface WorldData {
  buildings: BuildingSpec[]
  gates: Gate[]
  roads: Road[]
  water: WaterBody[]
  plazas: Plaza[]
  contextBuildings: ContextBuilding[]
  greenery: GreeneryPatch[]
  distantQuarters: DistantQuarter[]
  spokenAliases: Record<string, string>
  bounds: { west: number; east: number; north: number; south: number }
}

// —— 业务（运行时，种子生成）——
export type RoomType = 'meeting' | 'classroom' | 'lab' | 'venue' | 'study'
export type RoomStatus = 'free' | 'busy' | 'repair'
export type DeviceType = 'projector' | 'ac' | 'light' | 'mic' | 'screen' | 'computer'
export type TicketStatus = 'new' | 'doing' | 'done'

export interface Room {
  id: string // `${buildingId}-${floor}${seq}` 如 jxc-302
  buildingId: string
  floor: number
  name: string // "302"
  type: RoomType
  capacity: number
  equipment: DeviceType[]
  status: RoomStatus
  schedule: ScheduleItem[] // 当日课表/占用
}

export interface ScheduleItem {
  start: string
  end: string
  title: string
  by: string
}

export interface Device {
  id: string
  roomId: string
  type: DeviceType
  status: 'ok' | 'fault'
}

export interface Booking {
  id: string
  roomId: string
  user: string
  start: string
  end: string
  status: 'ok' | 'cancelled'
  createdAt: string
}

export interface Ticket {
  id: string
  roomId: string
  deviceId?: string
  desc: string
  status: TicketStatus
  assignee: string
  createdAt: string
}

// —— 模拟引擎输出（按虚拟时刻 t 采样）——
export interface BuildingPulse {
  buildingId: string
  occupancy: number // 0..1 占用率
  headcount: number // 估算在楼人数
  powerKw: number // 当前功率
  alerts: number // 未闭环工单数
}

export interface CampusSnapshot {
  ts: string // 虚拟时间 ISO
  pulses: Record<string, BuildingPulse>
  totalHeadcount: number
  totalPowerKw: number
  occupancyOverall: number
}

// —— Agent ——
export type IntentName =
  | 'book_room'
  | 'find_free_classroom'
  | 'repair'
  | 'navigate'
  | 'admin_overview'
  | 'where_is'
  | 'schedule_query'
  | 'energy_insight'
  | 'unknown'

export type AgentName = '调度Agent' | '预约Agent' | '报修Agent' | '导航Agent' | '态势Agent'

export interface Intent {
  intent: IntentName
  slots: {
    time?: string
    start?: string
    end?: string
    capacity?: number
    equipment?: string[]
    building?: string
    buildingId?: string
    room?: string
    device?: string
    from?: string
    fromId?: string
    target?: string
    targetId?: string
  }
  agent: AgentName
  confidence: number
  rawText: string
}

export interface AgentStep {
  id: string
  agent: AgentName
  phase: 'plan' | 'act' | 'verify' // 规划-执行-验证
  title: string
  detail: string
  status: 'waiting' | 'running' | 'done' | 'error'
  ts: number
}

export interface TaskResult {
  type:
    | 'booking_candidates'
    | 'booking_done'
    | 'ticket_created'
    | 'overview'
    | 'navigation'
    | 'answer'
    | 'unknown'
  message: string
  roomIds?: string[]
  buildingIds?: string[]
  bookingId?: string
  ticketId?: string
  route?: NavigationRoute
}

export interface NavigationRoute {
  from: { kind: 'gate' | 'building'; id: string }
  to: { kind: 'gate' | 'building'; id: string }
  waypoints: [number, number][] // 贴路网折线
  distanceM: number
  walkMin: number
  segments: { text: string; landmark?: string; to: [number, number] }[]
  accessible?: boolean
}

// —— 阶段 2 运行态（store 扩展，业务执行的真实结果）——
export interface RoomCandidate {
  roomId: string
  walkMin: number | null // 距正门步行分钟
}

export interface RepairDraft {
  buildingId?: string
  roomId?: string
  deviceType?: DeviceType
  desc: string
}

export interface AdminOverview {
  occupancyOverall: number // 0..1
  headcount: number
  totalPowerKw: number
  activeTickets: number
  top: { buildingId: string; occupancy: number }[]
  anomalies: { id: string; text: string; buildingId?: string; roomId?: string }[]
  advice: string[]
}

// —— 3D 镜头语言（规格 §9.6）——
export type Shot =
  | { kind: 'overview' }
  | { kind: 'push'; buildingId: string; ms: number }
  | { kind: 'orbit'; buildingId: string; ms: number }
  | { kind: 'follow'; route: NavigationRoute; ms: number }
  | { kind: 'topdown'; ms: number }
  | { kind: 'room'; roomId: string; ms: number }
