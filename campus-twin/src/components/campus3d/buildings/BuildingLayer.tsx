import { world } from '../../../data/world'
import { useOccupancyMap } from '../useOccupancy'
import { BuildingMesh } from './BuildingMesh'
import { BuildingLabels } from './BuildingLabels'
import { WindowBands } from './WindowBands'

export function BuildingLayer() {
  const occupancy = useOccupancyMap()
  return (
    <group>
      {world.buildings.map((b) => (
        <BuildingMesh key={b.id} b={b} occupancy={occupancy.get(b.id) ?? 0} />
      ))}
      <WindowBands occupancy={occupancy} />
      <BuildingLabels occupancy={occupancy} />
    </group>
  )
}
