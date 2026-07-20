import type { BuildingSpec, WorldData } from '../types'
// 世界底稿是单文件 JSON：未来可整体替换为测绘/真实系统数据，业务代码不感知
import worldJson from '../../public/campus-zjgsu.json'

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

// 最小运行时校验：结构不对时尽早报错，而不是在渲染期炸
function assertWorldData(raw: unknown): asserts raw is WorldData {
  if (!isRecord(raw)) throw new Error('campus-zjgsu.json: 顶层必须是对象')
  if (!Array.isArray(raw.buildings) || raw.buildings.length === 0) {
    throw new Error('campus-zjgsu.json: buildings 缺失或为空')
  }
  for (const b of raw.buildings as unknown[]) {
    if (
      !isRecord(b) ||
      typeof b.id !== 'string' ||
      typeof b.name !== 'string' ||
      !Array.isArray(b.position) ||
      !Array.isArray(b.footprint) ||
      typeof b.floors !== 'number'
    ) {
      throw new Error(`campus-zjgsu.json: 楼宇字段不完整 ${JSON.stringify(b)}`)
    }
  }
  for (const key of ['gates', 'roads', 'water', 'plazas', 'distantQuarters', 'contextBuildings', 'greenery'] as const) {
    if (!Array.isArray(raw[key])) throw new Error(`campus-zjgsu.json: ${key} 必须是数组`)
  }
  if (!isRecord(raw.spokenAliases)) throw new Error('campus-zjgsu.json: spokenAliases 缺失')
}

assertWorldData(worldJson)
export const world: WorldData = worldJson

// 场景中心（bounds 中心）：总览镜头、地面、首屏俯冲入场的共同锚点
export const worldCenter: [number, number] = [
  (world.bounds.west + world.bounds.east) / 2,
  (world.bounds.north + world.bounds.south) / 2,
]

const buildingIndex = new Map(world.buildings.map((b) => [b.id, b]))

export function buildingById(id: string): BuildingSpec | undefined {
  return buildingIndex.get(id)
}

// 归一化：去空格、剥离结尾的「学院/楼/大楼」类后缀（可叠置，如"外语学院楼"）
function normalize(text: string): string {
  return text.trim().replace(/\s+/g, '').replace(/(学院|大楼|楼)+$/g, '')
}

/**
 * 口语楼名解析（规格 §3.3）：
 * 归一化 → 查 spokenAliases 表 → 楼宇 name/alias 归一化精确匹配 → 包含匹配兜底
 */
export function resolveSpokenName(text: string): BuildingSpec | undefined {
  const norm = normalize(text)
  if (!norm) return undefined

  for (const [alias, id] of Object.entries(world.spokenAliases)) {
    if (normalize(alias) === norm) return buildingById(id)
  }

  const exact = world.buildings.find((b) => {
    if (normalize(b.name) === norm) return true
    return b.alias.some((a) => normalize(a) === norm)
  })
  if (exact) return exact

  if (norm.length < 2) return undefined
  return world.buildings.find((b) => {
    if (normalize(b.name).includes(norm)) return true
    return b.alias.some((a) => {
      const na = normalize(a)
      return na.includes(norm) || (na.length >= 2 && norm.includes(na))
    })
  })
}
