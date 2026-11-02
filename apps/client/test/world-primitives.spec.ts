import {
  MeshBasicMaterial,
  MeshStandardMaterial,
  MeshToonMaterial,
} from 'three'
import { describe, expect, it } from 'vitest'
import { blockMaterial, glowMaterial } from '@/shared/world/primitives'

describe('block material by look', () => {
  it('returns a toon material under comic, same instance per colour', () => {
    const a = blockMaterial('#123456', 'comic')
    const b = blockMaterial('#123456', 'comic')
    expect(a).toBeInstanceOf(MeshToonMaterial)
    expect(a).toBe(b)
  })

  it('returns a MeshStandardMaterial under classic', () => {
    const a = blockMaterial('#abcdef', 'classic')
    expect(a).toBeInstanceOf(MeshStandardMaterial)
    expect(a).not.toBeInstanceOf(MeshToonMaterial)
  })
})

describe('glow material', () => {
  it('is a tone-mapped-off MeshBasicMaterial, marked unlit, cached', () => {
    const a = glowMaterial('#ff9c62')
    const b = glowMaterial('#ff9c62')
    expect(a).toBeInstanceOf(MeshBasicMaterial)
    expect(a.toneMapped).toBe(false)
    expect(a.userData.unlit).toBe(true)
    expect(a).toBe(b)
  })
})
