import type { QuestSpec } from '@saigon/shared'
import { describe, expect, it } from 'vitest'
import { ask, offline, setupNpc } from './support/npc'

const ctx = setupNpc()

// Hoa: GO_TO alley (Ki) -> DELIVER broth to linh (final), twist to mai.
const twistSpec: QuestSpec = {
  giverNpcId: 'hoa',
  title: 'Broth run',
  description: 'Visit the alley, then take broth to Linh.',
  scope: 'solo',
  steps: [
    { type: 'GO_TO', locationId: 'alley' },
    { type: 'DELIVER', itemId: 'broth', npcId: 'linh' },
  ],
  payoff: 'Linh says the broth cured her Monday. High praise from a committee.',
  twist: {
    step: { type: 'DELIVER', itemId: 'broth', npcId: 'mai' },
    line: 'Linh ran off to the lantern crew; Mai is starving, feed her.',
  },
}

describe('payoff and twist-line on greet (fallback path)', () => {
  it('greets with the payoff after the errand is ready', async () => {
    const harness = ctx.fx.harness(offline)
    await harness.game.proposeQuest(ctx.playerId, 'hoa', twistSpec)
    // Complete the Ki step; the twist rewrites the final step to Mai.
    await harness.game.applyEvents(ctx.playerId, [
      { type: 'visit', locationId: 'alley' },
    ])
    // Deliver to the twist target, making it ready.
    await harness.game.applyEvents(ctx.playerId, [
      { type: 'deliver', itemId: 'broth', npcId: 'mai' },
    ])
    const greeting = await harness.interact(
      'hoa',
      ask('', { intent: 'greet' }),
      ctx.playerId
    )
    expect(greeting.reply).toBe(twistSpec.payoff)
  })

  it('speaks the twist line on greet when a twist applies this turn', async () => {
    const harness = ctx.fx.harness(offline)
    // Shou TALK_TO: opening the conversation sends talk, completing a TALK_TO step.
    const sho: QuestSpec = {
      giverNpcId: 'hoa',
      title: 'Talk then deliver',
      description: 'Talk to Mai, then deliver broth to Linh.',
      scope: 'solo',
      steps: [
        { type: 'TALK_TO', npcId: 'mai' },
        { type: 'DELIVER', itemId: 'broth', npcId: 'linh' },
      ],
      twist: {
        step: { type: 'DELIVER', itemId: 'broth', npcId: 'vy' },
        line: 'Mai says Linh is at the lantern crew; bring it to Vy instead.',
      },
    }
    await harness.game.proposeQuest(ctx.playerId, 'hoa', sho)
    // Talking to Mai completes the Sho step and triggers the twist this turn.
    const greeting = await harness.interact(
      'mai',
      ask('', { intent: 'greet' }),
      ctx.playerId
    )
    expect(greeting.reply).toBe(sho.twist?.line)
  })
})
