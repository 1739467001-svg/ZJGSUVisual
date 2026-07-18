import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { simClock, toLocalIso } from '../../sim/clock'
import { skyStateAt } from '../../sim/skyState'
import { liveSky } from './liveSky'
import { useCampusStore } from '../../store/campusStore'

// 每帧：推进虚拟时钟 → 刷新天空状态 → ~1Hz 回同步 store（TopBar/BottomBar 显示）
export function ClockBridge() {
  const frames = useRef(0)
  const acc = useRef(0)

  // ?t=HH:mm 调试钩子：设定虚拟时刻并暂停（截图验证用）
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('t')
    if (t && /^\d{1,2}:\d{2}$/.test(t)) {
      const s = useCampusStore.getState()
      s.setVirtualTs(`${s.clock.virtualTs.slice(0, 10)}T${t.padStart(5, '0')}:00`)
      s.setClockRate(0)
    }
  }, [])

  useFrame((state, delta) => {
    simClock.tick(delta)
    liveSky.current = skyStateAt(simClock.now())

    const w = window as unknown as Record<string, unknown>
    // EffectComposer 多趟渲染会让 info 每趟重置：改手动累计，读的是上一帧全帧值
    if (state.gl.info.autoReset) state.gl.info.autoReset = false
    w.__DRAWCALLS__ = state.gl.info.render.calls
    state.gl.info.reset()
    w.__STORE__ = useCampusStore
    frames.current += 1
    if (frames.current === 45) w.__SCENE_READY__ = true

    acc.current += delta
    if (acc.current >= 1) {
      acc.current = 0
      const iso = toLocalIso(simClock.now())
      if (iso !== useCampusStore.getState().clock.virtualTs) {
        useCampusStore.setState((cur) => ({ clock: { ...cur.clock, virtualTs: iso } }))
      }
    }
  })

  return null
}
