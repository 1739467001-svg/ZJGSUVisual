import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import type { BloomEffect } from 'postprocessing'
import { useCampusStore } from '../../store/campusStore'
import { liveSky } from './liveSky'
import { ClockBridge } from './ClockBridge'
import { Ground } from './world/Ground'
import { SkyDome } from './world/SkyDome'
import { Roads } from './world/Roads'
import { Water } from './world/Water'
import { Greenery } from './world/Greenery'
import { LampPosts } from './world/LampPosts'
import { DistantQuarters } from './world/DistantQuarters'
import { BuildingLayer } from './buildings/BuildingLayer'
import { CameraDirector } from './camera/CameraDirector'
import { ScanBeam } from './effects/ScanBeam'
import { PulseMarker } from './effects/PulseMarker'
import { HeatLayer } from './effects/HeatLayer'
import { RouteFlow } from './effects/RouteFlow'
import { FlowParticles } from './effects/FlowParticles'

// PostLayer（规格 §9.1）：Bloom + Vignette；强度随昼夜（夜晚 +40%）；低画质整体关闭
function PostFX() {
  const quality = useCampusStore((s) => s.quality)
  const bloomRef = useRef<BloomEffect | null>(null)
  useFrame((_, delta) => {
    const bloom = bloomRef.current
    if (bloom) {
      bloom.intensity = THREE.MathUtils.damp(bloom.intensity, liveSky.current.isNight ? 0.5 : 0.35, 2, delta)
    }
  })
  if (quality === 'low') return null
  return (
    <EffectComposer>
      <Bloom
        // 回调 ref：对象 ref 会被 postprocessing 内部 JSON.stringify(props) 序列化，挂载后 current 含 THREE 循环引用导致崩溃
        ref={(effect: BloomEffect | null) => {
          bloomRef.current = effect
        }}
        luminanceThreshold={0.6}
        luminanceSmoothing={0.2}
        intensity={0.35}
        mipmapBlur
      />
      <Vignette offset={0.25} darkness={0.35} />
    </EffectComposer>
  )
}

// 钻取层级 → 镜头语言（§9.4）：Lv1 环绕 / Lv2 推近 / Lv3 房间特写 / Lv0 总览
function DrillWatcher() {
  const drill = useCampusStore((s) => s.drill)
  const setCameraShot = useCampusStore((s) => s.setCameraShot)
  useEffect(() => {
    if (drill.level === 0) setCameraShot({ kind: 'overview' })
    else if (drill.level === 1 && drill.buildingId) setCameraShot({ kind: 'orbit', buildingId: drill.buildingId, ms: 20000 })
    else if (drill.level === 2 && drill.buildingId) setCameraShot({ kind: 'push', buildingId: drill.buildingId, ms: 1200 })
    else if (drill.level === 3 && drill.roomId) setCameraShot({ kind: 'room', roomId: drill.roomId, ms: 1200 })
  }, [drill, setCameraShot])
  return null
}

export function CampusCanvas() {
  const selectBuilding = useCampusStore((s) => s.selectBuilding)
  const setDrill = useCampusStore((s) => s.setDrill)
  const quality = useCampusStore((s) => s.quality)

  return (
    <Canvas
      dpr={quality === 'low' ? 1 : [1, 1.75]}
      // 首屏唤醒：镜头从 1700m 高空俯冲至总览位（CameraDirector damp 接管，约 2s 落位）
      camera={{ position: [900, 1100, 900], fov: 42, near: 1, far: 7000 }}
      gl={{ antialias: true }}
      onPointerMissed={() => {
        selectBuilding(undefined)
        setDrill({ level: 0 })
      }}
    >
      <ClockBridge />
      <SkyDome />
      <Ground />
      <Roads />
      <Water />
      <Greenery />
      <LampPosts />
      <DistantQuarters />
      <BuildingLayer />
      <ScanBeam />
      <PulseMarker />
      <HeatLayer />
      <RouteFlow />
      <FlowParticles />
      <CameraDirector />
      <DrillWatcher />
      <PostFX />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={30}
        maxDistance={1800}
        maxPolarAngle={Math.PI / 2.1}
      />
    </Canvas>
  )
}
