import { useFrame, useThree } from '@react-three/fiber'
import { useSelector } from '@tanstack/react-store'
import { useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  InstancedBufferAttribute,
  type InstancedMesh,
  Object3D,
  PlaneGeometry,
  ShaderMaterial,
} from 'three'
import { city } from '@/shared/api/city'
import { game } from '@/shared/state/game'
import { PALETTE } from '@/shared/world/palette'
import { useXRPresenting } from '@/shared/xr'

/**
 * Comic rain: one `InstancedMesh` of thin quads in a box that follows the
 * camera. A vertex shader animates the fall from a single `time` uniform, so
 * there are no per-frame CPU matrix writes. The streaks are unlit, never
 * inked, and write no depth. Reduced motion makes them sparse and slow; XR
 * halves the count; mobile drops to the budget's 300.
 *
 * Mount only in rain (comic). The streaks live in a ±`SPAN` box recentred on
 * the camera each frame; each instance carries a random offset so they stay
 * evenly scattered as the box moves.
 */

const SPAN = 36
const HEIGHT = 30
const STREAK_GEOMETRY = new PlaneGeometry(0.04, 1.3)

function makeMaterial() {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    fog: false,
    blending: AdditiveBlending,
    uniforms: {
      time: { value: 0 },
      span: { value: SPAN },
      height: { value: HEIGHT },
      fall: { value: 48 },
      tint: { value: [0.72, 0.8, 0.88] },
      opacity: { value: 0.32 },
    },
    vertexShader: /* glsl */ `
      uniform float time;
      uniform float span;
      uniform float height;
      uniform float fall;
      attribute vec3 offset;
      attribute float speed;
      void main() {
        // Wrap the fall within [0, height] using the per-instance speed.
        float drop = mod(offset.y - time * fall * speed, height);
        vec3 base = vec3(offset.x, drop - height * 0.5, offset.z);
        // The plane's own local y gives the streak its length.
        vec3 world = base + vec3(0.0, position.y, 0.0);
        world.x += position.x;
        vec4 mv = modelViewMatrix * vec4(world, 1.0);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 tint;
      uniform float opacity;
      void main() {
        gl_FragColor = vec4(tint, opacity);
      }
    `,
  })
}

export function Rain() {
  const rain = useSelector(city, (state) => state.weather === 'rain')
  if (!rain) return null
  return <RainStreaks />
}

function RainStreaks() {
  const xr = useXRPresenting()
  const viewportWidth = useThree((state) => state.size.width)
  const reduced = useSelector(game, (s) => s.reducedMotion)
  const material = useMemo(() => makeMaterial(), [])
  const ref = useRef<InstancedMesh>(null)
  const object = useMemo(() => new Object3D(), [])

  const count = useMemo(() => {
    let n = viewportWidth < 700 ? 300 : 600
    if (xr) n = Math.round(n / 2)
    if (reduced) n = Math.round(n / 3)
    return n
  }, [viewportWidth, xr, reduced])

  useEffect(() => {
    material.uniforms.fall.value = reduced ? 14 : 48
    material.uniforms.opacity.value = reduced ? 0.22 : 0.32
  }, [reduced, material])
  useEffect(() => () => material.dispose(), [material])

  useEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const offsets = new Float32Array(count * 3)
    const speeds = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      offsets[i * 3] = (Math.random() - 0.5) * SPAN * 2
      offsets[i * 3 + 1] = Math.random() * HEIGHT
      offsets[i * 3 + 2] = (Math.random() - 0.5) * SPAN * 2
      speeds[i] = 0.7 + Math.random() * 0.6
      object.position.set(0, 0, 0)
      object.updateMatrix()
      mesh.setMatrixAt(i, object.matrix)
    }
    mesh.geometry.setAttribute(
      'offset',
      new InstancedBufferAttribute(offsets, 3)
    )
    mesh.geometry.setAttribute('speed', new InstancedBufferAttribute(speeds, 1))
    mesh.instanceMatrix.needsUpdate = true
  }, [count, object])

  useFrame(({ camera }, delta) => {
    const mesh = ref.current
    if (!mesh) return
    material.uniforms.time.value += Math.min(delta, 0.05)
    // Recentre the streak box on the camera (XR: the rig origin).
    mesh.position.set(camera.position.x, camera.position.y, camera.position.z)
  })

  return (
    <instancedMesh
      key={count}
      ref={ref}
      name="rain-streaks"
      args={[STREAK_GEOMETRY, material, count]}
      renderOrder={900}
      frustumCulled={false}
      dispose={null}
    />
  )
}

/** Rain palette tokens, exported so the puddle layer and tests share them. */
export const RAIN_TINT = PALETTE.skyRainHorizon
export const WET_ROAD = PALETTE.wetRoad
