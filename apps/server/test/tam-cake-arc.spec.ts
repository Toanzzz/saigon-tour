import { seedsFor } from '@saigon/shared'
import { describe, expect, it } from 'vitest'
import { ask, offline, required, setupNpc } from './support/npc'

const ctx = setupNpc()

describe("Tâm's wedding cake arc", () => {
  it('is the first seed: talk to Mai, then the twist sends the cake to Ba', () => {
    const [seed] = seedsFor('tam')
    expect(seed?.title).toBe('Wedding cake express')
    expect(seed?.steps).toEqual([
      { type: 'TALK_TO', npcId: 'mai' },
      { type: 'DELIVER', itemId: 'cake', npcId: 'mai' },
    ])
    expect(seed?.twist?.step).toEqual({
      type: 'DELIVER',
      itemId: 'cake',
      npcId: 'ba',
    })
    expect(seed?.payoff).toBeTruthy()
  })

  it('completes to Ba after the twist and pays off on return to Tâm', async () => {
    const harness = ctx.fx.harness(offline)
    await harness.game.proposeQuest(
      ctx.playerId,
      'tam',
      required(seedsFor('tam')[0])
    )
    // Talking to Mai completes the Shou step and fires the twist.
    await harness.game.applyEvents(ctx.playerId, [
      { type: 'talk', npcId: 'mai' },
    ])
    const live = (await harness.game.get(ctx.playerId)).quests[0]
    expect(live?.steps[1]).toEqual({
      type: 'DELIVER',
      itemId: 'cake',
      npcId: 'ba',
    })
    // Delivering to Ba (the twist target) makes it ready.
    await harness.game.applyEvents(ctx.playerId, [
      { type: 'deliver', itemId: 'cake', npcId: 'ba' },
    ])
    const back = await harness.interact(
      'tam',
      ask('', { intent: 'greet' }),
      ctx.playerId
    )
    expect(back.reply).toBe(seedsFor('tam')[0]?.payoff)
    expect(back.questEvents.some((e) => e.type === 'completed')).toBe(true)
  })
})
