import { LOOK } from '@/shared/world/look-flag'
import { PALETTE } from '@/shared/world/palette'

/**
 * Sky colour, fog and the hemisphere fill light. Phases 1–5 edit this module,
 * not `scene.tsx`. The fog colour always equals the current horizon colour
 * (look guide). Under `classic` the values are byte-for-byte today's look.
 */
export function Atmosphere({
  rain,
  evening,
}: {
  rain: boolean
  evening: boolean
}) {
  if (LOOK === 'classic')
    return <ClassicAtmosphere rain={rain} evening={evening} />
  return <ComicAtmosphere rain={rain} evening={evening} />
}

function ClassicAtmosphere({
  rain,
  evening,
}: {
  rain: boolean
  evening: boolean
}) {
  const background = rain ? '#8293a3' : evening ? '#2d385f' : '#b1b8cb'
  return (
    <>
      <color attach="background" args={[background]} />
      <fog attach="fog" args={[background, rain ? 40 : 75, rain ? 110 : 150]} />
      <hemisphereLight
        args={
          evening ? ['#a9b9ef', '#33465a', 1.45] : ['#fff3d5', '#7e8976', 2.1]
        }
      />
    </>
  )
}

function ComicAtmosphere({
  rain,
  evening,
}: {
  rain: boolean
  evening: boolean
}) {
  // Fog === the current horizon colour so distant geometry melts into the sky.
  const horizon = rain
    ? PALETTE.skyRainHorizon
    : evening
      ? PALETTE.skyEveHorizon
      : PALETTE.skyDayHorizon
  return (
    <>
      <color attach="background" args={[horizon]} />
      <fog attach="fog" args={[horizon, rain ? 40 : 75, rain ? 110 : 150]} />
      <hemisphereLight
        args={
          evening ? ['#a9b9ef', '#33465a', 1.3] : ['#fff3d5', '#8e9686', 1.85]
        }
      />
    </>
  )
}
