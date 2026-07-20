// 定稿脚本：osm-raw.json + campus-zjgsu-v2.json → 正式底稿 campus-zjgsu.json（仓库根 + public 副本）
// 做的事：裁校园核心范围 / 生成 contextBuildings 灰色配楼 / 校门改 OSM 实测 / 广场 reposition / bounds 重写
// 用法：node scripts/build-world.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const REPO = join(ROOT, '..')
const raw = JSON.parse(readFileSync(join(ROOT, 'scripts/out/osm-raw.json'), 'utf8'))
const v2 = JSON.parse(readFileSync(join(ROOT, 'scripts/out/campus-zjgsu-v2.json'), 'utf8'))

// ---------- 投影（与 fetch-osm.mjs 同框架：OSM 图书馆面积质心 → [-120, 0]） ----------
const LIB_WAY_ID = 563533987
const libWay = raw.elements.find((e) => e.type === 'way' && e.id === LIB_WAY_ID)
if (!libWay?.geometry) throw new Error('osm-raw 中找不到图书馆 way')
const lat0 = libWay.geometry.reduce((s, n) => s + n.lat, 0) / libWay.geometry.length
const MX = Math.cos((lat0 * Math.PI) / 180) * 111320
const MZ = 110540
// 面积质心（shoelace），在投影平面上算
function areaCentroid(geom) {
  const pts = geom.map((n) => [n.lon * MX, -n.lat * MZ])
  let a = 0, cx = 0, cy = 0
  for (let i = 0; i < pts.length - 1; i++) {
    const cross = pts[i][0] * pts[i + 1][1] - pts[i + 1][0] * pts[i][1]
    a += cross
    cx += (pts[i][0] + pts[i + 1][0]) * cross
    cy += (pts[i][1] + pts[i + 1][1]) * cross
  }
  a /= 2
  return [cx / (6 * a), cy / (6 * a)]
}
const [lx, lz] = areaCentroid(libWay.geometry)
// local = proj(p) - proj(libCentroid) + [-120, 0]
const proj = (lat, lon) => [lon * MX, -lat * MZ]
const toLocal = (lat, lon) => {
  const [px, pz] = proj(lat, lon)
  return [Math.round((px - lx + -120) * 10) / 10, Math.round((pz - lz + 0) * 10) / 10]
}

// ---------- 核心范围：21 栋轮廓外接 + 150m 余量 ----------
const MARGIN = 150
let cx0 = Infinity, cx1 = -Infinity, cz0 = Infinity, cz1 = -Infinity
for (const b of v2.buildings) {
  for (const [x, z] of b.outline ?? []) {
    cx0 = Math.min(cx0, x); cx1 = Math.max(cx1, x)
    cz0 = Math.min(cz0, z); cz1 = Math.max(cz1, z)
  }
}
const core = { west: cx0 - MARGIN, east: cx1 + MARGIN, north: cz0 - MARGIN, south: cz1 + MARGIN }
const inCore = (x, z, pad = 0) =>
  x >= core.west - pad && x <= core.east + pad && z >= core.north - pad && z <= core.south + pad

// ---------- 工具 ----------
const centroidOf = (outline) => {
  let x = 0, z = 0
  for (const p of outline) { x += p[0]; z += p[1] }
  return [x / outline.length, z / outline.length]
}
const bboxOf = (outline) => {
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity
  for (const [x, z] of outline) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z) }
  return [x0, z0, x1, z1]
}
const pointInPoly = (x, z, poly) => {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j]
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside
  }
  return inside
}
const areaOf = (outline) => {
  let a = 0
  for (let i = 0; i < outline.length - 1; i++) a += outline[i][0] * outline[i + 1][1] - outline[i + 1][0] * outline[i][1]
  return Math.abs(a / 2)
}

// ---------- contextBuildings：核心内 OSM 有、21 栋之外的灰色配楼 ----------
const matchedOutlines = v2.buildings.map((b) => b.outline).filter(Boolean)
const contextBuildings = []
for (const e of raw.elements) {
  if (e.type !== 'way' || !e.tags?.building || !e.geometry || e.geometry.length < 4) continue
  const outline = e.geometry.map((n) => toLocal(n.lat, n.lon))
  outline.pop() // 去闭合点
  if (outline.length < 3) continue
  const [x0, z0, x1, z1] = bboxOf(outline)
  if (x1 - x0 > 300 || z1 - z0 > 300) continue // 剔除巨型面
  const area = areaOf(outline)
  if (area < 100) continue
  const [cx, cz] = centroidOf(outline)
  if (!inCore(cx, cz)) continue
  // 与已匹配 21 栋重叠（质心落在其轮廓内）→ 跳过，避免双渲染
  if (matchedOutlines.some((poly) => pointInPoly(cx, cz, poly))) continue
  const levels = Number(e.tags['building:levels'])
  const floors = Number.isFinite(levels) && levels > 0 ? Math.min(levels, 30) : e.tags.building === 'dormitory' ? 6 : 3
  contextBuildings.push({
    id: `ctx-${e.id}`,
    ...(e.tags.name ? { name: e.tags.name } : {}),
    outline,
    height: Math.round(floors * 3.1 * 10) / 10,
  })
}
contextBuildings.sort((a, b) => areaOf(b.outline) - areaOf(a.outline))
const ctxFinal = contextBuildings.slice(0, 160)

// ---------- gates：OSM barrier=gate 实测点 ----------
const gateNode = (id) => raw.elements.find((e) => e.type === 'node' && e.id === id)
const gateDefs = [
  { id: 'gate-east', nodeId: 5430606055, name: '正门（南大门·飞翔门·学正街）', alias: ['东门', '正门', '大门', '南门', '南大门', '飞翔门', '学正街门'] },
  { id: 'gate-north', nodeId: 5430606056, name: '北门（北大门）', alias: ['北门', '北大门'] },
  { id: 'gate-south', nodeId: 5430606075, name: '1号门（学正街东段）', alias: ['1号门', '一号门', '春华路门'] },
]
const gates = gateDefs.map((d) => {
  const node = gateNode(d.nodeId)
  if (!node) throw new Error(`osm-raw 中校门节点缺失: ${d.nodeId}`)
  const [x, z] = toLocal(node.lat, node.lon)
  return { id: d.id, name: d.name, alias: d.alias, position: [x, 0, z] }
})

// ---------- plazas：馆前广场保留；食堂广场迁到对应食堂轮廓质心旁 ----------
const canteenOf = (id) => v2.buildings.find((b) => b.id === id)
const plazaAt = (bId, dz = 50) => {
  const b = canteenOf(bId)
  const [cx, cz] = centroidOf(b.outline)
  return [Math.round(cx * 10) / 10, Math.round((cz + dz) * 10) / 10]
}
const plazas = [
  { id: 'plaza-lib', name: '图书馆前广场', center: [30, 0], size: [120, 70] },
  { id: 'plaza-qingfeng', name: '清风广场', center: plazaAt('qingfeng'), size: [70, 50] },
  { id: 'plaza-xingyun', name: '行云广场', center: plazaAt('xingyun'), size: [70, 50] },
  { id: 'plaza-liushui', name: '流水广场', center: plazaAt('liushui'), size: [70, 50] },
]

// ---------- roads/water/greenery：核心 + 80m 裁剪（几何保持原样） ----------
const clipLines = (items, pad = 80) =>
  items.filter((it) => (it.path ?? []).some(([x, z]) => inCore(x, z, pad)))
const clipPolys = (items, pad = 80) =>
  items.filter((it) => {
    const [x0, z0, x1, z1] = bboxOf(it.outline)
    return x1 >= core.west - pad && x0 <= core.east + pad && z1 >= core.north - pad && z0 <= core.south + pad
  })
const roads = clipLines(v2.roads)
const water = clipPolys(v2.water.filter((w) => w.outline)).concat(clipLines(v2.water.filter((w) => w.path)))
const greenery = clipPolys(v2.greenery)

// ---------- 汇总输出 ----------
const out = {
  meta: {
    ...v2.meta,
    version: '4.0.0',
    layoutNote:
      "v4：楼宇位置/轮廓、道路、水系、绿地来自 OpenStreetMap 实测（layoutConfidence: 'osm'）；面积/层数仍为官方档案。contextBuildings 为核心区内无名/配角建筑灰色体量（不可交互）。distantQuarters 退役——生活区已由真实宿舍楼体量取代。",
    sources: [...v2.meta.sources, 'OpenStreetMap contributors (ODbL)'],
    generatedAt: new Date().toISOString().slice(0, 10),
  },
  bounds: {
    west: Math.floor(core.west / 10) * 10,
    east: Math.ceil(core.east / 10) * 10,
    north: Math.floor(core.north / 10) * 10,
    south: Math.ceil(core.south / 10) * 10,
  },
  gates,
  roads,
  water,
  plazas,
  buildings: v2.buildings,
  contextBuildings: ctxFinal,
  distantQuarters: [],
  spokenAliases: v2.spokenAliases,
  greenery,
}

for (const p of [join(REPO, 'campus-zjgsu.json'), join(ROOT, 'public/campus-zjgsu.json')]) {
  writeFileSync(p, JSON.stringify(out, null, 2) + '\n')
}
console.log('✓ campus-zjgsu.json v4 定稿（根目录 + public 副本）')
console.log(`  bounds: x[${out.bounds.west}, ${out.bounds.east}] z[${out.bounds.north}, ${out.bounds.south}] (${out.bounds.east - out.bounds.west}m × ${out.bounds.south - out.bounds.north}m)`)
console.log(`  buildings: 21（含 outline） contextBuildings: ${ctxFinal.length} roads: ${roads.length} water: ${water.length} greenery: ${greenery.length}`)
console.log(`  gates: ${gates.map((g) => `${g.name} @[${g.position.map((v) => Math.round(v)).join(',')}]`).join(' | ')}`)
