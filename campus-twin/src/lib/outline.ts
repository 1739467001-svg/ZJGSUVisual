import * as THREE from 'three'

// OSM 真实轮廓（[x,z][] 本地米制、未闭合）→ three.js 几何的统一入口
// 约定：shape 建在 (x-cx, cz-z) 平面，rotateX(-π/2) 后落到世界 (x-cx, z-cz)，高度沿 +Y

export type Outline = readonly (readonly [number, number])[]

/** 轮廓拉伸体：底面在 y=0，顶面在 y=height，质心为局部原点 */
export function extrudeOutline(outline: Outline, cx: number, cz: number, height: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape()
  outline.forEach(([x, z], i) => {
    if (i === 0) shape.moveTo(x - cx, cz - z)
    else shape.lineTo(x - cx, cz - z)
  })
  shape.closePath()
  const geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false })
  geo.rotateX(-Math.PI / 2)
  return geo
}

/** 轮廓平面片（水面/绿地铺装）：世界绝对坐标，y 由调用方 position 控制 */
export function flatOutline(outline: Outline): THREE.ShapeGeometry {
  const shape = new THREE.Shape()
  outline.forEach(([x, z], i) => {
    if (i === 0) shape.moveTo(x, -z)
    else shape.lineTo(x, -z)
  })
  shape.closePath()
  const geo = new THREE.ShapeGeometry(shape)
  geo.rotateX(-Math.PI / 2)
  return geo
}

/** 沿轮廓闭合环的条带几何（楼顶状态光带）：质心为局部原点，贴 y=0 平面 */
export function outlineRing(outline: Outline, cx: number, cz: number, width: number): THREE.BufferGeometry {
  const pts = outline.map(([x, z]) => [x - cx, z - cz] as [number, number])
  pts.push(pts[0])
  const positions: number[] = []
  const half = width / 2
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i]
    const [bx, bz] = pts[i + 1]
    const dx = bx - ax
    const dz = bz - az
    const len = Math.hypot(dx, dz)
    if (len === 0) continue
    const nx = (-dz / len) * half
    const nz = (dx / len) * half
    const v: [number, number][] = [
      [ax + nx, az + nz],
      [ax - nx, az - nz],
      [bx + nx, bz + nz],
      [bx - nx, bz - nz],
    ]
    for (const idx of [0, 1, 2, 2, 1, 3]) positions.push(v[idx][0], 0, v[idx][1])
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  const normals = new Array(positions.length).fill(0)
  for (let i = 1; i < normals.length; i += 3) normals[i] = 1
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  return geo
}

/** 点在多边形内（射线法） */
export function pointInOutline(x: number, z: number, outline: Outline): boolean {
  let inside = false
  for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
    const [xi, zi] = outline[i]
    const [xj, zj] = outline[j]
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside
  }
  return inside
}

/**
 * 水平扫描线 z=zRow 与轮廓的 x 向交段（用于夜景窗带沿真实轮廓裁剪）
 * 返回排序后的 [xStart, xEnd] 段列表（世界坐标）
 */
export function scanlineX(outline: Outline, zRow: number): [number, number][] {
  const xs: number[] = []
  for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
    const [xi, zi] = outline[i]
    const [xj, zj] = outline[j]
    if (zi > zRow !== zj > zRow) xs.push(((xj - xi) * (zRow - zi)) / (zj - zi) + xi)
  }
  xs.sort((a, b) => a - b)
  const segs: [number, number][] = []
  for (let i = 0; i + 1 < xs.length; i += 2) segs.push([xs[i], xs[i + 1]])
  return segs
}

/** 垂直扫描线 x=xCol 与轮廓的 z 向交段 */
export function scanlineZ(outline: Outline, xCol: number): [number, number][] {
  const zs: number[] = []
  for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
    const [xi, zi] = outline[i]
    const [xj, zj] = outline[j]
    if (xi > xCol !== xj > xCol) zs.push(((zj - zi) * (xCol - xi)) / (xj - xi) + zi)
  }
  zs.sort((a, b) => a - b)
  const segs: [number, number][] = []
  for (let i = 0; i + 1 < zs.length; i += 2) segs.push([zs[i], zs[i + 1]])
  return segs
}
