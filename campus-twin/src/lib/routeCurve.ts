import * as THREE from 'three'

/** 路径折线 → 3D 曲线（贴路网，不用平滑样条以免切角穿楼） */
export function buildRouteCurve(waypoints: [number, number][], y = 1.6): THREE.CurvePath<THREE.Vector3> {
  const path = new THREE.CurvePath<THREE.Vector3>()
  for (let i = 0; i + 1 < waypoints.length; i++) {
    path.add(
      new THREE.LineCurve3(
        new THREE.Vector3(waypoints[i][0], y, waypoints[i][1]),
        new THREE.Vector3(waypoints[i + 1][0], y, waypoints[i + 1][1]),
      ),
    )
  }
  return path
}
