import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { BuildingSpec } from '../../../types'
import { useCampusStore } from '../../../store/campusStore'
import { BAND_COLOR, resolveBandStatus } from '../../../lib/bandStatus'

// 楼顶 0.4m 状态光带（规格 §9.3）：一圈 0.8m 宽环形带，颜色 = 该楼聚合状态，2.6s 呼吸
export function StatusLightBand({ b, height, occupancy }: { b: BuildingSpec; height: number; occupancy: number }) {
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
    const k = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin((clock.elapsedTime * Math.PI * 2) / 2.6))
    mat.color.set(BAND_COLOR[status]).multiplyScalar(k)
  })

  return (
    <mesh geometry={ringGeo} position={[0, height + 0.2, 0]}>
      <meshBasicMaterial ref={matRef} color={BAND_COLOR[status]} toneMapped={false} />
    </mesh>
  )
}
