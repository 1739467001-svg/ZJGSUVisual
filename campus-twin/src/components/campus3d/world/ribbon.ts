import * as THREE from 'three'

/** 折线 → XZ 平面条带几何（每段一个四边形，内接缝以圆盘补角） */
export function ribbonGeometry(path: readonly (readonly [number, number])[], width: number, y = 0): THREE.BufferGeometry {
  const positions: number[] = []
  const half = width / 2

  const quad = (ax: number, az: number, bx: number, bz: number) => {
    const dx = bx - ax
    const dz = bz - az
    const len = Math.hypot(dx, dz)
    if (len === 0) return
    const nx = (-dz / len) * half
    const nz = (dx / len) * half
    const v: [number, number][] = [
      [ax + nx, az + nz],
      [ax - nx, az - nz],
      [bx + nx, bz + nz],
      [bx - nx, bz - nz],
    ]
    // 两个三角形
    for (const idx of [0, 1, 2, 2, 1, 3]) {
      positions.push(v[idx][0], y, v[idx][1])
    }
  }

  const disc = (cx: number, cz: number) => {
    const seg = 8
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2
      const a1 = ((i + 1) / seg) * Math.PI * 2
      positions.push(cx, y, cz)
      positions.push(cx + Math.cos(a0) * half, y, cz + Math.sin(a0) * half)
      positions.push(cx + Math.cos(a1) * half, y, cz + Math.sin(a1) * half)
    }
  }

  for (let i = 0; i < path.length - 1; i++) {
    quad(path[i][0], path[i][1], path[i + 1][0], path[i + 1][1])
    if (i > 0) disc(path[i][0], path[i][1])
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  const normals = new Array(positions.length).fill(0)
  for (let i = 1; i < normals.length; i += 3) normals[i] = 1
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  return geo
}

export function withVertexColor(geo: THREE.BufferGeometry, hex: string, scale = 1): THREE.BufferGeometry {
  const color = new THREE.Color(hex).multiplyScalar(scale)
  const count = geo.getAttribute('position').count
  const colors = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geo
}
