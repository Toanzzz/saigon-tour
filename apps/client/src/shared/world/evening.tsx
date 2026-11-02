import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  BoxGeometry,
  Color,
  type InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  Object3D,
} from 'three'
import { game } from '@/shared/state/game'
import type { Placement, Vec3 } from './assets'
import { BUI_VIEN_NEON_FRAMES } from './icons-bui-vien'
import { CAFE_NEON_STRIPS } from './icons-nguyen-hue'
import { PALETTE } from './palette'
import { STREET_LIGHT_PLACEMENTS } from './placements'
import { HERITAGE_WINDOWS } from './windows'

const UNIT = new BoxGeometry(1, 1, 1)
const LAMP_MATERIAL = new MeshBasicMaterial({
  color: '#ffd88a',
  toneMapped: false,
})
LAMP_MATERIAL.userData.unlit = true
const WINDOW_MATERIAL = new MeshBasicMaterial({
  color: PALETTE.window3000k,
  toneMapped: false,
})
WINDOW_MATERIAL.userData.unlit = true

const OBJECT = new Object3D()
const MATRIX = new Matrix4()

/** Existing lamp-glow boxes (12), authored by hand near each lamp head. */
const marketLamps: Placement[] = [-39, -30, -12, -3].map((x) => ({
  position: [x, 3.3, 6.3],
  scale: [0.22, 0.6, 0.22],
}))
const alleyLamps: Placement[] = [-38, -26, -14, -2].map((x) => ({
  position: [x, 4.2, 30.6],
  scale: [0.18, 0.5, 0.18],
}))
const riverLamps: Placement[] = [46, 58, 78, 93].map((x) => ({
  position: [x, 3.3, 37.4],
  scale: [0.2, 0.52, 0.2],
}))

/**
 * Street-lamp heads derived from the 16 `STREET_LIGHT_PLACEMENTS`: a glow quad
 * at each curved-lamp head. The `light-curved` model (scale 6.2) rises to ~4.3
 * units with the head cantilevered inward toward the road (z 12), so the glow
 * sits above the post and nudged toward the carriageway.
 */
const streetLampGlow: Placement[] = STREET_LIGHT_PLACEMENTS.map((p) => {
  const [x, , z] = p.position
  const inward = z < 12 ? 0.8 : -0.8
  return {
    position: [x, 4.3, z + inward] as Vec3,
    scale: [0.26, 0.26, 0.26] as Vec3,
  }
})

/** Merged lamp glow: 12 existing boxes + 16 street-lamp heads in one mesh. */
const LAMP_GLOW: Placement[] = [
  ...marketLamps,
  ...alleyLamps,
  ...riverLamps,
  ...streetLampGlow,
]

/** Count of merged lamp-glow instances, reused by the lamp-count test. */
export const LAMP_GLOW_COUNT = LAMP_GLOW.length

/** A neon tube: a placement plus its palette colour. */
type NeonTube = { placement: Placement; color: string }

/** Neon tubes built from the Phase 2 exports; the first strip flickers. */
function neonTubes() {
  const steady: NeonTube[] = []
  let flicker: Placement | null = null
  CAFE_NEON_STRIPS.forEach((strip, i) => {
    const color = i % 2 === 0 ? PALETTE.neonCyan : PALETTE.neonMagenta
    const placement: Placement = {
      position: strip.position,
      scale: strip.scale,
    }
    // One strip in six flickers; use the first café strip.
    if (i === 0) flicker = placement
    else steady.push({ placement, color })
  })
  BUI_VIEN_NEON_FRAMES.forEach((frame, i) => {
    const w = frame.scale[0] - 0.4
    const h = frame.scale[1] - 0.4
    const color =
      i === 1
        ? PALETTE.neonYellow
        : i === 0
          ? PALETTE.neonCyan
          : PALETTE.neonMagenta
    const [fx, fy, fz] = frame.position
    steady.push(
      {
        placement: {
          position: [fx, fy + 0.3, fz + 0.02],
          scale: [w, 0.14, 0.06],
        },
        color,
      },
      {
        placement: {
          position: [fx, fy - 0.2, fz + 0.02],
          scale: [0.14, h, 0.06],
        },
        color,
      }
    )
  })
  return { steady, flicker: flicker as Placement | null }
}

function writeMatrix(mesh: InstancedMesh, i: number, p: Placement) {
  OBJECT.position.set(...p.position)
  OBJECT.scale.set(...(p.scale as Vec3))
  OBJECT.updateMatrix()
  MATRIX.copy(OBJECT.matrix)
  mesh.setMatrixAt(i, MATRIX)
}

/** The flickering café strip — one small mesh so its opacity can dip alone. */
function FlickerStrip({ placement }: { placement: Placement }) {
  const material = useMemo(() => {
    const m = new MeshBasicMaterial({
      color: PALETTE.neonCyan,
      toneMapped: false,
    })
    m.userData.unlit = true
    return m
  }, [])
  useEffect(() => () => material.dispose(), [material])
  useFrame(() => {
    if (game.state.reducedMotion) {
      material.transparent = false
      material.opacity = 1
      return
    }
    // A gentle brightness dip at ~2.4 Hz (≤3 Hz per the look guide).
    const t = Date.now() / 1000
    material.transparent = true
    material.opacity =
      0.82 + 0.18 * (0.5 + 0.5 * Math.sin(t * 2 * Math.PI * 2.4))
  })
  return (
    <instancedMesh
      args={[UNIT, material, 1]}
      ref={(mesh) => {
        if (!mesh) return
        writeMatrix(mesh, 0, placement)
        mesh.instanceMatrix.needsUpdate = true
      }}
      frustumCulled
      dispose={null}
    />
  )
}

export function EveningLighting({ active = true }: { active?: boolean }) {
  const neon = useMemo(() => neonTubes(), [])
  const steadyMaterial = useMemo(() => {
    const m = new MeshBasicMaterial({ vertexColors: true, toneMapped: false })
    m.userData.unlit = true
    return m
  }, [])
  const steadyRef = useRef<InstancedMesh>(null)
  useEffect(() => {
    const mesh = steadyRef.current
    if (!mesh) return
    const color = new Color()
    neon.steady.forEach((tube, i) => {
      writeMatrix(mesh, i, tube.placement)
      mesh.setColorAt(i, color.set(tube.color))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [neon])
  if (!active) return null
  return (
    <group name="evening-lighting">
      <pointLight
        position={[-24, 4.6, 17]}
        color={PALETTE.neonMagenta}
        intensity={2.2}
        distance={27}
        decay={2}
      />
      <pointLight
        position={[58, 4.6, 37]}
        color="#8bd6d0"
        intensity={1.8}
        distance={32}
        decay={2}
      />
      <instancedMesh
        name="lamp-glow"
        args={[UNIT, LAMP_MATERIAL, LAMP_GLOW.length]}
        ref={(mesh) => {
          if (!mesh) return
          LAMP_GLOW.forEach((lamp, i) => {
            writeMatrix(mesh, i, lamp)
          })
          mesh.instanceMatrix.needsUpdate = true
        }}
        frustumCulled
        dispose={null}
      />
      <instancedMesh
        name="heritage-windows"
        args={[UNIT, WINDOW_MATERIAL, HERITAGE_WINDOWS.length]}
        ref={(mesh) => {
          if (!mesh) return
          HERITAGE_WINDOWS.forEach((w, i) => {
            writeMatrix(mesh, i, w)
          })
          mesh.instanceMatrix.needsUpdate = true
        }}
        frustumCulled
        dispose={null}
      />
      <instancedMesh
        name="neon-steady"
        ref={steadyRef}
        args={[UNIT, steadyMaterial, neon.steady.length]}
        frustumCulled
        dispose={null}
      />
      {neon.flicker && <FlickerStrip placement={neon.flicker} />}
    </group>
  )
}
