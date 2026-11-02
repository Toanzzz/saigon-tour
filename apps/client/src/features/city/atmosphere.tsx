import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import {
  BackSide,
  Color,
  type Mesh,
  ShaderMaterial,
  SphereGeometry,
} from 'three'
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

/** Palette top/horizon pair for the current weather and time of day. */
export function skyColors(rain: boolean, evening: boolean) {
  if (rain) return { top: PALETTE.skyRainTop, horizon: PALETTE.skyRainHorizon }
  if (evening) return { top: PALETTE.skyEveTop, horizon: PALETTE.skyEveHorizon }
  return { top: PALETTE.skyDayTop, horizon: PALETTE.skyDayHorizon }
}

function ComicAtmosphere({
  rain,
  evening,
}: {
  rain: boolean
  evening: boolean
}) {
  // Fog === the current horizon colour so distant geometry melts into the sky.
  const { horizon } = skyColors(rain, evening)
  return (
    <>
      {/* The gradient dome paints the sky; the flat background is only a
          fallback colour behind the dome and under the far plane. */}
      <color attach="background" args={[horizon]} />
      <fog attach="fog" args={[horizon, rain ? 40 : 75, rain ? 110 : 150]} />
      <hemisphereLight
        args={
          evening ? ['#a9b9ef', '#33465a', 1.3] : ['#fff3d5', '#8e9686', 1.85]
        }
      />
      <SkyDome rain={rain} evening={evening} />
    </>
  )
}

/** Shared dome geometry: a `BackSide` sphere viewed from the inside. */
const DOME = new SphereGeometry(200, 32, 16)

/**
 * A gradient paper sky: a radius-200 `BackSide` sphere recentred on the camera
 * each frame (so it stays well inside `far` = 220). The vertex shader passes
 * the local direction; the fragment shader blends `top` to `horizon` on
 * `direction.y`. `fog: false` keeps the dome clear of linear fog, and it
 * renders first so every other layer draws over it.
 */
function SkyDome({ rain, evening }: { rain: boolean; evening: boolean }) {
  const { camera } = useThree()
  const ref = useRef<Mesh>(null)
  const material = useMemo(() => {
    return new ShaderMaterial({
      side: BackSide,
      depthWrite: false,
      depthTest: false,
      fog: false,
      uniforms: {
        top: { value: new Color() },
        horizon: { value: new Color() },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 top;
        uniform vec3 horizon;
        varying vec3 vDir;
        void main() {
          // Blend from the horizon band (y≈0) up to the zenith (y≈1).
          float t = clamp(vDir.y * 1.4 + 0.1, 0.0, 1.0);
          gl_FragColor = vec4(mix(horizon, top, t), 1.0);
        }
      `,
    })
  }, [])
  const colors = skyColors(rain, evening)
  const top = material.uniforms.top.value as Color
  const horizon = material.uniforms.horizon.value as Color
  top.set(colors.top)
  horizon.set(colors.horizon)
  // Recentre on the camera every frame; in XR this is the camera rig origin,
  // so the dome stays large and centred for both eyes.
  useFrame(() => {
    ref.current?.position.copy(camera.position)
  })
  return (
    <mesh
      ref={ref}
      geometry={DOME}
      material={material}
      renderOrder={-1000}
      frustumCulled={false}
      dispose={null}
    />
  )
}
