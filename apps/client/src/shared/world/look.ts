import { type Look, slotOf, UNLOCKS } from '@saigon/shared'
import { type Color, type Material, Mesh, type Object3D } from 'three'

/** Default avatar nodes a slot replaces, hidden while a matching unlock is worn. */
const HIDDEN_BY_SLOT: Record<string, (name: string) => boolean> = {
  hat: (name) => name.startsWith('hat-'),
  accessory: (name) => name.startsWith('backpack') || name.startsWith('strap'),
}

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

/** Hide default meshes replaced by the worn slots. */
export function hideReplacedMeshes(
  root: Object3D,
  look: Look | null | undefined
) {
  const active = new Set<string>()
  if (look?.hat && UNLOCKS[look.hat]?.model) active.add('hat')
  if (look?.accessory && UNLOCKS[look.accessory]?.model) active.add('accessory')
  root.traverse((child) => {
    for (const slot of active) {
      if (HIDDEN_BY_SLOT[slot]?.(child.name)) child.visible = false
    }
  })
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
    child.material = materials.map((material: Material) => {
      const hex = palette[material.name]
      if (!hex) return material
      const clone = material.clone()
      if ('color' in clone)
        (clone as Material & { color: Color }).color.set(hex)
      return clone
    })
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
