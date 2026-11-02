import { useFrame } from '@react-three/fiber'
import { NEIGHBOR_IDS, type NpcId, RESIDENT_IDS } from '@saigon/shared'
import { useSelector } from '@tanstack/react-store'
import { useMemo, useRef } from 'react'
import {
  Color,
  ConeGeometry,
  CylinderGeometry,
  type InstancedMesh,
  type Material,
  MeshStandardMaterial,
  MeshToonMaterial,
  Object3D,
} from 'three'
import { city, npcPosition } from '@/shared/api/city'
import { motion } from '@/shared/runtime/motion'
import { game } from '@/shared/state/game'
import { LOOK } from '@/shared/world/look-flag'
import { PALETTE } from '@/shared/world/palette'
import { TOON_RAMP } from '@/shared/world/toon'
import {
  pickUmbrellas,
  UMBRELLA_MAX,
  type UmbrellaCandidate,
} from './umbrella-picker'

/**
 * Paper umbrellas over NPCs in the rain. Two `InstancedMesh`es — an 8-segment
 * canopy cone and a thin stick — cover up to the 16 nearest visible NPCs
 * (neighbors + residents) within 40 units, plus the local player when on foot.
 * Positions are read every frame from the presence/pose system (`npcPosition`)
 * and offset above head height; each umbrella takes one of six palette hues.
 *
 * Pop open with a spring when rain starts, fold when it clears. Reduced motion
 * makes both changes instant. Unused instances collapse to zero scale.
 */

const CANOPY_GEOMETRY = new ConeGeometry(0.75, 0.42, 8)
const STICK_GEOMETRY = new CylinderGeometry(0.03, 0.03, 1.1, 5)
const HEAD_HEIGHT = 2.6

const CANOPY_COLOURS = [
  PALETTE.neonMagenta,
  PALETTE.neonCyan,
  PALETTE.neonYellow,
  PALETTE.brick,
  PALETTE.shutter,
  PALETTE.window3000k,
]

const ALL_IDS: NpcId[] = [...NEIGHBOR_IDS, ...RESIDENT_IDS]
const PLAYER_KEY = '@player' as NpcId

const canopyObject = new Object3D()
const stickObject = new Object3D()

export function Umbrellas() {
  const rain = useSelector(city, (state) => state.weather === 'rain')
  const canopyRef = useRef<InstancedMesh>(null)
  const stickRef = useRef<InstancedMesh>(null)
  // Per-instance open amount [0,1] carried across frames for the spring.
  const open = useRef<Float32Array>(new Float32Array(UMBRELLA_MAX + 1))
  const canopyMaterial = useMemo<Material>(
    () =>
      LOOK === 'comic'
        ? new MeshToonMaterial({ gradientMap: TOON_RAMP, vertexColors: true })
        : new MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }),
    []
  )
  const stickMaterial = useMemo<Material>(
    () =>
      LOOK === 'comic'
        ? new MeshToonMaterial({ gradientMap: TOON_RAMP, color: '#5a4b3a' })
        : new MeshStandardMaterial({ color: '#5a4b3a', roughness: 0.9 }),
    []
  )

  useFrame((_, delta) => {
    const canopy = canopyRef.current
    const stick = stickRef.current
    if (!canopy || !stick) return
    const reduced = game.state.reducedMotion
    const target = rain ? 1 : 0

    const candidates: UmbrellaCandidate[] = ALL_IDS.map((id) => ({
      id,
      position: npcPosition(id),
    }))
    // The local player on foot (no active ride) joins the crowd.
    if (!game.state.ride)
      candidates.push({
        id: PLAYER_KEY,
        position: [motion.position.x, motion.position.y, motion.position.z],
      })

    const viewer: [number, number, number] = [
      motion.position.x,
      motion.position.y,
      motion.position.z,
    ]
    const picks = pickUmbrellas(candidates, viewer)
    const colour = new Color()
    const total = canopy.count
    for (let i = 0; i < total; i++) {
      const pick = picks[i]
      // Spring the open amount toward the target (instant under reduced motion).
      const want = pick ? target : 0
      const current = open.current[i]
      const next = reduced
        ? want
        : current + (want - current) * (1 - Math.exp(-delta * 9))
      open.current[i] = next
      if (!pick || next < 0.02) {
        canopyObject.scale.setScalar(0)
        canopyObject.updateMatrix()
        canopy.setMatrixAt(i, canopyObject.matrix)
        stickObject.scale.setScalar(0)
        stickObject.updateMatrix()
        stick.setMatrixAt(i, stickObject.matrix)
        continue
      }
      const [x, , z] = pick.position
      const top = HEAD_HEIGHT + 0.2
      // Canopy: a slight over-shoot "pop" via the spring, radius scales with open.
      canopyObject.position.set(x, top, z)
      canopyObject.scale.set(next, Math.min(1, next * 1.1), next)
      canopyObject.updateMatrix()
      canopy.setMatrixAt(i, canopyObject.matrix)
      canopy.setColorAt(
        i,
        colour.set(CANOPY_COLOURS[hashId(pick.id) % CANOPY_COLOURS.length])
      )
      // Stick from head to canopy.
      stickObject.position.set(x, HEAD_HEIGHT - 0.35, z)
      stickObject.scale.set(1, next, 1)
      stickObject.updateMatrix()
      stick.setMatrixAt(i, stickObject.matrix)
    }
    canopy.instanceMatrix.needsUpdate = true
    stick.instanceMatrix.needsUpdate = true
    if (canopy.instanceColor) canopy.instanceColor.needsUpdate = true
  })

  return (
    <group name="umbrellas">
      <instancedMesh
        ref={canopyRef}
        name="umbrella-canopy"
        args={[CANOPY_GEOMETRY, canopyMaterial, UMBRELLA_MAX + 1]}
        frustumCulled={false}
        dispose={null}
      />
      <instancedMesh
        ref={stickRef}
        args={[STICK_GEOMETRY, stickMaterial, UMBRELLA_MAX + 1]}
        frustumCulled={false}
        dispose={null}
      />
    </group>
  )
}

/** Stable hash so each NPC keeps the same umbrella colour across frames. */
function hashId(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffff
  return h
}
