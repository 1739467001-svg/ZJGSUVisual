import type {
  AdminOverview,
  AgentName,
  Booking,
  Device,
  Intent,
  NavigationRoute,
  RepairDraft,
  Room,
  RoomCandidate,
  TaskResult,
  Ticket,
  WorldData,
} from '../types'

export interface HandlerContext {
  world: WorldData
  rooms: Room[]
  bookings: Booking[]
  tickets: Ticket[]
  devices: Device[]
  virtualTs: string
}

export interface StepDraft {
  agent: AgentName
  phase: 'plan' | 'act' | 'verify'
  title: string
  detail: string
}

/** handler 对 store 的副作用描述，由 dispatch 收集、store 统一落库 */
export interface CampusEffects {
  activePanel?: 'overview' | 'booking' | 'repair' | 'navigation' | 'admin'
  sceneMode?: 'idle' | 'searching' | 'booking' | 'repair' | 'overview' | 'navigation'
  heatMode?: 'none' | 'energy' | 'traffic' | 'occupancy'
  selectedBuildingId?: string
  selectedRoomId?: string
  highlightedRoomIds?: string[]
  candidates?: RoomCandidate[] | null
  repairDraft?: RepairDraft | null
  lastRoute?: NavigationRoute | null
  admin?: AdminOverview | null
  placeInfo?: { buildingId: string; walkMin: number | null } | null
}

export interface HandlerOutput {
  steps: StepDraft[]
  result: TaskResult
  effects?: CampusEffects
}

export type Handler = (intent: Intent, ctx: HandlerContext) => HandlerOutput
