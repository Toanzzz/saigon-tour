import { Html } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef, useState } from 'react'
import {
  BoxGeometry,
  Color,
  type InstancedMesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  TorusGeometry,
} from 'three'
import { m } from '@/shared/i18n'
import { motion } from '@/shared/runtime/motion'
import { game } from '@/shared/state/game'
import { ROADS } from '@/shared/world/district'
import { LOOK } from '@/shared/world/look-flag'
import { PALETTE } from '@/shared/world/palette'
import { PLACES } from '@/shared/world/places'
import { toToon } from '@/shared/world/toon'
import { useXRPresenting } from '@/shared/xr/store'
import { shouldHonk } from './traffic-brake'
import {
  buildLanes,
  type Lane,
  laneHeading,
  lanePoint,
  type Vec2,
} from './traffic-lanes'

// Lê Lợi, Lê Thánh Tôn and Đồng Khởi carry the swarm (plan 5c).
const SWARM_ROADS = ['LÊ LỢI', 'LÊ THÁNH TÔN', 'ĐỒNG KHỞI']
const STOPS: Vec2[] = Object.values(PLACES).map((p) => [p.stop[0], p.stop[2]])
const DESKTOP_COUNT = 22
const MOBILE_COUNT = 10
const UPDATE_RANGE_SQ = 60 * 60
const SPEED_MIN = 5
const SPEED_MAX = 8
const HONK_VISIBLE_MS = 2000
const CARGO_COLORS = ['#d8b773', '#bcd3dc', '#d87b93', '#8a6b4a']
// Caricature cargo shapes (x, y, z) scaling the unit box: a baguette tower, a
// squat icebox stack, a wide flower pile and a tall birdcage stack.
const CARGO_SHAPES: [number, number, number][] = [
  [0.5, 1.6, 0.5],
  [1.1, 0.7, 0.9],
  [1.2, 0.5, 1.1],
  [0.7, 1.3, 0.7],
]

/** A lit material, toon under comic and Standard under classic. */
const lit = (color: string) => {
  const standard = new MeshStandardMaterial({ color, roughness: 0.85 })
  return LOOK === 'comic' ? toToon(standard) : standard
}

type Scooter = {
  lane: number
  t: number
  speed: number
  cargo: number
  lastHonk: number
  wobble: number
  brakeUntil: number
  /** Set once the frozen matrix has been written, so distant scooters idle. */
  placed: boolean
}
type Honk = { id: number; at: Vec2 }

/** Geometry shared by every instanced part, created once. */
const bodyGeo = new BoxGeometry(0.42, 0.34, 1.5)
const riderGeo = new BoxGeometry(0.34, 0.8, 0.4)
const headGeo = new BoxGeometry(0.3, 0.3, 0.14)
const cargoGeo = new BoxGeometry(0.6, 0.6, 0.6)
const wheelGeo = new TorusGeometry(0.34, 0.1, 5, 10)

function laneSeed(count: number, lanes: Lane[]): Scooter[] {
  return Array.from({ length: count }, (_, i) => ({
    lane: i % lanes.length,
    t: (i / count) % 1,
    speed: SPEED_MIN + (((i * 37) % 100) / 100) * (SPEED_MAX - SPEED_MIN),
    cargo: i % CARGO_COLORS.length,
    lastHonk: -Infinity,
    wobble: 0,
    brakeUntil: 0,
    placed: false,
  }))
}

/** One instanced part per scooter; matrices are driven each frame. */
function useParts() {
  const body = useRef<InstancedMesh>(null)
  const rider = useRef<InstancedMesh>(null)
  const head = useRef<InstancedMesh>(null)
  const wheels = useRef<InstancedMesh>(null)
  const cargo = useRef<InstancedMesh>(null)
  return { body, rider, head, wheels, cargo }
}

export function Traffic() {
  const xr = useXRPresenting()
  const mobile = useThree((s) => s.size.width) < 700
  const evening = game.state.timeOfDay === 'evening'
  const count = mobile ? MOBILE_COUNT : DESKTOP_COUNT
  const lanes = useMemo(
    () =>
      buildLanes(
        ROADS.filter((r) => SWARM_ROADS.includes(r.name ?? '')),
        STOPS
      ),
    []
  )
  const scooters = useRef<Scooter[]>(laneSeed(count, lanes))
  const parts = useParts()
  const [honks, setHonks] = useState<Honk[]>([])
  const scratch = useMemo(() => new Object3D(), [])

  // Materials: the headlight glows warm in the evening via the unlit path.
  const materials = useMemo(() => {
    const headMat = new MeshBasicMaterial({
      color: evening ? PALETTE.window3000k : '#f4e4c0',
      toneMapped: false,
    })
    headMat.userData.unlit = true
    const cargoMat = new MeshStandardMaterial({ roughness: 0.85 })
    return {
      body: lit('#b85a4d'),
      rider: lit('#2f3a44'),
      wheel: lit('#2b2f31'),
      head: headMat,
      cargo: cargoMat,
    }
  }, [evening])

  useFrame((state, delta) => {
    const cam = state.camera.position
    const reduced = game.state.reducedMotion
    const now = performance.now()
    // `motion.position` tracks the on-foot player, and the ride vehicle while
    // riding (transport.tsx copies the vehicle onto it), so one cone target
    // makes the swarm yield to both the same way.
    const target: Vec2 = [motion.position.x, motion.position.z]
    const targets: Vec2[] = [target]
    const dt = Math.min(delta, 0.05)
    const visibleHonks: Honk[] = []
    scooters.current.forEach((s, i) => {
      const lane = lanes[s.lane]
      const span = Math.abs(lane.to - lane.from) || 1
      const [x, z] = lanePoint(lane, s.t)
      const near = (cam.x - x) ** 2 + (cam.z - z) ** 2 < UPDATE_RANGE_SQ
      if (!near || reduced) {
        // Frozen: write the matrix once, then idle (no per-frame matrix churn).
        if (!s.placed) {
          writeScooter(parts, scratch, i, [x, z], laneHeading(lane), s)
          s.placed = true
        }
        return
      }
      s.placed = false
      const heading = laneHeading(lane)
      if (shouldHonk([x, z], heading, targets, s.lastHonk, now)) {
        s.lastHonk = now
        s.brakeUntil = now + 900
        s.wobble = 0.4
        visibleHonks.push({ id: i, at: [x, z] })
      }
      const braking = now < s.brakeUntil
      const v = braking ? s.speed * 0.15 : s.speed
      s.t += (lane.dir * v * dt) / span
      if (s.t > 1) s.t -= 1
      if (s.t < 0) s.t += 1
      s.wobble *= 0.92
      writeScooter(parts, scratch, i, lanePoint(lane, s.t), heading, s)
    })
    // Re-publish the honk bubbles when the active set changes.
    for (const h of honks)
      if (now - scooters.current[h.id].lastHonk < HONK_VISIBLE_MS)
        visibleHonks.push(h)
    const deduped = dedupe(visibleHonks)
    setHonks((prev) => (sameHonks(prev, deduped) ? prev : deduped))
  })

  if (xr && honks.length) setHonks([])
  return (
    <group name="traffic">
      <instancedMesh
        ref={parts.body}
        args={[bodyGeo, materials.body, count]}
        name="scooter-body"
        dispose={null}
      />
      <instancedMesh
        ref={parts.rider}
        args={[riderGeo, materials.rider, count]}
        dispose={null}
      />
      <instancedMesh
        ref={parts.wheels}
        args={[wheelGeo, materials.wheel, count * 2]}
        dispose={null}
      />
      <instancedMesh
        ref={parts.head}
        args={[headGeo, materials.head, count]}
        name="scooter-headlight"
        dispose={null}
      />
      <instancedMesh
        ref={parts.cargo}
        args={[cargoGeo, materials.cargo, count]}
        name="scooter-cargo"
        dispose={null}
      />
      {!xr &&
        honks.map((h) => (
          <Html
            key={h.id}
            center
            position={[h.at[0], 2, h.at[1]]}
            distanceFactor={19}
            zIndexRange={[4, 0]}
            style={{ pointerEvents: 'none' }}
          >
            <div className="presence-bubble street-cry honk" role="status">
              {m.cry_honk()}
            </div>
          </Html>
        ))}
    </group>
  )
}

const dedupe = (list: Honk[]) => [
  ...new Map(list.map((h) => [h.id, h])).values(),
]
const sameHonks = (a: Honk[], b: Honk[]) =>
  a.length === b.length && a.every((h, i) => h.id === b[i].id)

function writeScooter(
  parts: ReturnType<typeof useParts>,
  o: Object3D,
  i: number,
  at: Vec2,
  heading: number,
  s: Scooter
) {
  const tilt = s.wobble * Math.sin(performance.now() / 60)
  const set = (
    ref: InstancedMesh | null,
    idx: number,
    oy: number,
    oz: number,
    sy = 1
  ) => {
    if (!ref) return
    o.position.set(at[0], oy, at[1])
    o.rotation.set(0, heading, tilt)
    o.scale.set(1, sy, 1)
    // Local offset along the facing direction for rider/headlight/cargo.
    o.translateZ(oz)
    o.updateMatrix()
    ref.setMatrixAt(idx, o.matrix)
    ref.instanceMatrix.needsUpdate = true
  }
  set(parts.body.current, i, 0.66, 0)
  set(parts.rider.current, i, 1.15, -0.25)
  set(parts.head.current, i, 0.72, 0.78)
  // Cargo: 4 caricature variants via per-instance scale and colour, kept to
  // one instanced mesh so the swarm stays inside its draw-call budget.
  if (parts.cargo.current) {
    const [cx, cy, cz] = CARGO_SHAPES[s.cargo % CARGO_SHAPES.length]
    o.position.set(at[0], 0.95 + cy / 2, at[1])
    o.rotation.set(0, heading, tilt)
    o.scale.set(cx, cy, cz)
    o.translateZ(-0.78)
    o.updateMatrix()
    parts.cargo.current.setMatrixAt(i, o.matrix)
    parts.cargo.current.instanceMatrix.needsUpdate = true
    parts.cargo.current.setColorAt(i, cargoColor(s.cargo))
    if (parts.cargo.current.instanceColor)
      parts.cargo.current.instanceColor.needsUpdate = true
  }
  // Two wheels per scooter, front and back along the facing axis.
  if (parts.wheels.current) {
    for (const [w, oz] of [
      [0, 0.55],
      [1, -0.55],
    ] as const) {
      o.position.set(at[0], 0.34, at[1])
      o.rotation.set(0, heading + Math.PI / 2, tilt)
      o.scale.set(1, 1, 1)
      o.translateX(oz)
      o.updateMatrix()
      parts.wheels.current.setMatrixAt(i * 2 + w, o.matrix)
    }
    parts.wheels.current.instanceMatrix.needsUpdate = true
  }
}

const cargoColorCache = CARGO_COLORS.map((c) => new Color(c))
const cargoColor = (i: number) => cargoColorCache[i % cargoColorCache.length]
