import { useMemo } from 'react'
import { world } from '../../../data/world'
import { ribbonGeometry } from './ribbon'

// 水系：景观湖 = 椭圆半透明盘面 + 北部景观河 = 贴路径条带（规格 §9.2）
export function Water() {
  const lake = world.water.find((w) => w.kind === 'lake')
  const river = world.water.find((w) => w.kind === 'river')
  const riverGeo = useMemo(
    () => (river && river.kind === 'river' ? ribbonGeometry(river.path, river.width, 0.05) : null),
    [river],
  )

  return (
    <group>
      {lake && lake.kind === 'lake' && (
        <mesh
          rotation-x={-Math.PI / 2}
          position={[lake.center[0], 0.05, lake.center[1]]}
          scale={[lake.radius[0], lake.radius[1], 1]}
        >
          <circleGeometry args={[1, 48]} />
          <meshStandardMaterial color="#123a52" transparent opacity={0.85} roughness={0.15} metalness={0.2} />
        </mesh>
      )}
      {riverGeo && (
        <mesh geometry={riverGeo}>
          <meshStandardMaterial color="#123a52" transparent opacity={0.85} roughness={0.15} metalness={0.2} />
        </mesh>
      )}
    </group>
  )
}
