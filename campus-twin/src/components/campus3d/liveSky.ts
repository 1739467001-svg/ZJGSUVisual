import type { SkyState } from '../../sim/skyState'
import { skyStateAt } from '../../sim/skyState'
import { simClock } from '../../sim/clock'

// 每帧刷新的天空状态（模块级可变对象，useFrame 直读，避免 React 重渲染）
export const liveSky: { current: SkyState } = { current: skyStateAt(simClock.now()) }
