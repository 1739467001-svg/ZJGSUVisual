import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { MapPin } from 'lucide-react'
import { useCampusStore } from '../../../store/campusStore'
import { buildRouteCurve } from '../../../lib/routeCurve'

// Wow#6 金色路径（链路四）：路径曲线从起点"生长"2s → 流动光点沿线奔跑
// → 沿途地标气泡 → 镜头 3.5s 低空跟拍（follow shot 在 CameraDirector）
const DOTS = 24

export function RouteFlow() {
  const route = useCampusStore((s) => s.lastRoute)
  const sceneMode = useCampusStore((s) => s.sceneMode)
  const nonce = useCampusStore((s) => s.sceneNonce)
  const setCameraShot = useCampusStore((s) => s.setCameraShot)
  const progress = useRef(1)
  const first = useRef(true)
  const dotsRef = useRef<THREE.Points>(null)

  const active = sceneMode === 'navigation' && !!route
  const curve = useMemo(() => (route ? buildRouteCurve(route.waypoints) : null), [route])
  const tubeGeo = useMemo(() => (curve ? new THREE.TubeGeometry(curve, 240, 0.9, 6, false) : null), [curve])
  const dotGeo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(DOTS * 3), 3))
    return g
  }, [])
  const landmarks = useMemo(() => (route ? route.segments.filter((s) => s.landmark) : []), [route])

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    if (active && route) {
      progress.current = 0
      setCameraShot({ kind: 'follow', route, ms: 3500 })
    }
  }, [nonce, active, route, setCameraShot])

  useFrame(({ clock }, delta) => {
    if (!active || !curve || !tubeGeo) return
    progress.current = Math.min(1, progress.current + delta / 2)
    const indexCount = tubeGeo.index?.count ?? 0
    tubeGeo.setDrawRange(0, Math.floor(indexCount * progress.current))

    const attr = dotsRef.current?.geometry.getAttribute('position') as THREE.BufferAttribute | undefined
    if (attr) {
      const span = curve.getLength() / 45 // 约 45m/s 沿线奔跑
      for (let i = 0; i < DOTS; i++) {
        const u = (clock.elapsedTime / span + i / DOTS) % 1
        if (u > progress.current) {
          attr.setXYZ(i, 0, -100, 0)
          continue
        }
        const p = curve.getPointAt(u)
        attr.setXYZ(i, p.x, p.y + 0.6, p.z)
      }
      attr.needsUpdate = true
    }
  })

  if (!active || !curve || !tubeGeo) return null
  return (
    <group>
      <mesh geometry={tubeGeo}>
        <meshBasicMaterial color="#f5c542" toneMapped={false} />
      </mesh>
      <points ref={dotsRef} geometry={dotGeo}>
        <pointsMaterial color="#ffe9a8" size={3} sizeAttenuation transparent opacity={0.95} blending={THREE.AdditiveBlending} depthWrite={false} />
      </points>
      {landmarks.map((seg, i) => (
        <Html key={i} position={[seg.to[0], 12, seg.to[1]]} center zIndexRange={[25, 0]}>
          <div className="pointer-events-none flex items-center gap-1 whitespace-nowrap rounded-full border border-gold/40 bg-ink/85 px-2 py-0.5 text-[11px] text-gold">
            <MapPin size={10} />
            {seg.landmark}
          </div>
        </Html>
      ))}
    </group>
  )
}
