import {
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  MeshToonMaterial,
  Texture,
} from 'three'
import { describe, expect, it } from 'vitest'
import { prepareScene } from '@/shared/world/assets'
import { toToon } from '@/shared/world/toon'

// jsdom has no `?look`, so LOOK resolves to 'comic' for these specs.

describe('toToon', () => {
  it('returns the same material for the same source', () => {
    const source = new MeshStandardMaterial({ color: '#808080' })
    const a = toToon(source)
    const b = toToon(source)
    expect(a).toBe(b)
    expect(a).toBeInstanceOf(MeshToonMaterial)
  })

  it('keeps the map', () => {
    const map = new Texture()
    const source = new MeshStandardMaterial({ map })
    const toon = toToon(source) as MeshToonMaterial
    expect(toon.map).toBe(map)
  })

  it('passes a toon material through unchanged', () => {
    const toon = new MeshToonMaterial()
    expect(toToon(toon)).toBe(toon)
  })

  it('passes an unlit material through unchanged', () => {
    const unlit = new MeshBasicMaterial()
    unlit.userData.unlit = true
    expect(toToon(unlit)).toBe(unlit)
  })
})

describe('prepareScene idempotency (compounding tint regression)', () => {
  it('leaves a cached scene colour unchanged when prepared twice', () => {
    const scene = new Group()
    const mesh = new Mesh()
    mesh.material = new MeshStandardMaterial({ color: '#808080' })
    scene.add(mesh)
    prepareScene(scene, 'city/building-a')
    const first = (mesh.material as MeshToonMaterial).color.getHexString()
    prepareScene(scene, 'city/building-a')
    const second = (mesh.material as MeshToonMaterial).color.getHexString()
    expect(second).toBe(first)
  })

  it('confirms the un-guarded tint would compound', () => {
    // Demonstrates the original bug: lerping the same colour twice drifts.
    const tint = new Color('#f0d6b2')
    const c = new Color('#808080')
    c.lerp(tint, 0.18)
    const once = c.getHexString()
    c.lerp(tint, 0.18)
    const twice = c.getHexString()
    expect(twice).not.toBe(once)
  })
})
