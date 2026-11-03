import {
  type ItemId,
  type MilestoneId,
  milestoneSeeds,
  type NpcId,
  type PlayerEvent,
  type Quest,
} from '@saigon/shared'
import { describe, expect, it } from 'vitest'
import { CityWorld } from '@/domain/city'
import {
  allowMilestoneEvent,
  MILESTONE_COOLDOWN_MS,
  offerApex,
  offerMilestone,
  QuestService,
  runConcertSequence,
} from '@/domain/quests'
import { safeLine } from '@/features/npc/safety'
import { required, setupNpc } from './support/npc'

const ctx = setupNpc()

/** Put components into the player's bag directly, as base errands would. */
async function hold(playerId: string, items: ItemId[]) {
  await ctx.fx.db.mutatePlayer(playerId, (save) => {
    for (const item of items)
      save.world.inventory[item] = (save.world.inventory[item] ?? 0) + 1
  })
}

describe('offerMilestone gating', () => {
  it('offers the giver errand, then refuses once active or once held', async () => {
    const game = new QuestService(ctx.fx.db)
    const first = await offerMilestone(game, ctx.playerId, 'mai')
    expect(first.offered).toBe(true)
    // Already active: a second offer from the same giver is refused.
    const second = await offerMilestone(game, ctx.playerId, 'mai')
    expect(second).toMatchObject({ offered: false, reason: 'already_active' })
  })

  it('refuses when the player already holds the component', async () => {
    const game = new QuestService(ctx.fx.db)
    await hold(ctx.playerId, ['coffee-beans'])
    expect(await offerMilestone(game, ctx.playerId, 'mai')).toMatchObject({
      offered: false,
      reason: 'already_holds_component',
    })
  })

  it('surfaces the active-quest cap', async () => {
    const game = new QuestService(ctx.fx.db)
    for (const npc of ['hoa', 'tam', 'linh'] as const)
      await game.proposeQuest(ctx.playerId, npc, {
        giverNpcId: npc,
        title: `Hello ${npc}`,
        description: 'A small favor.',
        scope: 'solo',
        steps: [{ type: 'GO_TO', locationId: 'market' }],
      })
    expect(await offerMilestone(game, ctx.playerId, 'mai')).toMatchObject({
      offered: false,
      reason: 'cap_reached:maximum_3_active_quests',
    })
  })

  it('refuses after the milestone is completed', async () => {
    const game = new QuestService(ctx.fx.db)
    await ctx.fx.db.mutatePlayer(ctx.playerId, (save) => {
      save.completed = [
        {
          id: 'q_done',
          title: 'done',
          giverNpcId: 'vy',
          reward: {
            currency: 0,
            itemId: null,
            reputation: 0,
          },
          completedAt: 1,
          milestone: 'evening-concert',
        },
      ]
    })
    expect(await offerMilestone(game, ctx.playerId, 'mai')).toMatchObject({
      offered: false,
      reason: 'milestone_completed',
    })
  })
})

describe('offerApex gating', () => {
  it('offers only when all three components are held', async () => {
    const game = new QuestService(ctx.fx.db)
    expect(await offerApex(game, ctx.playerId, 'vy')).toMatchObject({
      offered: false,
      reason: 'components_missing',
    })
    await hold(ctx.playerId, ['coffee-beans', 'sheet-music', 'lanterns'])
    expect((await offerApex(game, ctx.playerId, 'vy')).offered).toBe(true)
    // No second apex while one is active.
    expect(await offerApex(game, ctx.playerId, 'vy')).toMatchObject({
      offered: false,
      reason: 'apex_active',
    })
  })
})

describe('apex completion', () => {
  it('completes all component errands before the finale and only fires at the finale', async () => {
    const game = new QuestService(ctx.fx.db)
    const fired: MilestoneId[] = []
    game.milestone = (_playerId, id) => fired.push(id)
    const finish = async (quest: Quest, giver: NpcId) => {
      for (const step of quest.steps) {
        const event: PlayerEvent =
          step.type === 'GO_TO'
            ? { type: 'visit', locationId: step.locationId }
            : step.type === 'BUY'
              ? { type: 'purchase', itemId: step.marketItemId }
              : step.type === 'TALK_TO'
                ? { type: 'talk', npcId: step.npcId }
                : {
                    type: 'deliver',
                    itemId: step.itemId,
                    npcId: step.npcId,
                  }
        await game.applyEvents(ctx.playerId, [event])
      }
      const events = await game.checkQuests(ctx.playerId, giver)
      expect(events.map((event) => event.type)).toEqual(['completed'])
    }
    for (const giver of ['mai', 'thao', 'ba'] as const) {
      const offered = await offerMilestone(game, ctx.playerId, giver)
      expect(offered.offered).toBe(true)
      await finish(required(offered.quest), giver)
      expect(fired).toEqual([])
    }
    const offered = await offerApex(game, ctx.playerId, 'vy')
    expect(offered.offered).toBe(true)
    await finish(required(offered.quest), 'vy')
    expect(fired).toEqual(['evening-concert'])
    expect(await offerApex(game, ctx.playerId, 'vy')).toMatchObject({
      offered: false,
      reason: 'milestone_completed',
    })
    expect(await offerMilestone(game, ctx.playerId, 'mai')).toMatchObject({
      offered: false,
      reason: 'milestone_completed',
    })
    await game.checkQuests(ctx.playerId, 'vy')
    expect(fired).toHaveLength(1)
  })

  it('consumes the components and fires the hook exactly once', async () => {
    const game = new QuestService(ctx.fx.db)
    const fired: { playerId: string; milestoneId: MilestoneId }[] = []
    game.milestone = (playerId, milestoneId) =>
      fired.push({ playerId, milestoneId })
    await hold(ctx.playerId, ['coffee-beans', 'sheet-music', 'lanterns'])
    const offer = await offerApex(game, ctx.playerId, 'vy')
    expect(offer.offered).toBe(true)
    await game.applyEvents(ctx.playerId, [
      { type: 'deliver', itemId: 'lanterns', npcId: 'vy' },
      { type: 'deliver', itemId: 'sheet-music', npcId: 'vy' },
      { type: 'deliver', itemId: 'coffee-beans', npcId: 'vy' },
    ])
    const events = await game.checkQuests(ctx.playerId, 'vy')
    expect(events.map((event) => event.type)).toEqual(['completed'])
    // The hook fired exactly once with the milestone id.
    expect(fired).toEqual([
      { playerId: ctx.playerId, milestoneId: 'evening-concert' },
    ])
    // The three components were consumed by the BRING deliveries.
    const record = await game.get(ctx.playerId)
    for (const item of ['coffee-beans', 'sheet-music', 'lanterns'] as const)
      expect(record.world.inventory[item] ?? 0).toBe(0)
    const count = await ctx.fx.db.sql.query(
      'SELECT count(*)::int AS count FROM quest_completions WHERE player_id=$1',
      [ctx.playerId]
    )
    expect(count.rows[0].count).toBe(1)
    // A second check does not re-fire the hook (quest already completed).
    await game.checkQuests(ctx.playerId, 'vy')
    expect(fired).toHaveLength(1)
  })
})

/** The realtime hook's name-safety gate, then the shared concert sequence. */
function runConcert(
  city: CityWorld,
  milestoneId: MilestoneId,
  who: string
): void {
  const safe = who && safeLine(who) ? who : 'A neighbor'
  runConcertSequence(city, milestoneId, safe)
}

describe('concert city sequence', () => {
  it('ends the soonest event, starts the concert, moves Thao, posts a headline', () => {
    const city = new CityWorld(() => 1_000_000)
    // Two events already active; the concert must end the soonest-ending one.
    city.apply({
      type: 'start-event',
      kind: 'festival',
      locationId: 'market',
      title: 'Soonest',
      description: 'ends first',
      durationMs: 30_000,
    })
    city.apply({
      type: 'start-event',
      kind: 'market-rush',
      locationId: 'park',
      title: 'Later',
      description: 'ends later',
      durationMs: 300_000,
    })
    runConcert(city, 'evening-concert', 'Mai')
    const snapshot = city.snapshot()
    const kinds = snapshot.events.map((event) => event.kind)
    expect(kinds).toContain('street-music')
    expect(kinds).not.toContain('festival')
    expect(kinds).toContain('market-rush')
    expect(snapshot.events).toHaveLength(2)
    expect(snapshot.npcPlacements.thao.locationId).toBe('cityhall')
    expect(snapshot.npcPlacements.thao.anchorId).toBe('gathering')
    expect(snapshot.headlines.at(-1)?.text).toBe(
      'Mai brought the evening concert to City Hall!'
    )
  })

  it('falls back to a neutral name for an unsafe headline name', () => {
    const city = new CityWorld(() => 1_000_000)
    runConcert(city, 'evening-concert', 'Visit https://evil.test')
    expect(city.snapshot().headlines.at(-1)?.text).toBe(
      'A neighbor brought the evening concert to City Hall!'
    )
  })
})

describe('milestone seed shape', () => {
  it('the apex seed brings all three components to the host', () => {
    const seed = milestoneSeeds('vy')[0]
    expect(seed?.steps.map((step) => step.type)).toEqual([
      'BRING',
      'BRING',
      'BRING',
    ])
  })
})

describe('room event cooldown', () => {
  it('allows one milestone event per room every ten minutes', () => {
    const seen = new Map<string, number>()
    expect(allowMilestoneEvent(seen, 'Le Loi 1', 0)).toBe(true)
    // Within the window: throttled (the later completer still gets a reward).
    expect(allowMilestoneEvent(seen, 'Le Loi 1', 1000)).toBe(false)
    expect(
      allowMilestoneEvent(seen, 'Le Loi 1', MILESTONE_COOLDOWN_MS - 1)
    ).toBe(false)
    // A different room is independent.
    expect(allowMilestoneEvent(seen, 'Le Loi 2', 1000)).toBe(true)
    // Past the window: allowed again.
    expect(allowMilestoneEvent(seen, 'Le Loi 1', MILESTONE_COOLDOWN_MS)).toBe(
      true
    )
  })
})
