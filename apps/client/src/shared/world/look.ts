import { type Look, slotOf, UNLOCKS } from '@saigon/shared'
import { type Color, type Material, Mesh, type Object3D } from 'three'

/** Materials the remote-player `color` tint and outfit palettes may recolour. */
export const CLOTHING = new Set(['outfit-top', 'outfit-bottom'])

/** Models attached to a bone, keyed by unlock id, resolved lazily by the caller. */
export type LookModels = Partial<Record<string, Object3D>>

/** Which cosmetic GLBs a look needs, so the caller can preload them. */
export function lookModelPaths(look: Look | null | undefined): string[] {
  if (!look) return []
  const paths: string[] = []
  for (const id of [look.hat, look.accessory]) {
    if (!id) continue
    const model = UNLOCKS[id]?.model
    if (model) paths.push(model)
  }
  return paths
}

/** Recolour outfit materials by name. Returns the materials it cloned to restore later. */
export function applyOutfitPalette(
  root: Object3D,
  look: Look | null | undefined
) {
  const outfit = look?.outfit ? UNLOCKS[look.outfit] : undefined
  const palette = outfit?.palette
  if (!palette) return
  root.traverse((child) => {
    if (!(child instanceof Mesh)) return
    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material]
    const recolored = materials.map((material: Material) => {
      const hex = palette[material.name]
      if (!hex) return material
      const clone = material.clone()
      if ('color' in clone)
        (clone as Material & { color: Color }).color.set(hex)
      return clone
    })
    child.material = Array.isArray(child.material) ? recolored : recolored[0]
  })
}

/** Attach a loaded cosmetic object to its bone, scaled per its catalog entry. */
export function attachCosmetic(root: Object3D, id: string, object: Object3D) {
  const def = UNLOCKS[id]
  if (!def) return
  const bone = slotOf(id) === 'accessory' ? 'torso' : 'head'
  const target = root.getObjectByName(bone)
  if (!target) return
  object.scale.setScalar(def.scale ?? 1)
  target.add(object)
}
