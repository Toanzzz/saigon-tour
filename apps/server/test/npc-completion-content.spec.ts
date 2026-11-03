import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  milestoneSeeds,
  NPC_REGISTRY,
  type NpcId,
  QuestSpecSchema,
  seedsFor,
} from '@saigon/shared'
import { describe, expect, it } from 'vitest'

const ids = Object.keys(NPC_REGISTRY) as NpcId[]
const root = new URL('../../../', import.meta.url)

describe('NPC completion content', () => {
  it.each(ids)('%s has authored gratitude for both locales', (id) => {
    const completion = NPC_REGISTRY[id].story.completion
    for (const locale of ['en', 'vi'] as const) {
      expect(completion?.[locale].trim().length).toBeGreaterThan(0)
      expect(completion?.[locale].length).toBeLessThanOrEqual(160)
      for (const spec of [
        ...seedsFor(id, locale),
        ...milestoneSeeds(id, locale),
      ]) {
        expect(QuestSpecSchema.safeParse(spec).success, spec.title).toBe(true)
        expect(spec.payoff?.trim().length, spec.title).toBeGreaterThan(0)
        expect(spec.payoff?.length, spec.title).toBeLessThanOrEqual(160)
      }
    }
  })

  it.each(ids)(
    '%s ships portrait-reference gratitude and runtime art',
    (id) => {
      const source = new URL(
        `packages/npc-${id}/assets/avatar/gratitude.jpg`,
        root
      )
      const portrait = new URL(
        `packages/npc-${id}/assets/avatar/portrait.jpg`,
        root
      )
      const runtime = new URL(
        `apps/client/public/npcs/${id}/gratitude.webp`,
        root
      )
      expect(existsSync(portrait), fileURLToPath(portrait)).toBe(true)
      expect(existsSync(source), fileURLToPath(source)).toBe(true)
      expect(existsSync(runtime), fileURLToPath(runtime)).toBe(true)
      const jpeg = readFileSync(source)
      expect([...jpeg.subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff])
      const webp = readFileSync(runtime)
      expect(webp.toString('ascii', 0, 4)).toBe('RIFF')
      expect(webp.toString('ascii', 8, 12)).toBe('WEBP')
      expect(webp.toString('ascii', 12, 16)).toBe('VP8 ')
      expect(webp.readUInt16LE(26) & 0x3fff).toBe(768)
      expect(webp.readUInt16LE(28) & 0x3fff).toBe(768)
      expect(webp.byteLength).toBeLessThan(100_000)
    }
  )
})
