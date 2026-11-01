import { seedsFor } from '@saigon/shared'
import { describe, expect, it, vi } from 'vitest'
import { readConfig } from '@/shared'
import { required, setupParty } from './support/party'

const ctx = setupParty()
const seed = { ...required(seedsFor('hoa')[0]), scope: 'party' as const }

describe('durable generic party quests', () => {
  it('offers a shared id with independent member steps and pushes rewards once per member', async () => {
    const [first, second] = await ctx.team()
    const offered = await ctx.ask(first, 'hoa', 'help')
    const quest = required(offered.quests[0])
    expect(quest.scope).toBe('party')
    expect(quest.party?.memberIds).toEqual([first.player.id, second.player.id])
    expect(second.socket.messages).toContainEqual(
      expect.objectContaining({ type: 'world', quests: [quest] })
    )
    await ctx.ask(first, 'linh', 'chat', [
      { type: 'deliver', itemId: 'herbs', npcId: 'linh' },
    ])
    expect((await ctx.ask(first, 'hoa', 'check')).questEvents[0]?.type).toBe(
      'incomplete'
    )
    expect(
      (await ctx.app.db.player(second.player.id)).quests[0]?.progress
    ).toEqual([false])
    await ctx.ask(second, 'linh', 'chat', [
      { type: 'deliver', itemId: 'herbs', npcId: 'linh' },
    ])
    const results = await Promise.all(
      Array.from({ length: 8 }, (_, index) =>
        ctx.app.harness.game.checkQuests(
          index % 2 ? first.player.id : second.player.id,
          'hoa'
        )
      )
    )
    expect(
      results.flat().filter((event) => event.type === 'completed')
    ).toHaveLength(1)
    for (const member of [first, second]) {
      const save = await ctx.app.db.player(member.player.id)
      expect(save.quests).toEqual([])
      expect(save.world.currency).toBe(30 + quest.reward.currency)
      expect(save.completed.map((entry) => entry.id)).toEqual([quest.id])
      expect(
        member.socket.messages.filter(
          (message) => message.type === 'quest-completed'
        )
      ).toHaveLength(1)
    }
    const { rows } = await ctx.fx.sql.query(
      'SELECT * FROM quest_completions WHERE quest_id=$1',
      [quest.id]
    )
    expect(rows).toHaveLength(2)
  })

  it('rejects the entire offer if one member has no slot, without allocating items', async () => {
    const [first, second] = await ctx.team()
    for (const npc of ['tam', 'linh', 'ba'] as const)
      await ctx.app.harness.game.proposeQuest(
        second.player.id,
        npc,
        required(seedsFor(npc)[0])
      )
    const result = await ctx.app.harness.game.proposeQuest(
      first.player.id,
      'hoa',
      seed
    )
    expect(result).toMatchObject({
      accepted: false,
      reason: 'cap_reached:maximum_3_active_quests',
    })
    const save = await ctx.app.db.player(first.player.id)
    expect(save.quests).toEqual([])
    expect(save.world.inventory).toEqual({})
    expect(
      (await ctx.app.db.player(second.player.id)).world.inventory.herbs
    ).toBeUndefined()
  })

  it('keeps quest participation through leave/reconnect and application reconstruction', async () => {
    const [first, second] = await ctx.team()
    await ctx.app.harness.game.proposeQuest(first.player.id, 'hoa', seed)
    await ctx.app.realtime.party.leave(second.player.id)
    ctx.app.realtime.manager.disconnect(second.player.id, second.socket)
    ctx.app.realtime.manager.connect(second.player, second.socket)
    await ctx.ask(first, 'linh', 'chat', [
      { type: 'deliver', itemId: 'herbs', npcId: 'linh' },
    ])
    expect(
      (await ctx.app.harness.game.checkQuests(first.player.id, 'hoa'))[0]?.type
    ).toBe('incomplete')
    await ctx.ask(second, 'linh', 'chat', [
      { type: 'deliver', itemId: 'herbs', npcId: 'linh' },
    ])
    const reconstructed = ctx.fx.harness({
      ...readConfig({}),
      apiKey: undefined,
      production: true,
    })
    expect(
      (await reconstructed.game.checkQuests(first.player.id, 'hoa'))[0]?.type
    ).toBe('completed')
    expect((await ctx.app.db.player(second.player.id)).completed).toHaveLength(
      1
    )
  })

  it.each(['abandon', 'reset'] as const)(
    'excludes a member who chooses %s so remaining errands complete',
    async (action) => {
      const [first, second] = await ctx.team()
      const offer = await ctx.app.harness.game.proposeQuest(
        first.player.id,
        'hoa',
        seed
      )
      if (!offer.accepted) throw new Error(offer.reason)
      if (action === 'abandon')
        await ctx.app.harness.game.abandon(second.player.id, offer.quest.id)
      else await ctx.app.db.reset(second.player.id)
      expect(
        (await ctx.app.db.player(second.player.id)).world.inventory.herbs ?? 0
      ).toBe(0)
      await ctx.ask(first, 'linh', 'chat', [
        { type: 'deliver', itemId: 'herbs', npcId: 'linh' },
      ])
      expect(
        (await ctx.app.harness.game.checkQuests(first.player.id, 'hoa'))[0]
          ?.type
      ).toBe('completed')
      expect((await ctx.app.db.player(second.player.id)).completed).toEqual([])
    }
  )

  it('authenticates abandon, preserves another player save and reclaims undelivered items', async () => {
    const [first, second] = await ctx.team()
    const offer = await ctx.app.harness.game.proposeQuest(
      first.player.id,
      'hoa',
      seed
    )
    if (!offer.accepted) throw new Error(offer.reason)
    const url = `/me/quests/${offer.quest.id}/abandon`
    expect((await ctx.app.request(url, { method: 'POST' })).status).toBe(401)
    const response = await ctx.app.request(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${first.token}` },
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      player: { quests: [], world: { inventory: { herbs: 0 } } },
    })
    expect((await ctx.app.db.player(second.player.id)).quests[0]?.id).toBe(
      offer.quest.id
    )
    expect(
      (
        await ctx.app.request('/me/quests/bad/abandon', {
          method: 'POST',
          headers: { Authorization: `Bearer ${first.token}` },
        })
      ).status
    ).toBe(400)
  })

  it('rejects full parcel inventory without changing either member inventory', async () => {
    const [first, second] = await ctx.team()
    await ctx.app.db.mutatePlayer(second.player.id, (save) => {
      save.world.inventory.herbs = 100
    })
    expect(
      await ctx.app.harness.game.proposeQuest(first.player.id, 'hoa', seed)
    ).toMatchObject({ accepted: false, reason: 'inventory_full:herbs' })
    expect(
      (await ctx.app.db.player(first.player.id)).world.inventory.herbs
    ).toBeUndefined()
    expect(
      (await ctx.app.db.player(second.player.id)).world.inventory.herbs
    ).toBe(100)
    expect((await ctx.app.db.player(first.player.id)).quests).toEqual([])
  })

  it('does not check a party quest offered after the participant-lock snapshot', async () => {
    const [first, second] = await ctx.team()
    const game = ctx.app.harness.game
    const original = game.get.bind(game)
    const get = vi.spyOn(game, 'get').mockImplementationOnce(async (id) => {
      const before = await original(id)
      await game.proposeQuest(first.player.id, 'hoa', seed)
      await game.applyEvents(first.player.id, [
        { type: 'deliver', itemId: 'herbs', npcId: 'linh' },
      ])
      return before
    })
    expect(await game.checkQuests(first.player.id, 'hoa')).toEqual([])
    get.mockRestore()
    expect((await ctx.app.db.player(first.player.id)).completed).toEqual([])
    expect(
      (await ctx.app.db.player(second.player.id)).quests[0]?.progress
    ).toEqual([false])
  })
})
