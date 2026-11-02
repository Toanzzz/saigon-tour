import {
  DataTexture,
  type Material,
  MeshToonMaterial,
  NearestFilter,
  RedFormat,
} from 'three'

/**
 * Shared 3-step gradient ramp (~0.45 / 0.75 / 1.0) sampled with
 * `NearestFilter`, so every toon material bands identically. A 2-step ramp
 * clamps too hard on large walls; three steps keeps the midtone.
 */
export const TOON_RAMP = (() => {
  const steps = new Uint8Array([
    Math.round(0.45 * 255),
    Math.round(0.75 * 255),
    255,
  ])
  const texture = new DataTexture(steps, steps.length, 1, RedFormat)
  texture.minFilter = NearestFilter
  texture.magFilter = NearestFilter
  texture.generateMipmaps = false
  texture.needsUpdate = true
  return texture
})()

/** Same source material always maps to the same toon material. */
const cache = new WeakMap<Material, MeshToonMaterial>()

type WithColor = Material & {
  color?: { clone(): unknown }
  map?: unknown
  alphaTest?: number
  vertexColors?: boolean
}

/**
 * Convert a lit material to a toon material, preserving the look-guide
 * properties. Already-toon materials and materials marked
 * `userData.unlit === true` (glow, neon, signs) pass through unchanged.
 */
export function toToon(material: Material): Material {
  if (material instanceof MeshToonMaterial) return material
  if (material.userData.unlit === true) return material
  const cached = cache.get(material)
  if (cached) return cached
  const source = material as WithColor
  const toon = new MeshToonMaterial({
    gradientMap: TOON_RAMP,
    transparent: source.transparent,
    alphaTest: source.alphaTest ?? 0,
    side: source.side,
    vertexColors: source.vertexColors ?? false,
  })
  if (source.map !== undefined) {
    ;(toon as unknown as { map: unknown }).map = source.map
  }
  if (source.color && 'color' in toon) {
    toon.color.copy(source.color as unknown as import('three').Color)
  }
  toon.needsUpdate = true
  cache.set(material, toon)
  return toon
}
