import { useThree } from '@react-three/fiber'
import { useSelector } from '@tanstack/react-store'
import { useMemo } from 'react'
import {
  BoxGeometry,
  CircleGeometry,
  DoubleSide,
  MeshBasicMaterial,
  Object3D,
} from 'three'
import { city } from '@/shared/api/city'
import { game } from '@/shared/state/game'
import type { Placement, Vec3 } from '@/shared/world/assets'
import { PLAZAS, ROADS } from '@/shared/world/district'
import { PALETTE } from '@/shared/world/palette'

/**
 * Wet pavement for rain, comic-only. Two cheap layers, no env maps and no
 * reflection render:
 *   1. A translucent `wetRoad` tint overlay laid over every road and plaza
 *      quad, darkening the asphalt toward blue (one instanced draw).
 *   2. A sparse scatter of flat puddle ellipses in the sky-horizon colour
 *      (one instanced draw). In the evening the puddles brighten so they read
 *      as glints under the lamp and neon glow.
 *
 * Below 700 px the puddle scatter is dropped (mobile budget); the tint stays.
 */

const PUDDLE_GEOMETRY = new CircleGeometry(1, 20)
const TINT_BOX = new BoxGeometry(1, 1, 1)
const TINT_OBJECT = new Object3D()
const PUDDLE_OBJECT = new Object3D()

/** Seeded RNG so the puddle scatter is stable across reloads. */
function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
}

/** Tint overlays: one flat quad just above each road/plaza surface. */
function tintPlacements(): Placement[] {
  const roads = ROADS.map((r) => ({
    position: [r.x, 0.045, r.z] as Vec3,
    scale: [r.w, 0.02, r.d] as Vec3,
  }))
  const plazas = PLAZAS.map((p) => ({
    position: [p.x, 0.065, p.z] as Vec3,
    scale: [p.w, 0.02, p.d] as Vec3,
  }))
  return [...roads, ...plazas]
}

/** Scatter a handful of puddles across the larger road/plaza rects. */
function puddlePlacements(): Placement[] {
  const next = rng(91)
  const surfaces = [...ROADS, ...PLAZAS].filter((r) => r.w * r.d > 60)
  const out: Placement[] = []
  for (const r of surfaces) {
    const count = Math.min(4, Math.max(1, Math.round((r.w * r.d) / 220)))
    for (let i = 0; i < count; i++) {
      const px = r.x + (next() - 0.5) * (r.w - 2)
      const pz = r.z + (next() - 0.5) * (r.d - 2)
      const rad = 0.6 + next() * 1.1
      out.push({
        position: [px, 0.05, pz],
        rotation: [-Math.PI / 2, 0, 0],
        scale: [rad, rad * (0.7 + next() * 0.3), 1],
      })
    }
  }
  return out
}

export function WetPavement() {
  const rain = useSelector(city, (state) => state.weather === 'rain')
  const evening = useSelector(game, (s) => s.timeOfDay === 'evening')
  const mobile = useThree((state) => state.size.width) < 700
  const tints = useMemo(() => tintPlacements(), [])
  const puddles = useMemo(() => puddlePlacements(), [])
  const tintMaterial = useMemo(() => {
    const m = new MeshBasicMaterial({
      color: PALETTE.wetRoad,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    })
    m.userData.unlit = true
    return m
  }, [])
  const puddleMaterial = useMemo(() => {
    const m = new MeshBasicMaterial({
      color: PALETTE.skyRainHorizon,
      transparent: true,
      opacity: 0.4,
      side: DoubleSide,
      depthWrite: false,
      toneMapped: false,
    })
    m.userData.unlit = true
    return m
  }, [])
  // Evening glint: brighten the puddles toward the warm lamp glow.
  puddleMaterial.color.set(
    evening ? PALETTE.window3000k : PALETTE.skyRainHorizon
  )
  puddleMaterial.opacity = evening ? 0.5 : 0.4
  if (!rain) return null
  return (
    <group name="wet-pavement">
      <TintLayer placements={tints} material={tintMaterial} />
      {!mobile && (
        <instancedMesh
          name="puddles"
          args={[PUDDLE_GEOMETRY, puddleMaterial, puddles.length]}
          renderOrder={5}
          frustumCulled
          dispose={null}
          ref={(mesh) => {
            if (!mesh) return
            puddles.forEach((p, i) => {
              PUDDLE_OBJECT.position.set(...p.position)
              PUDDLE_OBJECT.rotation.set(...(p.rotation ?? [0, 0, 0]))
              const s = p.scale as Vec3
              PUDDLE_OBJECT.scale.set(s[0], s[1], s[2])
              PUDDLE_OBJECT.updateMatrix()
              mesh.setMatrixAt(i, PUDDLE_OBJECT.matrix)
            })
            mesh.instanceMatrix.needsUpdate = true
          }}
        />
      )}
    </group>
  )
}

function TintLayer({
  placements,
  material,
}: {
  placements: Placement[]
  material: MeshBasicMaterial
}) {
  return (
    <instancedMesh
      name="wet-tint"
      args={[TINT_BOX, material, placements.length]}
      renderOrder={4}
      frustumCulled
      dispose={null}
      ref={(mesh) => {
        if (!mesh) return
        placements.forEach((p, i) => {
          TINT_OBJECT.position.set(...p.position)
          TINT_OBJECT.scale.set(...(p.scale as Vec3))
          TINT_OBJECT.updateMatrix()
          mesh.setMatrixAt(i, TINT_OBJECT.matrix)
        })
        mesh.instanceMatrix.needsUpdate = true
      }}
    />
  )
}
