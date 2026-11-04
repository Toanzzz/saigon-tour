import { UNLOCKS } from '@saigon/shared'
import { Group } from 'three'
import { describe, expect, it } from 'vitest'
import { attachCosmetic } from '@/shared/world/look'

function avatarRig() {
  const root = new Group()
  const torso = new Group()
  torso.name = 'torso'
  const head = new Group()
  head.name = 'head'
  torso.add(head)
  root.add(torso)
  return { root, torso, head }
}

describe('cosmetic fitting', () => {
  it.each(['headphones', 'sunglasses'])(
    'attaches %s to the moving head despite its accessory slot',
    (id) => {
      const { root, head } = avatarRig()
      const cosmetic = new Group()
      attachCosmetic(root, id, cosmetic)
      expect(UNLOCKS[id].slot).toBe('accessory')
      expect(cosmetic.parent).toBe(head)
      head.rotation.y = Math.PI / 2
      head.updateMatrixWorld(true)
      expect(
        cosmetic.getWorldQuaternion(head.quaternion.clone()).y
      ).toBeCloseTo(Math.SQRT1_2)
    }
  )

  it.each(['scarf', 'satchel', 'camera-strap', 'lantern-backpack'])(
    'keeps %s attached to the torso',
    (id) => {
      const { root, torso } = avatarRig()
      const cosmetic = new Group()
      attachCosmetic(root, id, cosmetic)
      expect(cosmetic.parent).toBe(torso)
    }
  )

  it('every outfit supplies both original body rigs', () => {
    const outfits = Object.values(UNLOCKS).filter(
      (item) => item.slot === 'outfit'
    )
    expect(outfits).toHaveLength(7)
    for (const outfit of outfits) {
      expect(outfit.outfitModels?.man).toBe(`outfits/${outfit.id}-man`)
      expect(outfit.outfitModels?.woman).toBe(`outfits/${outfit.id}-woman`)
    }
  })
})
