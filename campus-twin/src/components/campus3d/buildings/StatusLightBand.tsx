import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { BuildingSpec } from '../../../types'
import { useCampusStore } from '../../../store/campusStore'
import { BAND_COLOR, resolveBandStatus } from '../../../lib/bandStatus'
import { liveFx } from '../liveFx'

// 楼顶 0.4m 状态光带（规格 §9.3）：一圈 0.8m 宽环形带，2.6s 呼吸；
// 位置由父级 wrapper 控制（剖层时贴最顶层板）；扫描命中时金光闪烁
export function StatusLightBand({ b, occupancy, dimmed }: { b: BuildingSpec; occupancy: number; dimmed?: boolean }) {
  const matRef = useRef<THREE.MeshBasicMaterial>(null)
  const status = useCampusStore((s) => resolveBandStatus(s, b.id, occupancy))

  const ringGeo = useMemo(() => {
    const t = 0.8
    const w = b.footprint[0] + 0.8
    const d = b.footprint[1] + 0.8
    const parts = [
      new THREE.BoxGeometry(w, 0.4, t).translate(0, 0, (d - t) / 2),
      new THREE.BoxGeometry(w, 0.4, t).translate(0, 0, -(d - t) / 2),
      new THREE.BoxGeometry(t, 0.4, d - 2 * t).translate((w - t) / 2, 0, 0),
      new THREE.BoxGeometry(t, 0.4, d - 2 * t).translate(-(w - t) / 2, 0, 0),
    ]
    return mergeGeometries(parts, false)
  }, [b.footprint])

  useFrame(({ clock }) => {
    const mat = matRef.current
    if (!mat) return
    const t = clock.elapsedTime
    const flashing = t < (liveFx.goldUntil.get(b.id) ?? 0)
    const breath = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin((t * Math.PI * 2) / 2.6))
    const k = breath * (dimmed ? 0.15 : 1) * (flashing ? 1.6 : 1)
    mat.color.set(flashing ? '#f5c542' : BAND_COLOR[status]).multiplyScalar(k)
  })

  return (
    <mesh geometry={ringGeo}>
      <meshBasicMaterial ref={matRef} toneMapped={false} />
    </mesh>
  )
}
