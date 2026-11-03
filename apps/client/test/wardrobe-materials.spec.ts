import { UNLOCKS } from '@saigon/shared'
import { Group, Mesh, MeshStandardMaterial, type MeshToonMaterial } from 'three'
import { describe, expect, it } from 'vitest'
import { applyOutfitPalette } from '@/shared/world/look'
import { toToon } from '@/shared/world/toon'

describe('wardrobe outfit rendering', () => {
  it('preserves single materials on meshes without groups and recolors named toon materials', () => {
    const outfit = Object.values(UNLOCKS).find(
      (entry) => entry.slot === 'outfit' && entry.palette
    )
    if (!outfit?.palette) throw new Error('Missing outfit palette')
    const [name, color] = Object.entries(outfit.palette)[0]
    const source = new MeshStandardMaterial({ color: '#ffffff' })
    source.name = name
    const material = toToon(source) as MeshToonMaterial
    expect(material.name).toBe(name)
    const mesh = new Mesh(undefined, material)
    const root = new Group()
    root.add(mesh)
    applyOutfitPalette(root, { outfit: outfit.id })
    expect(Array.isArray(mesh.material)).toBe(false)
    expect(mesh.geometry.groups).toHaveLength(0)
    expect((mesh.material as MeshToonMaterial).color.getHexString()).toBe(
      color.replace('#', '').toLowerCase()
    )
    expect(material.color.getHexString()).toBe('ffffff')
  })
})
