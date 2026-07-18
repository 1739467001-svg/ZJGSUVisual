import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useCampusStore } from '../../store/campusStore'
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

export function CampusCanvas() {
  const selectBuilding = useCampusStore((s) => s.selectBuilding)
  const setCameraShot = useCampusStore((s) => s.setCameraShot)

  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [452, 447, 452], fov: 42, near: 1, far: 7000 }}
      gl={{ antialias: true }}
      onPointerMissed={() => {
        selectBuilding(undefined)
        setCameraShot({ kind: 'overview' })
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
      <CameraDirector />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={80}
        maxDistance={1800}
        maxPolarAngle={Math.PI / 2.1}
      />
    </Canvas>
  )
}
