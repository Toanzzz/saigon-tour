import { InteractRequestSchema, seedsFor } from '@saigon/shared'
import { describe, expect, it } from 'vitest'
import { ask, live, offline, scripted, setupNpc } from './support/npc'

const ctx = setupNpc()
const [arc, gag] = seedsFor('hoa')

describe('demo seed ordering', () => {
  it('keeps the default order and moves the demo seed first on request', () => {
    expect(seedsFor('hoa')[0]?.title).toBe(arc?.title)
    expect(seedsFor('hoa', 'en', { demo: true })[0]?.title).toBe(gag?.title)
    expect(seedsFor('hoa', 'en', { demo: true })[1]?.title).toBe(arc?.title)
    expect(seedsFor('hoa', 'vi', { demo: true })[0]?.steps).toEqual(gag?.steps)
    // The marker is catalog-only; projected specs never carry it.
    expect(seedsFor('hoa', 'en', { demo: true })[0]).not.toHaveProperty('demo')
  })

  it('accepts and omits the demo request flag', () => {
    const base = ask('Any errands?')
    expect(InteractRequestSchema.parse(base).demo).toBeUndefined()
    expect(InteractRequestSchema.parse({ ...base, demo: true }).demo).toBe(true)
  })
})

describe('demo offer', () => {
  it.each([
    ['offline', offline, undefined],
    ['live', live, scripted([{ text: 'Unused.' }])],
    ['timeout', live, scripted(['hang'])],
  ] as const)(
    'offers the gag first (%s) without a model call',
    async (_name, config, fetcher) => {
      const harness = ctx.fx.harness(config, fetcher)
      const result = await harness.interact(
        'hoa',
        ask('Any errands?', { demo: true }),
        ctx.playerId
      )
      expect(result.questEvents[0]?.type).toBe('offered')
      expect(result.quests[0]?.title).toBe(gag?.title)
      expect(result.reply).toContain(gag?.description)
      expect(harness.usage.calls).toBe(0)
    }
  )

  it('offers the twist arc after the gag is completed', async () => {
    const harness = ctx.fx.harness(offline)
    await harness.interact(
      'hoa',
      ask('Any errands?', { demo: true }),
      ctx.playerId
    )
    await harness.interact(
      'linh',
      ask('Hello', {
        events: [{ type: 'deliver', itemId: 'broth', npcId: 'linh' }],
      }),
      ctx.playerId
    )
    const returned = await harness.interact(
      'hoa',
      ask('I am back', { demo: true }),
      ctx.playerId
    )
    expect(returned.questEvents.some((e) => e.type === 'completed')).toBe(true)
    const next = await harness.interact(
      'hoa',
      ask('Any errands?', { demo: true }),
      ctx.playerId
    )
    const offered = next.questEvents.find((e) => e.type === 'offered')
    expect(offered?.quest.title).toBe(arc?.title)
    expect(offered?.quest.twist).toBeDefined()
  })

  it('leaves non-demo turns on the default order', async () => {
    const harness = ctx.fx.harness(offline)
    const result = await harness.interact(
      'hoa',
      ask('Any errands?'),
      ctx.playerId
    )
    expect(result.quests[0]?.title).toBe(arc?.title)
  })
})
