import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { liveSky } from '../liveSky'

const VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const FRAG = /* glsl */ `
uniform vec3 uTop;
uniform vec3 uHorizon;
uniform vec3 uGlowColor;
uniform float uGlow;
varying vec3 vDir;
void main() {
  float h = normalize(vDir).y;
  vec3 col = mix(uHorizon, uTop, smoothstep(0.02, 0.42, h));
  // 地平线橙色光晕（黄昏）
  col += uGlowColor * uGlow * (1.0 - smoothstep(0.0, 0.22, abs(h)));
  gl_FragColor = vec4(col, 1.0);
}
`

export function SkyDome() {
  const lightRef = useRef<THREE.DirectionalLight>(null)
  const ambRef = useRef<THREE.AmbientLight>(null)
  const uniforms = useMemo(
    () => ({
      uTop: { value: new THREE.Color('#0b1220') },
      uHorizon: { value: new THREE.Color('#16233a') },
      uGlowColor: { value: new THREE.Color('#ff7a3c') },
      uGlow: { value: 0 },
    }),
    [],
  )

  useFrame(() => {
    const s = liveSky.current
    uniforms.uTop.value.set(s.skyTop)
    uniforms.uHorizon.value.set(s.skyHorizon)
    uniforms.uGlow.value = s.horizonGlow
    if (lightRef.current) {
      lightRef.current.position.set(s.sunDir[0] * 1200, s.sunDir[1] * 1200, s.sunDir[2] * 1200)
      lightRef.current.color.set(s.sunColor)
      lightRef.current.intensity = s.sunIntensity
    }
    if (ambRef.current) ambRef.current.intensity = s.ambient
  })

  return (
    <group>
      <mesh>
        <sphereGeometry args={[3400, 24, 16]} />
        <shaderMaterial
          args={[{ uniforms, vertexShader: VERT, fragmentShader: FRAG, side: THREE.BackSide, depthWrite: false, fog: false }]}
        />
      </mesh>
      {/* 太阳/月亮共用一盏方向光 */}
      <directionalLight ref={lightRef} intensity={1.6} />
      <ambientLight ref={ambRef} intensity={0.75} color="#dfe9f5" />
    </group>
  )
}
