#!/usr/bin/env node
/**
 * fetch-osm.mjs — 从 OpenStreetMap(Overpass API) 拉取浙江工商大学下沙校区地理数据，
 * 与仓库根 campus-zjgsu.json（手工抽象底稿）做楼宇匹配，生成新版世界底稿：
 *   scripts/out/campus-zjgsu-v2.json   （绝不覆盖仓库根的 campus-zjgsu.json）
 *   scripts/osm-match-report.md        （匹配报告）
 *   scripts/out/osm-raw.json           （Overpass 原始响应缓存）
 *
 * 用法：
 *   node scripts/fetch-osm.mjs            # 在线拉取（自动轮换镜像）
 *   node scripts/fetch-osm.mjs --cached   # 用 scripts/out/osm-raw.json 离线重建
 *
 * 坐标系：本地米制右手系，+X=东，+Z=南，+Y=上。
 * 锚点：OSM 图书馆建筑质心 → 映射到现有 lib position [-120, 0]。
 *
 * 数据版权归 OpenStreetMap contributors 所有，ODbL 许可。
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const OUT_DIR = path.join(__dirname, 'out');
const RAW_CACHE = path.join(OUT_DIR, 'osm-raw.json');
const V2_OUT = path.join(OUT_DIR, 'campus-zjgsu-v2.json');
const REPORT_OUT = path.join(__dirname, 'osm-match-report.md');
const BASE_JSON = path.join(REPO_ROOT, 'campus-zjgsu.json');

// 查询 bbox：覆盖校区本体 + 北侧钱江湾/金沙港生活区
const BBOX = { s: 30.304, w: 120.371, n: 30.323, e: 120.397 };
const MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];
const FETCH_TIMEOUT_MS = 60_000;
const LIB_TARGET = [-120, 0]; // 现有底稿中图书馆 position
const DIST_MATCH_THRESHOLD = 250; // 米，质心距离辅助匹配阈值
const BOUNDS_PAD = 60; // bounds 外扩
const NAME_CLUE_RE = /钱江湾|金沙港|玉屏洲|门/;

// ---------------------------------------------------------------- Overpass

function buildQuery() {
  const b = `${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e}`;
  return `[out:json][timeout:60];
(
  way["building"](${b});
  relation["building"](${b});
  way["highway"](${b});
  way["natural"="water"](${b});
  way["waterway"](${b});
  relation["natural"="water"](${b});
  way["leisure"="park"](${b});
  way["landuse"="grass"](${b});
  way["natural"="wood"](${b});
  node["name"~"${NAME_CLUE_RE.source}"](${b});
  way["name"~"${NAME_CLUE_RE.source}"](${b});
);
out geom;
`;
}

async function fetchOverpass() {
  const query = buildQuery();
  const errors = [];
  for (const url of MIRRORS) {
    console.log(`[fetch] 尝试镜像 ${url} …`);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          // 部分镜像（overpass-api.de）对 Node/undici 默认 UA 直接 406，必须显式 UA
          'User-Agent': 'campus-twin-osm-fetch/1.0 (ZJGSU campus digital twin; educational)',
          'Accept': 'application/json',
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const json = await res.json();
      if (!json || !Array.isArray(json.elements)) throw new Error('响应缺少 elements 数组');
      console.log(`[fetch] 成功，elements=${json.elements.length}`);
      return json;
    } catch (err) {
      console.warn(`[fetch] 镜像失败：${err.message}`);
      errors.push(`${url}: ${err.message}`);
    }
  }
  console.error('[fetch] 全部镜像失败：\n' + errors.map(e => '  - ' + e).join('\n'));
  process.exit(1);
}

// ---------------------------------------------------------------- 几何工具

const round1 = v => Math.round(v * 10) / 10;
const samePt = (a, b) => a.lat === b.lat && a.lon === b.lon;
const isClosed = g => g.length >= 3 && samePt(g[0], g[g.length - 1]);

/** relation 多边形：把 role=outer 的 way 段按端点拼成闭合环，取面积最大的一环 */
function assembleOuterRing(members) {
  const segs = (members || [])
    .filter(m => m.type === 'way' && (m.role === 'outer' || m.role === '') && Array.isArray(m.geometry))
    .map(m => m.geometry.slice());
  const used = new Set();
  let best = null;
  for (let i = 0; i < segs.length; i++) {
    if (used.has(i)) continue;
    used.add(i);
    let ring = segs[i];
    let changed = true;
    while (changed && !isClosed(ring)) {
      changed = false;
      for (let j = 0; j < segs.length; j++) {
        if (used.has(j)) continue;
        const seg = segs[j];
        const end = ring[ring.length - 1];
        if (samePt(end, seg[0])) { ring = ring.concat(seg.slice(1)); used.add(j); changed = true; }
        else if (samePt(end, seg[seg.length - 1])) { ring = ring.concat(seg.slice(0, -1).reverse()); used.add(j); changed = true; }
      }
    }
    if (isClosed(ring)) {
      const area = Math.abs(shoelaceLL(ring));
      if (!best || area > best.area) best = { ring, area };
    }
  }
  return best ? best.ring : null;
}

function shoelaceLL(ring) {
  let a = 0;
  for (let i = 0; i < ring.length - 1; i++) a += ring[i].lon * ring[i + 1].lat - ring[i + 1].lon * ring[i].lat;
  return a / 2;
}

/** 多边形质心（面积加权；退化时用顶点均值）。输入本地坐标 [[x,z]…]（可闭合可开） */
function polygonCentroid(pts) {
  const p = pts.length > 1 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]
    ? pts.slice(0, -1) : pts;
  let a = 0, cx = 0, cz = 0;
  for (let i = 0; i < p.length; i++) {
    const [x1, z1] = p[i];
    const [x2, z2] = p[(i + 1) % p.length];
    const cr = x1 * z2 - x2 * z1;
    a += cr; cx += (x1 + x2) * cr; cz += (z1 + z2) * cr;
  }
  if (Math.abs(a) < 1e-9) {
    const n = p.length || 1;
    return [p.reduce((s, q) => s + q[0], 0) / n, p.reduce((s, q) => s + q[1], 0) / n];
  }
  a /= 2;
  return [cx / (6 * a), cz / (6 * a)];
}

/** 鞋带公式面积（本地坐标，单位 m²） */
function polygonArea(pts) {
  let a = 0;
  for (let i = 0; i < pts.length - 1; i++) a += pts[i][0] * pts[i + 1][1] - pts[i + 1][0] * pts[i][1];
  return Math.abs(a / 2);
}

// ---------------------------------------------------------------- 名称匹配

/** 中文名称规范化：去掉通用前缀后缀与标点空白 */
function normName(s) {
  return String(s || '')
    .replace(/浙江工商大学|工商大学|下沙校区|下沙|校区|大学|学院|楼|苑/g, '')
    .replace(/[\s()（）\-—_·、,，.。:：/]/g, '');
}

/** 规范化后互相包含且较短者长度 ≥2 视为名称命中 */
function nameHit(osmName, ours) {
  const a = normName(osmName);
  if (!a) return false;
  for (const cand of ours) {
    const b = normName(cand);
    if (!b) continue;
    const [lo, hi] = a.length <= b.length ? [a, b] : [b, a];
    if (lo.length >= 2 && hi.includes(lo)) return true;
  }
  return false;
}

// ---------------------------------------------------------------- 主流程

const useCached = process.argv.includes('--cached');
const base = JSON.parse(await readFile(BASE_JSON, 'utf8'));

let raw;
if (useCached) {
  console.log(`[cache] 从 ${path.relative(process.cwd(), RAW_CACHE)} 重建`);
  raw = JSON.parse(await readFile(RAW_CACHE, 'utf8'));
} else {
  raw = await fetchOverpass();
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(RAW_CACHE, JSON.stringify(raw));
  console.log(`[cache] 原始响应已缓存到 ${path.relative(process.cwd(), RAW_CACHE)}`);
}
const elements = raw.elements || [];

// --- 分类 OSM 要素（保留 lat/lon 几何，稍后统一投影）
const osmBuildings = []; // {osmType, osmId, name, tags, ring?|line}
const osmRoads = [];
const osmWaterPoly = [];
const osmWaterways = [];
const osmGreen = [];
const nameClues = []; // {name, lat, lon}

for (const el of elements) {
  const tags = el.tags || {};
  if (el.type === 'way' && tags.building && Array.isArray(el.geometry)) {
    const ring = isClosed(el.geometry) ? el.geometry : null;
    if (ring) osmBuildings.push({ osmType: 'way', osmId: el.id, name: tags.name || '', tags, ring });
  } else if (el.type === 'relation' && tags.building && Array.isArray(el.members)) {
    const ring = assembleOuterRing(el.members);
    if (ring) osmBuildings.push({ osmType: 'relation', osmId: el.id, name: tags.name || '', tags, ring });
  } else if (el.type === 'way' && tags.highway && Array.isArray(el.geometry)) {
    osmRoads.push({ osmId: el.id, name: tags.name || '', tags, line: el.geometry });
  } else if (el.type === 'way' && tags.natural === 'water' && Array.isArray(el.geometry) && isClosed(el.geometry)) {
    osmWaterPoly.push({ osmType: 'way', osmId: el.id, name: tags.name || '', tags, ring: el.geometry });
  } else if (el.type === 'relation' && tags.natural === 'water' && Array.isArray(el.members)) {
    const ring = assembleOuterRing(el.members);
    if (ring) osmWaterPoly.push({ osmType: 'relation', osmId: el.id, name: tags.name || '', tags, ring });
  } else if (el.type === 'way' && tags.waterway && Array.isArray(el.geometry)) {
    osmWaterways.push({ osmId: el.id, name: tags.name || '', tags, line: el.geometry });
  } else if (el.type === 'way' && Array.isArray(el.geometry) && isClosed(el.geometry)
      && (tags.leisure === 'park' || tags.landuse === 'grass' || tags.natural === 'wood')) {
    const kind = tags.leisure === 'park' ? 'park' : tags.landuse === 'grass' ? 'grass' : 'wood';
    osmGreen.push({ osmId: el.id, name: tags.name || '', kind, ring: el.geometry });
  }
  if ((el.type === 'node' || el.type === 'way') && tags.name && NAME_CLUE_RE.test(tags.name)) {
    if (el.type === 'node') nameClues.push({ name: tags.name, lat: el.lat, lon: el.lon });
    else if (Array.isArray(el.geometry) && el.geometry.length) {
      const g = el.geometry;
      nameClues.push({
        name: tags.name,
        lat: g.reduce((s, p) => s + p.lat, 0) / g.length,
        lon: g.reduce((s, p) => s + p.lon, 0) / g.length,
      });
    }
  }
}
console.log(`[parse] buildings=${osmBuildings.length} roads=${osmRoads.length} waterPoly=${osmWaterPoly.length} waterways=${osmWaterways.length} green=${osmGreen.length} nameClues=${nameClues.length}`);

// --- 锚点：OSM 图书馆建筑（name 含「图书馆」）
const libCandidates = osmBuildings.filter(b => b.name.includes('图书馆'));
if (!libCandidates.length) {
  const named = osmBuildings.filter(b => b.name).map(b => `  ${b.osmType}/${b.osmId}  ${b.name}`);
  console.error('[anchor] 未找到 name 含「图书馆」的 OSM 建筑。所有带 name 的建筑：\n'
    + (named.join('\n') || '  （无）') + '\n请人工指定锚点后重试。');
  process.exit(1);
}
const libOsm = libCandidates[0];
// 顶点均值仅用于定投影带（cos 因子）；锚点本身用与输出一致的面积加权质心，
// 保证图书馆的 position 恰好落在 LIB_TARGET（顶点均值与面积质心可差上百米）。
const anchorLat = libOsm.ring.reduce((s, p) => s + p.lat, 0) / libOsm.ring.length;
const anchorLon = libOsm.ring.reduce((s, p) => s + p.lon, 0) / libOsm.ring.length;
const cosLat0 = Math.cos((anchorLat * Math.PI) / 180);
/** 等距圆柱投影：相对锚点投影带原点的米制偏移 */
const proj = (lat, lon) => [(lon - anchorLon) * cosLat0 * 111320, -(lat - anchorLat) * 110540];
const [anchorX, anchorZ] = polygonCentroid(libOsm.ring.map(p => proj(p.lat, p.lon)));
console.log(`[anchor] OSM way/${libOsm.osmId}「${libOsm.name}」质心 lat=${anchorLat.toFixed(6)} lon=${anchorLon.toFixed(6)} → [${LIB_TARGET}]`);

/** 投影 + 平移：锚点（图书馆面积质心）落在 LIB_TARGET */
function toLocal(lat, lon) {
  const [x, z] = proj(lat, lon);
  return [x - anchorX + LIB_TARGET[0], z - anchorZ + LIB_TARGET[1]];
}
const geomToLocal = g => g.map(p => toLocal(p.lat, p.lon));
/** 去闭合重复点 + 1 位小数 */
const finalizeOutline = pts => {
  let p = pts;
  if (p.length > 1 && p[0][0] === p[p.length - 1][0] && p[0][1] === p[p.length - 1][1]) p = p.slice(0, -1);
  return p.map(([x, z]) => [round1(x), round1(z)]);
};

// --- OSM 建筑转本地坐标
const osmLocal = osmBuildings.map(b => {
  const outline = finalizeOutline(geomToLocal(b.ring));
  return { ...b, outline, centroid: polygonCentroid(outline), area: polygonArea(outline) };
});

// --- 楼宇匹配：OSM 建筑 ↔ 现有 21 个 id
const ours = base.buildings.map(b => ({
  ...b,
  names: [b.name, b.fullName, ...(b.alias || [])].filter(Boolean),
}));
const matched = [];   // {our, osm, basis, offset}
const usedOsm = new Set();
const distTo = (our, o) => Math.hypot(o.centroid[0] - our.position[0], o.centroid[1] - our.position[1]);

// Pass -1：锚点直配。我们的 lib 楼 ↔ 锚点 OSM 建筑（name 含「图书馆」者），
// 保证坐标系基准与 lib 记录严格一致（lib position 必为 LIB_TARGET）。
{
  const ourLib = ours.find(b => b.id === 'lib');
  const osmLib = osmLocal.find(o => o.osmType === libOsm.osmType && o.osmId === libOsm.osmId);
  if (ourLib && osmLib) {
    usedOsm.add(osmLib);
    matched.push({ our: ourLib, osm: osmLib, basis: `anchor:「${osmLib.name}」`, offset: distTo(ourLib, osmLib) });
  }
}

// Pass 0：教学楼字母精确匹配（jxa..jxf ↔ OSM「A教学楼」..「F教学楼」）。
// 抽象底稿的字母与 OSM 字母是语义对应，纯距离匹配会被邻近宿舍楼带偏。
for (const our of ours) {
  const letter = our.id.match(/^jx([a-f])$/)?.[1]?.toUpperCase();
  if (!letter) continue;
  const re = new RegExp(`^(${letter}教学|教学${letter})$`);
  const hits = osmLocal.filter(o => !usedOsm.has(o) && o.name && re.test(normName(o.name)));
  if (!hits.length) continue;
  hits.sort((a, b) => distTo(our, a) - distTo(our, b));
  const pick = hits[0];
  usedOsm.add(pick);
  matched.push({ our, osm: pick, basis: `letter:「${pick.name}」`, offset: distTo(our, pick) });
}

// Pass 1：名称命中优先（一对一）。多候选排序：命中子串长度降序 → 质心距离升序。
// 用绝对长度而非比例：避免短的通用名全等命中（如「体育馆」）盖过更长的专名包含
// （如「文体中心场馆（亚运手球比赛馆）」含「文体中心」）。
function specificity(osmName, names) {
  const a = normName(osmName);
  let best = 0;
  for (const cand of names) {
    const b = normName(cand);
    if (!a || !b) continue;
    const [lo, hi] = a.length <= b.length ? [a, b] : [b, a];
    if (lo.length >= 2 && hi.includes(lo)) best = Math.max(best, lo.length);
  }
  return best;
}
for (const our of ours) {
  if (matched.some(m => m.our === our)) continue;
  const hits = osmLocal.filter(o => !usedOsm.has(o) && o.name && nameHit(o.name, our.names));
  if (!hits.length) continue;
  hits.sort((a, b) => (specificity(b.name, our.names) - specificity(a.name, our.names)) || (distTo(our, a) - distTo(our, b)));
  const pick = hits[0];
  usedOsm.add(pick);
  matched.push({ our, osm: pick, basis: `name:「${pick.name}」`, offset: distTo(our, pick) });
}
// Pass 2：质心距离（阈值内全局最近优先）
{
  const pairs = [];
  for (const our of ours) {
    if (matched.some(m => m.our === our)) continue;
    for (const o of osmLocal) {
      if (usedOsm.has(o)) continue;
      const d = Math.hypot(o.centroid[0] - our.position[0], o.centroid[1] - our.position[1]);
      if (d <= DIST_MATCH_THRESHOLD) pairs.push({ our, o, d });
    }
  }
  pairs.sort((a, b) => a.d - b.d);
  const usedOur = new Set(matched.map(m => m.our));
  for (const { our, o, d } of pairs) {
    if (usedOur.has(our) || usedOsm.has(o)) continue;
    usedOur.add(our); usedOsm.add(o);
    matched.push({ our, osm: o, basis: `distance:${d.toFixed(0)}m${o.name ? ` name:「${o.name}」` : '（OSM 无名）'}`, offset: d });
  }
}
const unmatchedOurs = ours.filter(b => !matched.some(m => m.our === b));
const osmOnly = osmLocal.filter(o => !usedOsm.has(o));

// --- 生成 v2 底稿
const v2 = { ...base, meta: { ...base.meta } };
v2.meta.sources = [...(base.meta.sources || []), 'OpenStreetMap contributors (ODbL)'];
v2.meta.generatedAt = new Date().toISOString();
v2.meta.layoutNote = (base.meta.layoutNote || '') + " layoutConfidence: 'osm' = 轮廓/位置来自 OSM 实测。";

const matchByOurId = new Map(matched.map(m => [m.our.id, m]));
v2.buildings = base.buildings.map(b => {
  const m = matchByOurId.get(b.id);
  if (!m) return b; // 未匹配：原样保留
  const outline = m.osm.outline;
  const [cx, cz] = polygonCentroid(outline);
  const xs = outline.map(p => p[0]), zs = outline.map(p => p[1]);
  return {
    ...b,
    position: [round1(cx), round1(cz)],
    footprint: [round1(Math.max(...xs) - Math.min(...xs)), round1(Math.max(...zs) - Math.min(...zs))],
    outline,
    layoutConfidence: 'osm',
  };
});

// --- 越界要素处理 ------------------------------------------------------------
// 核心范围：匹配楼 outline + 未匹配楼旧 position + 生活区/校门（约等于校园及生活区）
const CLIP_MARGIN = 300;   // 线要素按此范围裁剪
const POLY_MAX_SPAN = 2500; // 面要素外接矩形任一边超过即剔除（如钱塘江多边形）
const coreXs = [], coreZs = [];
for (const b of v2.buildings) {
  if (b.outline) b.outline.forEach(([x, z]) => { coreXs.push(x); coreZs.push(z); });
  else { coreXs.push(b.position[0]); coreZs.push(b.position[1]); }
}
for (const q of v2.distantQuarters || base.distantQuarters) { coreXs.push(q.center[0]); coreZs.push(q.center[1]); }
for (const g of base.gates || []) { coreXs.push(g.position[0]); coreZs.push(g.position[2]); }
const clipBox = {
  minX: Math.min(...coreXs) - CLIP_MARGIN, maxX: Math.max(...coreXs) + CLIP_MARGIN,
  minZ: Math.min(...coreZs) - CLIP_MARGIN, maxZ: Math.max(...coreZs) + CLIP_MARGIN,
};
const inBox = ([x, z]) => x >= clipBox.minX && x <= clipBox.maxX && z >= clipBox.minZ && z <= clipBox.maxZ;
/** 折线按 clipBox 裁剪：保留盒内连续段（≥2 点），一条折线可能拆成多段 */
function clipPath(path) {
  const segs = [];
  let cur = [];
  for (const p of path) {
    if (inBox(p)) cur.push(p);
    else { if (cur.length >= 2) segs.push(cur); cur = []; }
  }
  if (cur.length >= 2) segs.push(cur);
  return segs;
}
const droppedOversized = []; // 报告用

// roads：highway 折线。噪声过滤仅去 parking_aisle / proposed / construction，宁可多保留
const KIND_MAP = h =>
  ['primary', 'secondary', 'tertiary'].includes(h) ? 'city'
    : ['residential', 'unclassified', 'service'].includes(h) ? 'main'
    : 'minor'; // footway/path/pedestrian/cycleway/living_street/steps…
const WIDTH_MAP = { city: 12, main: 8, minor: 4 };
v2.roads = osmRoads
  .filter(r => r.tags.service !== 'parking_aisle' && !['proposed', 'construction'].includes(r.tags.highway))
  .flatMap(r => {
    const kind = KIND_MAP(r.tags.highway);
    const full = geomToLocal(r.line).map(([x, z]) => [round1(x), round1(z)]);
    return clipPath(full).map((seg, i) => ({
      id: `osm-${r.osmId}${i ? `-${i + 1}` : ''}`,
      name: r.name || '',
      kind,
      width: WIDTH_MAP[kind],
      path: seg,
    }));
  });

// water：多边形 → lake outline（超大面剔除）；线状 → river path（按核心范围裁剪）
const lakes = [];
for (const w of osmWaterPoly) {
  const outline = finalizeOutline(geomToLocal(w.ring));
  const xs = outline.map(p => p[0]), zs = outline.map(p => p[1]);
  const spanX = Math.max(...xs) - Math.min(...xs), spanZ = Math.max(...zs) - Math.min(...zs);
  if (spanX > POLY_MAX_SPAN || spanZ > POLY_MAX_SPAN) {
    droppedOversized.push(`water ${w.osmType}/${w.osmId}${w.name ? `「${w.name}」` : ''}（${spanX.toFixed(0)}×${spanZ.toFixed(0)}m）`);
    continue;
  }
  if (!outline.some(inBox)) continue; // 与核心范围不相交
  lakes.push({ id: `osm-${w.osmType === 'way' ? 'w' : 'r'}${w.osmId}`, name: w.name || '', kind: 'lake', outline });
}
const rivers = osmWaterways.flatMap(w => {
  const width = Number.parseFloat(w.tags.width);
  const full = geomToLocal(w.line).map(([x, z]) => [round1(x), round1(z)]);
  return clipPath(full).map((seg, i) => ({
    id: `osm-w${w.osmId}${i ? `-${i + 1}` : ''}`,
    name: w.name || '',
    kind: 'river',
    width: Number.isFinite(width) ? width : 8,
    path: seg,
  }));
});
v2.water = [...lakes, ...rivers];

// greenery：新顶层字段（超大面剔除、盒外丢弃）
v2.greenery = [];
for (const g of osmGreen) {
  const outline = finalizeOutline(geomToLocal(g.ring));
  const xs = outline.map(p => p[0]), zs = outline.map(p => p[1]);
  const spanX = Math.max(...xs) - Math.min(...xs), spanZ = Math.max(...zs) - Math.min(...zs);
  if (spanX > POLY_MAX_SPAN || spanZ > POLY_MAX_SPAN) {
    droppedOversized.push(`greenery way/${g.osmId}(${g.kind})（${spanX.toFixed(0)}×${spanZ.toFixed(0)}m）`);
    continue;
  }
  if (!outline.some(inBox)) continue;
  v2.greenery.push({ id: `osm-w${g.osmId}`, kind: g.kind, outline });
}

// distantQuarters：只用「浙江工商大学xx生活区」级别的强线索定位；路名/租赁点等弱线索不可靠，
// 他校同名生活区（如玉屏洲属浙江经济职业技术学院）不采信，保留旧值。
const quarterNotes = [];
v2.distantQuarters = base.distantQuarters.map(q => {
  const key = q.name.replace('生活区', '');
  const clues = nameClues.filter(c => c.name.includes(key));
  const strong = clues.filter(c => c.name.includes('浙江工商大学') && c.name.includes('生活区'));
  if (!strong.length) {
    const weak = clues.map(c => {
      const [x, z] = toLocal(c.lat, c.lon);
      return `${c.name}@[${x.toFixed(0)}, ${z.toFixed(0)}]`;
    });
    quarterNotes.push(`${q.name}：无「浙江工商大学」级线索，保留旧值 [${q.center}]，待人工校订`
      + (weak.length ? `（弱线索：${weak.join('、')}）` : ''));
    return q;
  }
  const pts = strong.map(c => toLocal(c.lat, c.lon));
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const cz = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  quarterNotes.push(`${q.name}：由 OSM「${strong.map(c => c.name).join('、')}」面质心定位为 [${Math.round(cx)}, ${Math.round(cz)}]（旧值 [${q.center}]），待人工校订`);
  return { ...q, center: [Math.round(cx), Math.round(cz)] };
});

// 校门参考：OSM barrier=gate / 名称含「门」的节点，列入报告供人工校订（不自动改 gates）
const gateClues = nameClues
  .filter(c => c.name.includes('门'))
  .map(c => { const [x, z] = toLocal(c.lat, c.lon); return { name: c.name, x, z }; });

// bounds：全部要素外接矩形外扩 60m
{
  const xs = [], zs = [];
  const eat = (x, z) => { xs.push(x); zs.push(z); };
  for (const b of v2.buildings) (b.outline || []).forEach(([x, z]) => eat(x, z));
  for (const r of v2.roads) r.path.forEach(([x, z]) => eat(x, z));
  for (const w of v2.water) (w.outline || w.path || []).forEach(([x, z]) => eat(x, z));
  for (const g of v2.greenery) g.outline.forEach(([x, z]) => eat(x, z));
  v2.bounds = {
    west: Math.floor(Math.min(...xs) - BOUNDS_PAD),
    east: Math.ceil(Math.max(...xs) + BOUNDS_PAD),
    north: Math.floor(Math.min(...zs) - BOUNDS_PAD),
    south: Math.ceil(Math.max(...zs) + BOUNDS_PAD),
  };
}

await mkdir(OUT_DIR, { recursive: true });
await writeFile(V2_OUT, JSON.stringify(v2, null, 2) + '\n');

// ---------------------------------------------------------------- 报告
const bigOffsets = matched.filter(m => m.offset > 1000);
const fmtC = c => `[${c[0].toFixed(0)}, ${c[1].toFixed(0)}]`;
const lines = [];
lines.push('# OSM 匹配报告 · 浙江工商大学下沙校区', '');
lines.push(`- 生成时间：${v2.meta.generatedAt}`);
lines.push(`- 数据源：OpenStreetMap / Overpass（bbox ${BBOX.s},${BBOX.w} ~ ${BBOX.n},${BBOX.e}）`);
lines.push(`- 锚点：OSM way/${libOsm.osmId}「${libOsm.name}」→ 本地 [${LIB_TARGET}]`);
lines.push(`- 覆盖率：**${matched.length}/${ours.length}** 栋楼匹配成功`, '');

lines.push('## matched（我们的 id ↔ OSM 要素）', '');
lines.push('| 我们的 id | 名称 | OSM 要素 | 匹配依据 | 质心偏移(m) | OSM name |');
lines.push('|---|---|---|---|---|---|');
for (const m of matched.slice().sort((a, b) => a.our.id.localeCompare(b.our.id))) {
  lines.push(`| ${m.our.id} | ${m.our.name} | ${m.osm.osmType}/${m.osm.osmId} | ${m.basis} | ${m.offset.toFixed(1)} | ${m.osm.name || '（无名）'} |`);
}
lines.push('');

lines.push('## osm-only（OSM 有、我们 21 栋没有）', '');
lines.push('| OSM 要素 | name | 质心(本地) | 面积估算(m²) |');
lines.push('|---|---|---|---|');
const osmOnlyNotable = osmOnly.filter(o => o.name || o.area >= 200)
  .sort((a, b) => b.area - a.area);
for (const o of osmOnlyNotable) {
  lines.push(`| ${o.osmType}/${o.osmId} | ${o.name || '（无名）'} | ${fmtC(o.centroid)} | ${o.area.toFixed(0)} |`);
}
const osmOnlySkipped = osmOnly.length - osmOnlyNotable.length;
if (osmOnlySkipped > 0) lines.push(`| … | 另有 ${osmOnlySkipped} 个无名小建筑(<200m²) 从略 | | |`);
lines.push('');

lines.push('## unmatched（我们有、OSM 未匹配上）', '');
if (unmatchedOurs.length) {
  lines.push('| 我们的 id | 名称 | 旧抽象 position |');
  lines.push('|---|---|---|');
  for (const b of unmatchedOurs) lines.push(`| ${b.id} | ${b.name} | [${b.position}] |`);
} else {
  lines.push('（无，全部匹配）');
}
lines.push('');

lines.push('## 待人工校订', '');
for (const n of quarterNotes) lines.push(`- 生活区：${n}`);
lines.push('- gates：三处校门沿用旧抽象值，待人工校订。OSM 实际门节点（本地坐标）如下，可据此修正：');
lines.push('');
lines.push('| OSM 门节点名称 | 本地坐标 |');
lines.push('|---|---|');
for (const g of gateClues.sort((a, b) => a.name.localeCompare(b.name))) {
  lines.push(`| ${g.name} | [${g.x.toFixed(0)}, ${g.z.toFixed(0)}] |`);
}
lines.push('');
lines.push('- 参照系提示：OSM 中学正街为东西向、在校区**南侧**（z≈+373）；学林街在**北侧**（z≈-421）；金沙港路 z≈+330；乃器路 z≈+90。旧抽象底稿的道路方位与 OSM 实测不一致，修正 gates/plazas 时以 OSM 为准');
lines.push('- plazas：四个广场沿用旧抽象值，待人工校订');
if (unmatchedOurs.length) lines.push(`- 未匹配楼 ${unmatchedOurs.length} 栋：position/footprint 仍是旧抽象值`);
if (bigOffsets.length) lines.push(`- ⚠️ ${bigOffsets.length} 栋匹配楼质心偏移超过 1000m（疑似锚点/投影异常）：${bigOffsets.map(m => m.our.id).join('、')}`);
if (droppedOversized.length) lines.push(`- 已剔除超大多边形 ${droppedOversized.length} 个（无法作为校园轮廓使用，如需呈现请人工简化）：${droppedOversized.join('、')}`);
lines.push('');

await writeFile(REPORT_OUT, lines.join('\n'));

// ---------------------------------------------------------------- 自检汇总
let outlineBad = 0;
for (const m of matched) if (m.osm.outline.length < 4) outlineBad++;
console.log('\n========== 汇总 ==========');
console.log(`匹配 ${matched.length}/${ours.length} 栋；未匹配 ${unmatchedOurs.length} 栋；OSM 独有 ${osmOnly.length} 栋`);
console.log(`roads ${v2.roads.length} 条；water ${v2.water.length} 段（lake ${v2.water.filter(w => w.kind === 'lake').length} / river ${v2.water.filter(w => w.kind === 'river').length}）；greenery ${v2.greenery.length} 块`);
console.log(`bounds ${JSON.stringify(v2.bounds)}`);
console.log(`outline 点数 <4 的匹配楼：${outlineBad} 栋`);
for (const m of matched.slice().sort((a, b) => a.our.id.localeCompare(b.our.id))) {
  const nb = v2.buildings.find(b => b.id === m.our.id);
  console.log(`  ${m.our.id.padEnd(10)} 旧[${m.our.position}] → 新[${nb.position}] 偏移 ${m.offset.toFixed(1)}m`);
}
if (bigOffsets.length) console.warn(`⚠️ 千米级偏移：${bigOffsets.map(m => `${m.our.id}(${m.offset.toFixed(0)}m)`).join('、')}`);
// 验证 v2 可解析
JSON.parse(await readFile(V2_OUT, 'utf8'));
console.log(`v2 底稿已写出并可解析：${path.relative(process.cwd(), V2_OUT)}`);
console.log(`报告：${path.relative(process.cwd(), REPORT_OUT)}`);
