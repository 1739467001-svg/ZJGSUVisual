import { findRoute, getGraph } from '../../lib/pathfind'
import { resolvePlace } from '../aliases'
import type { Handler } from '../handlerTypes'

function regionWord(x: number, z: number): string {
  const ns = z < -80 ? '北' : z > 80 ? '南' : ''
  const we = x < -80 ? '西' : x > 80 ? '东' : ''
  return `校园${we}${ns}部`.replace('校园部', '校园中部')
}

export const navigationHandler: Handler = (intent, ctx) => {
  const { slots } = intent

  if (intent.intent === 'where_is') {
    const b = slots.targetId ? ctx.world.buildings.find((x) => x.id === slots.targetId) : undefined
    if (!b) {
      return {
        steps: [{ agent: '导航Agent', phase: 'verify', title: '目标解析失败', detail: `「${slots.target ?? ''}」未匹配到楼宇` }],
        result: { type: 'answer', message: '没认出你想找的地点，可以试试「信电学院在哪」。' },
      }
    }
    const route = findRoute(ctx.world, { kind: 'gate', id: 'gate-east' }, { kind: 'building', id: b.id })
    const [x, z] = b.position
    return {
      steps: [
        { agent: '导航Agent', phase: 'plan', title: '目标解析', detail: `「${slots.target}」→ ${b.name}` },
        { agent: '导航Agent', phase: 'act', title: '位置计算', detail: `${regionWord(x, z)} · 距正门步行约 ${route?.walkMin ?? '-'} 分钟` },
      ],
      result: {
        type: 'answer',
        message: `${b.name}在${regionWord(x, z)}，距正门步行约 ${route?.walkMin ?? '-'} 分钟。`,
        buildingIds: [b.id],
      },
      effects: {
        activePanel: 'navigation',
        selectedBuildingId: b.id,
        placeInfo: { buildingId: b.id, walkMin: route?.walkMin ?? null },
        lastRoute: null,
      },
    }
  }

  // navigate：起点缺省正门（规格 §5.4）
  const fromRef = slots.from ? resolvePlace(slots.from) : { kind: 'gate' as const, id: 'gate-east', name: '正门（学正街）', surface: '正门' }
  const toRef = slots.target ? resolvePlace(slots.target) : undefined
  if (!fromRef || !toRef) {
    return {
      steps: [{ agent: '导航Agent', phase: 'verify', title: '起终点解析失败', detail: `从「${slots.from ?? '正门'}」到「${slots.target ?? '?'}」` }],
      result: { type: 'answer', message: '没认出起点或终点，可以说「我从正门怎么去图书馆」。' },
    }
  }
  const route = findRoute(ctx.world, { kind: fromRef.kind, id: fromRef.id }, { kind: toRef.kind, id: toRef.id })
  if (!route) {
    return {
      steps: [{ agent: '导航Agent', phase: 'verify', title: '路径求解失败', detail: '路网中未找到可用路径' }],
      result: { type: 'answer', message: '暂时没有搜到可行路径。' },
    }
  }

  const g = getGraph(ctx.world)
  return {
    steps: [
      { agent: '导航Agent', phase: 'plan', title: '解析起终点', detail: `从 ${fromRef.name} → ${toRef.name}` },
      { agent: '导航Agent', phase: 'act', title: '路网最短路径', detail: `路网 ${g.nodeCount} 节点 / Dijkstra → 全程 ${route.distanceM}m` },
      { agent: '导航Agent', phase: 'verify', title: '贴路校验', detail: '路径贴合路网，未穿越楼宇 footprint' },
    ],
    result: {
      type: 'navigation',
      message: `${fromRef.name} → ${toRef.name}：全程 ${route.distanceM}m，步行约 ${route.walkMin} 分钟，分段指引在右栏。`,
      route,
      ...(toRef.kind === 'building' ? { buildingIds: [toRef.id] } : {}),
    },
    effects: {
      activePanel: 'navigation',
      sceneMode: 'navigation',
      lastRoute: route,
      placeInfo: null,
      ...(toRef.kind === 'building' ? { selectedBuildingId: toRef.id } : {}),
    },
  }
}
