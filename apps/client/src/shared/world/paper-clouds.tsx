import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import {
  Color,
  DoubleSide,
  type InstancedMesh,
  MeshBasicMaterial,
  Object3D,
  Shape,
  ShapeGeometry,
} from 'three'
import { game } from '@/shared/state/game'
import { PALETTE } from '@/shared/world/palette'
import type { Vec3 } from './assets'

/**
 * Flat paper clouds: a 3-lobe cutout (cream with an ink edge, per the look
 * guide) drawn as one `InstancedMesh`, with a second instanced mesh for the
 * darker shadow card 0.15 units behind. Clouds ride a ring outside the walls,
 * drift slowly, and billboard around the vertical axis only so they always
 * face the camera but never tip. They freeze under reduced motion.
 *
 * `placements` lets other modules (Phase 2's cathedral clouds) hang extra
 * clouds at specific anchors instead of the default ring.
 */
export type CloudPlacement = {
  /** Cloud centre. */
  position: Vec3
  /** Overall scale multiplier (default 1). */
  scale?: number
  /** Drift phase offset so a cluster doesn't move in lockstep. */
  phase?: number
}

/** A 3-lobe cloud silhouette centred on the origin, about 10 × 4 units. */
function cloudShape(): ShapeGeometry {
  const shape = new Shape()
  shape.absarc(-2.6, 0, 1.9, Math.PI, 0, false)
  shape.absarc(0, 0.6, 2.6, Math.PI, 0, false)
  shape.absarc(2.8, 0, 2.0, Math.PI, 0, false)
  shape.lineTo(-4.5, 0)
  shape.closePath()
  return new ShapeGeometry(shape, 8)
}

/** Default ring of clouds outside the walls (BOUNDS x −52..124, z −116..44). */
export function ringPlacements(count: number): CloudPlacement[] {
  const cx = 36
  const cz = -36
  const radius = 135
  const result: CloudPlacement[] = []
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + 0.4
    const r = radius + ((i * 37) % 20) - 10
    const height = 25 + ((i * 53) % 21) // 25..45
    result.push({
      position: [cx + Math.cos(a) * r, height, cz + Math.sin(a) * r],
      scale: 1 + ((i * 29) % 10) / 20, // 1.0..1.45
      phase: i * 1.37,
    })
  }
  return result
}

const CLOUD_GEOMETRY = cloudShape()

export function PaperClouds({ placements }: { placements?: CloudPlacement[] }) {
  const { size } = useThree()
  const list = useMemo(() => {
    if (placements) return placements
    // Mobile (< 700 px) uses 6 clouds; desktop uses 10.
    return ringPlacements(size.width < 700 ? 6 : 10)
  }, [placements, size.width])
  const cream = useMemo(() => {
    const material = new MeshBasicMaterial({
      color: new Color(PALETTE.paper).offsetHSL(0, -0.04, 0.08),
      side: DoubleSide,
      fog: false,
    })
    material.userData.unlit = true
    return material
  }, [])
  const shadow = useMemo(() => {
    const material = new MeshBasicMaterial({
      color: new Color(PALETTE.ink).lerp(new Color(PALETTE.paperEdge), 0.35),
      side: DoubleSide,
      fog: false,
    })
    material.userData.unlit = true
    return material
  }, [])
  const creamRef = useRef<InstancedMesh>(null)
  const shadowRef = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  useFrame(({ camera }) => {
    const creamMesh = creamRef.current
    const shadowMesh = shadowRef.current
    if (!creamMesh || !shadowMesh) return
    const reduced = game.state.reducedMotion
    const t = reduced ? 0 : Date.now() / 1000
    list.forEach((cloud, i) => {
      const [x, y, z] = cloud.position
      const phase = cloud.phase ?? 0
      // Slow drift around the ring centre: a small circular sway.
      const drift = reduced ? 0 : Math.sin(t * 0.04 + phase) * 6
      const px = x + drift
      const scale = cloud.scale ?? 1
      // Billboard around Y only: yaw toward the camera, never pitch/roll.
      const yaw = Math.atan2(camera.position.x - px, camera.position.z - z)
      dummy.position.set(px, y, z)
      dummy.rotation.set(0, yaw, 0)
      dummy.scale.setScalar(scale)
      dummy.updateMatrix()
      creamMesh.setMatrixAt(i, dummy.matrix)
      // Shadow card: same yaw, pushed 0.15 behind along the facing normal.
      const back = 0.15
      dummy.position.set(
        px - Math.sin(yaw) * back,
        y - 0.25 * scale,
        z - Math.cos(yaw) * back
      )
      dummy.updateMatrix()
      shadowMesh.setMatrixAt(i, dummy.matrix)
    })
    creamMesh.instanceMatrix.needsUpdate = true
    shadowMesh.instanceMatrix.needsUpdate = true
  })
  return (
    <group>
      <instancedMesh
        ref={shadowRef}
        args={[CLOUD_GEOMETRY, shadow, list.length]}
        renderOrder={-900}
        frustumCulled={false}
        dispose={null}
      />
      <instancedMesh
        ref={creamRef}
        args={[CLOUD_GEOMETRY, cream, list.length]}
        renderOrder={-899}
        frustumCulled={false}
        dispose={null}
      />
    </group>
  )
}
