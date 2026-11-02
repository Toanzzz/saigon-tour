import { useEffect, useMemo, useRef } from 'react'
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  Euler,
  ExtrudeGeometry,
  type InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  Object3D,
  Shape,
} from 'three'
import { skyColors } from '@/features/city/atmosphere'
import type { Placement, Vec3 } from './assets'
import { PALETTE } from './palette'

/**
 * Flat cutout skyline cards outside the walls on the north and west, plus the
 * NE lobe, where the default camera looks. Each card is a long, thin
 * `ExtrudeGeometry` strip (depth 0.3) cut from a seeded rooftop profile. Two
 * flat tones, each pre-mixed toward the day horizon colour to fake aerial
 * perspective, with `fog: false` so the day fog can't swallow them. A second
 * instanced mesh scatters window dots that only Phase 4 lights (unlit).
 *
 * No shadows, no colliders. The Thủ Thiêm towers (`civic.tsx` Skyline) stay;
 * these cards sit behind everything else, outside `BOUNDS`.
 */

/** Seeded pseudo-random in [0, 1) so the profile is stable across reloads. */
function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
}

/** A rooftop profile `length` wide and up to `maxHeight` tall. */
function rooftopGeometry(length: number, maxHeight: number, seed: number) {
  const next = rng(seed)
  const shape = new Shape()
  shape.moveTo(0, 0)
  let x = 0
  while (x < length) {
    const w = 3 + next() * 6
    const h = maxHeight * (0.45 + next() * 0.55)
    shape.lineTo(x, h)
    shape.lineTo(Math.min(x + w, length), h)
    x += w
  }
  shape.lineTo(length, 0)
  shape.closePath()
  const geometry = new ExtrudeGeometry(shape, {
    depth: 0.3,
    bevelEnabled: false,
  })
  geometry.center()
  return geometry
}

type Card = {
  position: Vec3
  rotation: Vec3
  length: number
  height: number
  seed: number
  /** 0 = nearer tone, 1 = farther (more aerial) tone. */
  tone: 0 | 1
}

/**
 * Four strips outside the walls: BOUNDS is x −52..124, z −116..44. North is
 * beyond z −46.5 (the north wall) and the west is beyond x −48.5. Cards face
 * inward toward the district.
 */
export const SKYLINE_CARDS: Card[] = [
  // West, beyond x −48.5, facing +x.
  {
    position: [-70, 20, -20],
    rotation: [0, Math.PI / 2, 0],
    length: 70,
    height: 26,
    seed: 11,
    tone: 1,
  },
  // North, beyond z −46.5 / −116, facing +z (toward the camera default).
  {
    position: [20, 22, -124],
    rotation: [0, 0, 0],
    length: 110,
    height: 34,
    seed: 23,
    tone: 1,
  },
  {
    position: [30, 16, -118],
    rotation: [0, 0, 0],
    length: 120,
    height: 22,
    seed: 41,
    tone: 0,
  },
  // NE lobe, beyond x 124, facing −x.
  {
    position: [146, 20, -66],
    rotation: [0, -Math.PI / 2, 0],
    length: 80,
    height: 28,
    seed: 67,
    tone: 1,
  },
]

/** Shared unit cube for the window dots, scaled per instance. */
const WINDOW_GEOMETRY = new BoxGeometry(1, 1, 1)

/** Pre-mix a tone toward the day horizon for aerial perspective. */
function aerialTone(base: string, amount: number) {
  return new Color(base).lerp(
    new Color(skyColors(false, false).horizon),
    amount
  )
}

/** Merge every strip into one coloured `BufferGeometry` (one draw call). */
function buildCardGeometry() {
  const tones = [aerialTone('#6b6f86', 0.45), aerialTone('#7d8197', 0.62)]
  const matrix = new Matrix4()
  const positions: number[] = []
  const colors: number[] = []
  for (const card of SKYLINE_CARDS) {
    const indexed = rooftopGeometry(card.length, card.height, card.seed)
    const strip = indexed.toNonIndexed()
    indexed.dispose()
    matrix.compose(
      new Object3D().position.set(...card.position),
      new Object3D().quaternion.setFromEuler(new Euler(...card.rotation)),
      new Object3D().scale.setScalar(1)
    )
    strip.applyMatrix4(matrix)
    const pos = strip.getAttribute('position')
    const tone = tones[card.tone]
    for (let i = 0; i < pos.count; i++) {
      positions.push(pos.getX(i), pos.getY(i), pos.getZ(i))
      colors.push(tone.r, tone.g, tone.b)
    }
    strip.dispose()
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute(
    'position',
    new BufferAttribute(new Float32Array(positions), 3)
  )
  geometry.setAttribute(
    'color',
    new BufferAttribute(new Float32Array(colors), 3)
  )
  geometry.computeVertexNormals()
  return geometry
}

export function SkylineCards({ evening = false }: { evening?: boolean }) {
  const geometry = useMemo(() => buildCardGeometry(), [])
  const material = useMemo(() => {
    const m = new MeshBasicMaterial({ vertexColors: true, fog: false })
    m.userData.unlit = true
    return m
  }, [])
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <group>
      <mesh
        geometry={geometry}
        material={material}
        renderOrder={-800}
        frustumCulled={false}
        dispose={null}
      />
      <WindowDots evening={evening} />
    </group>
  )
}

/** Window dots scattered over the cards: unlit now; Phase 4 lights them. */
function WindowDots({ evening }: { evening: boolean }) {
  const ref = useRef<InstancedMesh>(null)
  const dots = useMemo<Placement[]>(() => {
    const result: Placement[] = []
    SKYLINE_CARDS.forEach((card) => {
      const next = rng(card.seed + 7)
      const count = Math.round(card.length / 6)
      for (let i = 0; i < count; i++) {
        const lx = (next() - 0.5) * card.length * 0.9
        const ly = next() * card.height * 0.7 + 2
        // Place along the card's facing plane in world space.
        const sin = Math.sin(card.rotation[1])
        const cos = Math.cos(card.rotation[1])
        result.push({
          position: [
            card.position[0] + lx * cos + 0.3 * sin,
            card.position[1] + ly - card.height / 2,
            card.position[2] - lx * sin + 0.3 * cos,
          ],
          rotation: card.rotation,
          scale: [0.5, 0.7, 0.05],
        })
      }
    })
    return result
  }, [])
  const material = useMemo(() => {
    const m = new MeshBasicMaterial({
      color: new Color('#3a3f55'),
      fog: false,
      toneMapped: false,
    })
    m.userData.unlit = true
    return m
  }, [])
  // At dusk the vellum windows warm to the 3000 K interior glow; by day they
  // stay the dim unlit tone.
  useEffect(() => {
    material.color.set(evening ? PALETTE.window3000k : '#3a3f55')
  }, [evening, material])
  useEffect(() => {
    if (!ref.current) return
    const dummy = new Object3D()
    dots.forEach((dot, i) => {
      dummy.position.set(...dot.position)
      dummy.rotation.set(...(dot.rotation ?? [0, 0, 0]))
      const scale = dot.scale ?? 1
      typeof scale === 'number'
        ? dummy.scale.setScalar(scale)
        : dummy.scale.set(...scale)
      dummy.updateMatrix()
      ref.current?.setMatrixAt(i, dummy.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
  }, [dots])
  return (
    <instancedMesh
      ref={ref}
      args={[WINDOW_GEOMETRY, material, dots.length]}
      renderOrder={-799}
      frustumCulled={false}
      dispose={null}
    />
  )
}
