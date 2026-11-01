import { type QuestSpec, stepText } from '@saigon/shared'
import { describe, expect, it } from 'vitest'
import { ask, live, offline, scripted, setupNpc } from './support/npc'

const ctx = setupNpc()

// Hoa riddle whose hidden step 0 points at Linh in the park.
const riddleSpec: QuestSpec = {
  giverNpcId: 'hoa',
  title: 'A market riddle',
  description: 'Solve where the herbs should go.',
  scope: 'solo',
  steps: [{ type: 'TALK_TO', npcId: 'linh' }],
  riddle: {
    text: 'Find the neighbor who hands out committee titles by the trees.',
  },
}

describe('3b riddle on the server', () => {
  it('greets with the authored reveal when the riddle is solved this turn', async () => {
    const harness = ctx.fx.harness(offline)
    await harness.game.proposeQuest(ctx.playerId, 'hoa', riddleSpec)
    // Greeting Linh (the hidden answer) reveals and solves the riddle.
    const greeting = await harness.interact(
      'linh',
      ask('', { intent: 'greet' }),
      ctx.playerId
    )
    expect(greeting.reply).toContain('That riddle?')
    expect(greeting.reply).toContain(
      stepText({ type: 'TALK_TO', npcId: 'linh' }, 'en')
    )
  })

  it('greets with the authored reveal in Vietnamese', async () => {
    const harness = ctx.fx.harness(offline)
    await harness.game.proposeQuest(ctx.playerId, 'hoa', riddleSpec)
    const greeting = await harness.interact(
      'linh',
      ask('', { intent: 'greet', locale: 'vi' }),
      ctx.playerId
    )
    expect(greeting.reply).toContain('Câu đố đó hả?')
    expect(greeting.reply).toContain(
      stepText({ type: 'TALK_TO', npcId: 'linh' }, 'vi')
    )
  })

  it('adds a hint-only context line while the giver riddle is unrevealed', async () => {
    const seen: { messages: { role: string; content: string }[] }[] = []
    const harness = ctx.fx.harness(
      live,
      scripted([{ text: 'A gentle hint.' }], seen)
    )
    await harness.game.proposeQuest(ctx.playerId, 'hoa', riddleSpec)
    await harness.interact('hoa', ask('Where do these go?'), ctx.playerId)
    const system = JSON.stringify(
      seen.flatMap((body) =>
        (body.messages ?? []).filter((m) => m.role === 'system')
      )
    )
    expect(system).toContain('Riddle unrevealed')
    expect(system).toContain('Hint, never answer')
  })

  it('tells the giver to voice the answer on the turn a cyclo reveals it', async () => {
    const seen: { messages: { role: string; content: string }[] }[] = []
    const harness = ctx.fx.harness(
      live,
      scripted([{ text: 'Here it is.' }], seen)
    )
    await harness.game.proposeQuest(ctx.playerId, 'hoa', riddleSpec)
    // A cyclo spend in this turn reveals the riddle; the giver should voice it.
    await harness.interact(
      'hoa',
      ask('Hi', { events: [{ type: 'spend', amount: 3, mode: 'cyclo' }] }),
      ctx.playerId
    )
    const system = JSON.stringify(
      seen.flatMap((body) =>
        (body.messages ?? []).filter((m) => m.role === 'system')
      )
    )
    expect(system).toContain('riddle answer')
  })
})
