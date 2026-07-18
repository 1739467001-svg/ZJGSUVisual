// 24h 昼夜天空模型（规格 §9.2，用户硬性要求：与现实一致、关键帧间 smoothstep 平滑插值）
export interface SkyState {
  skyTop: string
  skyHorizon: string
  sunDir: [number, number, number] // 指向光源的单位向量（夜间为月亮方向）
  sunColor: string
  sunIntensity: number
  ambient: number
  isNight: boolean
  windowGlow: number // 0..1 楼宇窗带自发光系数
  lampsOn: boolean
  lampGlow: number // 0..1 灯柱自发光渐变
  horizonGlow: number // 0..1 黄昏橙光晕强度
}

interface Keyframe {
  h: number
  top: string
  horizon: string
  sun: string
  sunI: number
  amb: number
  win: number
  glow: number
  lamp: number
}

// 00:00 / 05:00 / 06:00 日出 / 07:30 白天 / 12:00 正午 / 16:30 / 18:30 黄昏 / 19:00 入夜 / 24:00
const KEYFRAMES: Keyframe[] = [
  { h: 0, top: '#0b1220', horizon: '#16233a', sun: '#8aa4c8', sunI: 0.15, amb: 0.25, win: 1, glow: 0, lamp: 1 },
  { h: 5, top: '#0d1526', horizon: '#1c2a44', sun: '#8aa4c8', sunI: 0.15, amb: 0.28, win: 1, glow: 0.08, lamp: 1 },
  { h: 6, top: '#33436b', horizon: '#e8a25e', sun: '#ffd9a0', sunI: 0.9, amb: 0.5, win: 0.6, glow: 0.8, lamp: 0.4 },
  { h: 7.5, top: '#4a7ab5', horizon: '#bcd6ee', sun: '#fff2df', sunI: 1.6, amb: 0.75, win: 0, glow: 0.15, lamp: 0 },
  { h: 12, top: '#3f74b8', horizon: '#cfe4f5', sun: '#ffffff', sunI: 2.0, amb: 0.85, win: 0, glow: 0, lamp: 0 },
  { h: 16.5, top: '#4a6fa8', horizon: '#d9c9a8', sun: '#ffe8c0', sunI: 1.4, amb: 0.7, win: 0.1, glow: 0.3, lamp: 0 },
  { h: 18.5, top: '#2c3a5e', horizon: '#e2703a', sun: '#ff9a56', sunI: 0.5, amb: 0.45, win: 0.7, glow: 1, lamp: 0.6 },
  { h: 19, top: '#101a30', horizon: '#1c2a44', sun: '#8aa4c8', sunI: 0.15, amb: 0.3, win: 1, glow: 0.25, lamp: 1 },
  { h: 24, top: '#0b1220', horizon: '#16233a', sun: '#8aa4c8', sunI: 0.15, amb: 0.25, win: 1, glow: 0, lamp: 1 },
]

function hexRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]
}

function rgbHex(r: number, g: number, b: number): string {
  const p = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')
  return `#${p(r)}${p(g)}${p(b)}`
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function lerpHex(a: string, b: string, t: number): string {
  const ca = hexRgb(a)
  const cb = hexRgb(b)
  return rgbHex(lerp(ca[0], cb[0], t), lerp(ca[1], cb[1], t), lerp(ca[2], cb[2], t))
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t)
}

/** 太阳方位：06:00 东方地平线 → 12:00 最高点 → 18:00 西方地平线（正午偏南） */
function sunDirAt(h: number): [number, number, number] {
  const theta = ((h - 6) / 12) * Math.PI
  const x = Math.cos(theta)
  const y = Math.sin(theta)
  const z = 0.35
  const len = Math.hypot(x, y, z)
  return [x / len, y / len, z / len]
}

export function skyStateAt(date: Date): SkyState {
  const h = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600

  let i = 0
  while (i < KEYFRAMES.length - 2 && KEYFRAMES[i + 1].h <= h) i++
  const a = KEYFRAMES[i]
  const b = KEYFRAMES[i + 1]
  const t = smoothstep(Math.min(1, Math.max(0, (h - a.h) / (b.h - a.h))))

  const isNight = h < 6 || h >= 18
  // 夜间光源换月亮：方向取"反向太阳"（同一公式错相 12h）。
  // 颜色/强度不做硬切换——关键帧本身已编码 19:00 起的冷色低强度，插值天然平滑
  const dir = sunDirAt(isNight ? (h < 6 ? h + 12 : h - 12) : h)

  return {
    skyTop: lerpHex(a.top, b.top, t),
    skyHorizon: lerpHex(a.horizon, b.horizon, t),
    sunDir: dir,
    sunColor: lerpHex(a.sun, b.sun, t),
    sunIntensity: lerp(a.sunI, b.sunI, t),
    ambient: lerp(a.amb, b.amb, t),
    isNight,
    windowGlow: lerp(a.win, b.win, t),
    lampsOn: lerp(a.lamp, b.lamp, t) > 0.5,
    lampGlow: lerp(a.lamp, b.lamp, t),
    horizonGlow: lerp(a.glow, b.glow, t),
  }
}
