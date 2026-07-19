// Wow 效果的帧级共享状态（useFrame 直读，不经 React 重渲染）
export const liveFx = {
  scanDim: 0, // 0..0.4 扫描期间全场降亮
  scanKeep: new Set<string>(), // 降亮豁免的候选楼
  goldUntil: new Map<string, number>(), // buildingId -> 金光闪烁截止时刻（clock.elapsedTime）
  heat: 0, // 0..1 热力模式强度（damp 过渡）
  heatTarget: 0,
  heatMetric: new Map<string, number>(),
  tide: 0, // 0..1 下课潮汐强度（FlowParticles 按 90s 衰减）
  traffic: {} as Record<string, number>, // roadId -> 人流权重（ClockBridge 1Hz 同步）
}
