import type { NavigationRoute, WorldData } from '../types'

// 路径建图（规格 §5.4）：roads 折线求交建图，交点吸附容差 8m；
// 大门与楼宇由 position 向最近道路点垂直投影接入；穿楼路段不可走。
// 布局现实的两个补丁（抽象布局误差兜底，与规格兜底条款一致）：
//  - 学正街/学林街/馆前环路在底稿中与主路网不相交，楼宇只接入主连通分量所在道路
//  - 中央礼仪轴末端伸入图书馆 footprint，穿楼断边对本楼接入口豁免
const SNAP_T = 8 // 交点吸附容差（米）
const MERGE_T = 1 // 节点去重容差（米）
const WALK_M_PER_MIN = 80
const FOOTPRINT_SHRINK = 1 // 穿楼判定内缩，避免贴边路段误判

type Pt = [number, number]

interface GNode {
  p: Pt
}

interface AdjEdge {
  to: number
  w: number
  roadId?: string
  roadName?: string
}

export interface PathGraph {
  nodes: GNode[]
  adj: AdjEdge[][]
  entry: Map<string, number> // `${kind}:${id}` -> 场所端点节点
  nodeCount: number
  edgeCount: number
}

const dist = (a: Pt, b: Pt): number => Math.hypot(a[0] - b[0], a[1] - b[1])

/** 点到线段最近点 */
function closestOnSegment(p: Pt, a: Pt, b: Pt): { point: Pt; t: number; d: number } {
  const ab: Pt = [b[0] - a[0], b[1] - a[1]]
  const len2 = ab[0] * ab[0] + ab[1] * ab[1]
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1]) / len2))
  const point: Pt = [a[0] + ab[0] * t, a[1] + ab[1] * t]
  return { point, t, d: dist(p, point) }
}

/** 线段-线段最近距离与最近点对（相交时 d=0） */
function segSegClosest(a1: Pt, a2: Pt, b1: Pt, b2: Pt): { d: number; pa: Pt; pb: Pt } {
  const d1 = [a2[0] - a1[0], a2[1] - a1[1]]
  const d2 = [b2[0] - b1[0], b2[1] - b1[1]]
  const denom = d1[0] * d2[1] - d1[1] * d2[0]
  if (denom !== 0) {
    const t = ((b1[0] - a1[0]) * d2[1] - (b1[1] - a1[1]) * d2[0]) / denom
    const u = ((b1[0] - a1[0]) * d1[1] - (b1[1] - a1[1]) * d1[0]) / denom
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      const pa: Pt = [a1[0] + d1[0] * t, a1[1] + d1[1] * t]
      return { d: 0, pa, pb: pa }
    }
  }
  let best = { d: Infinity, pa: a1 as Pt, pb: b1 as Pt }
  const candidates: [Pt, Pt, Pt, boolean][] = [
    [a1, b1, b2, false],
    [a2, b1, b2, false],
    [b1, a1, a2, true],
    [b2, a1, a2, true],
  ]
  for (const [p, a, b, onA] of candidates) {
    const c = closestOnSegment(p, a, b)
    if (c.d < best.d) best = { d: c.d, pa: onA ? c.point : p, pb: onA ? p : c.point }
  }
  return best
}

/** 线段与多边形边的交点参数 t（沿 a→b），平行/共线返回 null（擦墙不阻断） */
function segSegIntersectT(a: Pt, b: Pt, c: Pt, d: Pt): number | null {
  const rx = b[0] - a[0]
  const rz = b[1] - a[1]
  const sx = d[0] - c[0]
  const sz = d[1] - c[1]
  const den = rx * sz - rz * sx
  if (den === 0) return null
  const t = ((c[0] - a[0]) * sz - (c[1] - a[1]) * sx) / den
  const u = ((c[0] - a[0]) * rz - (c[1] - a[1]) * rx) / den
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? t : null
}

function pointInPoly(p: Pt, poly: Pt[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i]
    const [xj, zj] = poly[j]
    if (zi > p[1] !== zj > p[1] && p[0] < ((xj - xi) * (p[1] - zi)) / (zj - zi) + xi) inside = !inside
  }
  return inside
}

/**
 * 线段是否穿过（而非擦过）多边形：端点在内部，或穿越弦长 > 3m。
 * v4：楼宇用 OSM 真实轮廓，GPS 贴墙路按擦墙放行（等效旧版 FOOTPRINT_SHRINK 的容差）
 */
function segHitsPoly(a: Pt, b: Pt, poly: Pt[]): boolean {
  if (pointInPoly(a, poly) || pointInPoly(b, poly)) return true
  const ts: number[] = []
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const t = segSegIntersectT(a, b, poly[j], poly[i])
    if (t !== null) ts.push(t)
  }
  if (ts.length < 2) return false
  ts.sort((x, y) => x - y)
  const segLen = dist(a, b)
  for (let i = 0; i + 1 < ts.length; i += 2) {
    if ((ts[i + 1] - ts[i]) * segLen > 3) return true
  }
  return false
}

/** 楼体碰撞多边形：有 outline 用真实轮廓；否则 footprint 矩形（保留内缩容差） */
function buildingPoly(b: { position: [number, number]; footprint: [number, number]; outline?: [number, number][] }): Pt[] {
  if (b.outline?.length) return b.outline as Pt[]
  const cx = b.position[0]
  const cz = b.position[1]
  const hw = b.footprint[0] / 2 - FOOTPRINT_SHRINK
  const hd = b.footprint[1] / 2 - FOOTPRINT_SHRINK
  return [
    [cx - hw, cz - hd],
    [cx + hw, cz - hd],
    [cx + hw, cz + hd],
    [cx - hw, cz + hd],
  ]
}

interface Cut {
  segIdx: number
  t: number
  p: Pt
}

interface RawGraph {
  nodes: GNode[]
  adj: AdjEdge[][]
  addNode: (p: Pt) => number
  addEdge: (a: number, b: number, roadId?: string, roadName?: string) => void
}

function newRawGraph(): RawGraph {
  const nodes: GNode[] = []
  const adj: AdjEdge[][] = []
  // 节点去重空间网格：MERGE_T=1m 网格 + 3×3 邻域查找，避免 O(n²) 全扫
  const grid = new Map<string, number[]>()
  return {
    nodes,
    adj,
    addNode(p) {
      const cx = Math.floor(p[0] / MERGE_T)
      const cz = Math.floor(p[1] / MERGE_T)
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          for (const i of grid.get(`${cx + dx},${cz + dz}`) ?? []) {
            if (dist(nodes[i].p, p) <= MERGE_T) return i
          }
        }
      }
      nodes.push({ p })
      adj.push([])
      const k = `${cx},${cz}`
      const list = grid.get(k) ?? []
      list.push(nodes.length - 1)
      grid.set(k, list)
      return nodes.length - 1
    },
    addEdge(a, b, roadId, roadName) {
      if (a === b) return
      const w = dist(nodes[a].p, nodes[b].p)
      adj[a].push({ to: b, w, ...(roadId ? { roadId, roadName: roadName ?? roadId } : {}) })
      adj[b].push({ to: a, w, ...(roadId ? { roadId, roadName: roadName ?? roadId } : {}) })
    },
  }
}

type Segs = [Pt, Pt][]

export function buildGraph(world: WorldData): PathGraph {
  const polys = world.buildings.map(buildingPoly)
  const segsCache = world.roads.map((r) => {
    const path = r.path as Pt[]
    return path.slice(0, -1).map((p, i) => [p, path[i + 1]] as [Pt, Pt])
  })
  const segsOf = (ri: number): Segs => segsCache[ri]

  // 道路求交：任意两条路段最近距离 ≤ 8m 视为交叉，取最近点对中点
  // v4 性能：段级 32m 空间网格筛候选对（282 条 OSM 道路全对全求交不可行）
  const intersectionCuts = new Map<number, Cut[]>()
  const pushCut = (ri: number, cut: Cut) => {
    const list = intersectionCuts.get(ri) ?? []
    list.push(cut)
    intersectionCuts.set(ri, list)
  }
  interface SegRef {
    ri: number
    si: number
    a: Pt
    b: Pt
    x0: number
    z0: number
    x1: number
    z1: number
  }
  const allSegs: SegRef[] = []
  world.roads.forEach((_, ri) =>
    segsOf(ri).forEach(([a, b], si) =>
      allSegs.push({
        ri,
        si,
        a,
        b,
        x0: Math.min(a[0], b[0]),
        z0: Math.min(a[1], b[1]),
        x1: Math.max(a[0], b[0]),
        z1: Math.max(a[1], b[1]),
      }),
    ),
  )
  const CELL = 32
  const segGrid = new Map<string, number[]>()
  allSegs.forEach((s, idx) => {
    for (let gx = Math.floor((s.x0 - SNAP_T) / CELL); gx <= Math.floor((s.x1 + SNAP_T) / CELL); gx++) {
      for (let gz = Math.floor((s.z0 - SNAP_T) / CELL); gz <= Math.floor((s.z1 + SNAP_T) / CELL); gz++) {
        const k = `${gx},${gz}`
        const list = segGrid.get(k) ?? []
        list.push(idx)
        segGrid.set(k, list)
      }
    }
  })
  const seenPairs = new Set<number>()
  for (const idxList of segGrid.values()) {
    for (let ii = 0; ii < idxList.length; ii++) {
      for (let jj = ii + 1; jj < idxList.length; jj++) {
        const i = Math.min(idxList[ii], idxList[jj])
        const j = Math.max(idxList[ii], idxList[jj])
        const pairKey = i * 100000 + j
        if (seenPairs.has(pairKey)) continue
        seenPairs.add(pairKey)
        const A = allSegs[i]
        const B = allSegs[j]
        if (A.ri === B.ri) continue
        if (A.x0 > B.x1 + SNAP_T || B.x0 > A.x1 + SNAP_T || A.z0 > B.z1 + SNAP_T || B.z0 > A.z1 + SNAP_T) continue
        const c = segSegClosest(A.a, A.b, B.a, B.b)
        if (c.d <= SNAP_T) {
          const mid: Pt = [(c.pa[0] + c.pb[0]) / 2, (c.pa[1] + c.pb[1]) / 2]
          pushCut(A.ri, { segIdx: A.si, t: closestOnSegment(mid, A.a, A.b).t, p: mid })
          pushCut(B.ri, { segIdx: B.si, t: closestOnSegment(mid, B.a, B.b).t, p: mid })
        }
      }
    }
  }

  /** 沿道路把顶点+切点串成边；block 决定某段是否断开，返回边数；被断的边经 onBlock 上报 */
  const chainRoads = (
    g: RawGraph,
    extraCuts: Map<number, Cut[]>,
    block?: (a: Pt, b: Pt) => boolean,
    onBlock?: (a: number, b: number, roadId?: string, roadName?: string) => void,
  ): number => {
    let edgeCount = 0
    world.roads.forEach((road, ri) => {
      const path = road.path as Pt[]
      const cuts = [...(intersectionCuts.get(ri) ?? []), ...(extraCuts.get(ri) ?? [])]
      cuts.sort((x, y) => x.segIdx - y.segIdx || x.t - y.t)
      let prevNode = g.addNode(path[0])
      let prevPoint = path[0]
      for (let si = 0; si < path.length - 1; si++) {
        if (si > 0) {
          prevNode = g.addNode(path[si])
          prevPoint = path[si]
        }
        const chain = cuts.filter((c) => c.segIdx === si).map((c) => c.p)
        chain.push(path[si + 1])
        for (const p of chain) {
          const next = g.addNode(p)
          if (!block || !block(prevPoint, p)) {
            g.addEdge(prevNode, next, road.id, road.name)
            edgeCount++
          } else {
            onBlock?.(prevNode, next, road.id, road.name)
          }
          prevNode = next
          prevPoint = p
        }
      }
    })
    return edgeCount
  }

  // 阶段 1：只按交点建图，找出主连通分量（楼宇/大门只允许接入主路网）
  const probe = newRawGraph()
  chainRoads(probe, new Map())
  const comp = new Array<number>(probe.nodes.length).fill(-1)
  let compCount = 0
  const compSize: number[] = []
  for (let s = 0; s < probe.nodes.length; s++) {
    if (comp[s] !== -1) continue
    let size = 0
    const queue = [s]
    comp[s] = compCount
    while (queue.length) {
      const u = queue.pop()!
      size++
      for (const e of probe.adj[u]) {
        if (comp[e.to] === -1) {
          comp[e.to] = compCount
          queue.push(e.to)
        }
      }
    }
    compSize.push(size)
    compCount++
  }
  const mainComp = compSize.indexOf(Math.max(...compSize))
  const mainRoads = new Set<string>()
  probe.adj.forEach((edges, i) => {
    if (comp[i] !== mainComp) return
    for (const e of edges) if (e.roadId) mainRoads.add(e.roadId)
  })

  // 阶段 2：场所接入点 = 主路网道路上的最近投影
  type Place = { kind: 'gate' | 'building'; id: string; name: string; pos: Pt }
  const places: Place[] = [
    ...world.gates.map((g): Place => ({ kind: 'gate', id: g.id, name: g.name, pos: [g.position[0], g.position[2]] })),
    ...world.buildings.map((b): Place => ({
      kind: 'building',
      id: b.id,
      name: b.name,
      pos: [b.position[0], b.position[1]],
    })),
  ]
  const accessCuts = new Map<number, Cut[]>()
  const accessPt = new Map<string, Pt>() // buildingId -> 接入口坐标（穿楼断边豁免用）
  for (const place of places) {
    let best: { p: Pt; ri: number; si: number; t: number; d: number } | null = null
    world.roads.forEach((road, ri) => {
      if (!mainRoads.has(road.id)) return
      segsOf(ri).forEach(([a, b], si) => {
        const c = closestOnSegment(place.pos, a, b)
        if (!best || c.d < best.d) best = { p: c.point, ri, si, t: c.t, d: c.d }
      })
    })
    if (!best) continue
    const b = best as { p: Pt; ri: number; si: number; t: number; d: number }
    const list = accessCuts.get(b.ri) ?? []
    list.push({ segIdx: b.si, t: b.t, p: b.p })
    accessCuts.set(b.ri, list)
    if (place.kind === 'building') accessPt.set(place.id, b.p)
  }

  // 阶段 3：正式建图。穿楼断边，但端点为本楼接入口的边豁免
  const g = newRawGraph()
  const blockedEdges: { a: number; b: number; roadId?: string; roadName?: string }[] = []
  const block = (a: Pt, b: Pt): boolean =>
    world.buildings.some((bd, i) => {
      if (!segHitsPoly(a, b, polys[i])) return false
      const ap = accessPt.get(bd.id)
      if (ap && (dist(a, ap) <= MERGE_T || dist(b, ap) <= MERGE_T)) return false
      return true
    })
  const edgeCount = chainRoads(g, accessCuts, block, (a, b, roadId, roadName) =>
    blockedEdges.push({ a, b, roadId, roadName }),
  )

  // 连通性修复（并查集）：被穿楼断边切断的“唯一通道”予以放行——建筑底层通道/测绘噪声在所难免；
  // 另有通路可绕行的阻断维持不变。保证场所全可达优先于严格不穿楼
  const parent = g.nodes.map((_, i) => i)
  const findRoot = (x: number): number => (parent[x] === x ? x : (parent[x] = findRoot(parent[x])))
  g.adj.forEach((edges, i) => {
    for (const e of edges) {
      const ra = findRoot(i)
      const rb = findRoot(e.to)
      if (ra !== rb) parent[ra] = rb
    }
  })
  for (const e of blockedEdges) {
    const ra = findRoot(e.a)
    const rb = findRoot(e.b)
    if (ra !== rb) {
      g.addEdge(e.a, e.b, e.roadId, e.roadName)
      parent[ra] = rb
    }
  }

  // 场所端点 + 接入边（出入口步行段，不计穿楼限制）
  const entry = new Map<string, number>()
  for (const place of places) {
    const ap = place.kind === 'building' ? accessPt.get(place.id) : undefined
    // 大门未登记 accessPt，取最近图节点；楼宇取接入口节点
    let nearest = -1
    if (ap) {
      nearest = g.addNode(ap)
    } else {
      let bestD = Infinity
      for (let i = 0; i < g.nodes.length; i++) {
        const d = dist(g.nodes[i].p, place.pos)
        if (d < bestD) {
          bestD = d
          nearest = i
        }
      }
    }
    if (nearest < 0) continue
    const end = g.addNode(place.pos)
    g.addEdge(end, nearest)
    entry.set(`${place.kind}:${place.id}`, end)
  }

  return { nodes: g.nodes, adj: g.adj, entry, nodeCount: g.nodes.length, edgeCount }
}

let cached: PathGraph | null = null
export function getGraph(world: WorldData): PathGraph {
  cached ??= buildGraph(world)
  return cached
}

/** Dijkstra 最短路，返回节点下标路径 */
function dijkstra(g: PathGraph, from: number, to: number): number[] | null {
  const distTo = new Array<number>(g.nodes.length).fill(Infinity)
  const prev = new Array<number>(g.nodes.length).fill(-1)
  distTo[from] = 0
  const open = new Set<number>([from])
  while (open.size) {
    let u = -1
    let best = Infinity
    for (const i of open) {
      if (distTo[i] < best) {
        best = distTo[i]
        u = i
      }
    }
    if (u === -1) break
    open.delete(u)
    if (u === to) break
    for (const e of g.adj[u]) {
      const nd = distTo[u] + e.w
      if (nd < distTo[e.to]) {
        distTo[e.to] = nd
        prev[e.to] = u
        open.add(e.to)
      }
    }
  }
  if (prev[to] === -1 && to !== from) return null
  const path: number[] = []
  for (let cur = to; cur !== -1; cur = prev[cur]) path.unshift(cur)
  return path
}

function dirWord(dx: number, dz: number): string {
  if (Math.abs(dx) >= Math.abs(dz)) return dx >= 0 ? '东' : '西'
  return dz >= 0 ? '南' : '北'
}

export function findRoute(
  world: WorldData,
  from: { kind: 'gate' | 'building'; id: string },
  to: { kind: 'gate' | 'building'; id: string },
): NavigationRoute | null {
  const g = getGraph(world)
  const a = g.entry.get(`${from.kind}:${from.id}`)
  const b = g.entry.get(`${to.kind}:${to.id}`)
  if (a === undefined || b === undefined) return null
  const nodePath = dijkstra(g, a, b)
  if (!nodePath || nodePath.length < 2) return null

  const waypoints = nodePath.map((i) => g.nodes[i].p as [number, number])
  let distanceM = 0
  for (let i = 0; i + 1 < nodePath.length; i++) {
    distanceM += dist(g.nodes[nodePath[i]].p, g.nodes[nodePath[i + 1]].p)
  }

  const placeName = (k: 'gate' | 'building', id: string): string =>
    k === 'gate'
      ? (world.gates.find((x) => x.id === id)?.name ?? id)
      : (world.buildings.find((x) => x.id === id)?.name ?? id)

  // 分段：连续同名 road 的边并为一段；沿途吸附广场作为地标讲解
  const body: NavigationRoute['segments'] = []
  let i = 0
  while (i + 1 < nodePath.length) {
    const u = nodePath[i]
    const roadName = g.adj[u].find((x) => x.to === nodePath[i + 1])?.roadName
    let len = 0
    let j = i
    const passed: string[] = []
    while (j + 1 < nodePath.length) {
      const e = g.adj[nodePath[j]].find((x) => x.to === nodePath[j + 1])!
      if (e.roadName !== roadName) break
      len += e.w
      for (const plaza of world.plazas) {
        const np = g.nodes[nodePath[j + 1]].p
        if (
          Math.abs(np[0] - plaza.center[0]) < plaza.size[0] / 2 + 20 &&
          Math.abs(np[1] - plaza.center[1]) < plaza.size[1] / 2 + 20 &&
          !passed.includes(plaza.name)
        ) {
          passed.push(plaza.name)
        }
      }
      j++
    }
    if (roadName) {
      const startP = g.nodes[u].p
      const endP = g.nodes[nodePath[j]].p
      const dir = dirWord(endP[0] - startP[0], endP[1] - startP[1])
      let text = `沿${roadName}向${dir}前行 ${Math.round(len)}m`
      if (passed.length) text += `，经过${passed.join('、')}`
      const seg: NavigationRoute['segments'][number] = { text, to: [endP[0], endP[1]] }
      if (passed.length) seg.landmark = passed.join('、')
      body.push(seg)
    }
    i = j
  }

  const segments: NavigationRoute['segments'] = [
    { text: `从${placeName(from.kind, from.id)}出发`, to: waypoints[0] },
    ...body,
    { text: `抵达${placeName(to.kind, to.id)}`, to: waypoints[waypoints.length - 1] },
  ]

  return {
    from,
    to,
    waypoints,
    distanceM: Math.round(distanceM),
    walkMin: Math.round((distanceM / WALK_M_PER_MIN) * 10) / 10,
    segments,
    // 无障碍：底稿路网无坡度字段，当前恒 true；坡度数据接入后按绕行坡度路段重算（接口预留）
    accessible: true,
  }
}

/** 楼宇距正门的步行分钟数（预约候选"距正门 X 分钟"） */
export function walkMinFromMainGate(world: WorldData, buildingId: string): number | null {
  const route = findRoute(world, { kind: 'gate', id: 'gate-east' }, { kind: 'building', id: buildingId })
  return route?.walkMin ?? null
}
