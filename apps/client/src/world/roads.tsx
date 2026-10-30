import { useMemo } from 'react'
import type { Placement, Vec3 } from './assets'
import { PLAZAS, ROADS } from './district'
import { Block, Blocks, Sign } from './primitives'
import { Crosswalk } from './streets'

const ASPHALT = '#586465'
const PAVING = '#e3d3b0'

/** Dashes and curbs along every road longer than 20 units. */
function useMarkings() {
  return useMemo(() => {
    const dashes: Placement[] = []
    const curbs: Placement[] = []
    for (const road of ROADS) {
      const alongX = road.w >= road.d
      const length = alongX ? road.w : road.d
      if (length < 20) continue
      const start = (alongX ? road.x : road.z) - length / 2
      for (let t = start + 2; t < start + length - 1; t += 4) {
        dashes.push({
          position: alongX ? [t, 0.034, road.z] : [road.x, 0.034, t],
          scale: alongX ? [1.8, 0.02, 0.12] : [0.12, 0.02, 1.8],
        })
      }
      const half = (alongX ? road.d : road.w) / 2 + 0.2
      for (const side of [-1, 1]) {
        curbs.push({
          position: alongX
            ? [road.x, 0.12, road.z + side * half]
            : [road.x + side * half, 0.12, road.z],
          scale: alongX ? [road.w, 0.24, 0.4] : [0.4, 0.24, road.d],
        })
      }
    }
    return { dashes, curbs }
  }, [])
}

export function Roads() {
  const { dashes, curbs } = useMarkings()
  return (
    <group>
      <Blocks
        color={ASPHALT}
        placements={ROADS.map((road) => ({
          position: [road.x, 0.012, road.z] as Vec3,
          scale: [road.w, 0.04, road.d] as Vec3,
        }))}
      />
      <Blocks color="#ecce8c" placements={dashes} />
      <Blocks color="#eee2c5" placements={curbs} />
      <Blocks
        color={PAVING}
        placements={PLAZAS.map((plaza) => ({
          position: [plaza.x, 0.03, plaza.z] as Vec3,
          scale: [plaza.w, 0.06, plaza.d] as Vec3,
        }))}
      />
      {[-7, 19, 60, 88].map((x) => (
        <Crosswalk key={x} x={x} z={12} />
      ))}
      <Crosswalk x={69} z={-16} />
      {ROADS.filter((road) => road.name).map((road) => {
        const alongX = road.w >= road.d
        const position: Vec3 = alongX
          ? [road.x - road.w / 2 + 14, 2.4, road.z - road.d / 2 - 0.9]
          : [road.x - road.w / 2 - 0.9, 2.4, road.z + road.d / 2 - 14]
        return (
          <group key={road.name}>
            <Block
              position={[position[0], 1.2, position[2]]}
              scale={[0.12, 2.4, 0.12]}
              color="#46635a"
            />
            <Sign
              text={road.name ?? ''}
              position={position}
              rotation={[0, alongX ? 0 : Math.PI / 2, 0]}
              width={2.6}
              height={0.55}
              color="#26577a"
            />
          </group>
        )
      })}
      {PLAZAS.filter((plaza) => plaza.name).map((plaza) => (
        <Block
          key={plaza.name}
          position={[plaza.x, 0.07, plaza.z]}
          scale={[plaza.w - 2, 0.02, plaza.d - 2]}
          color="#ead9b8"
        />
      ))}
    </group>
  )
}
