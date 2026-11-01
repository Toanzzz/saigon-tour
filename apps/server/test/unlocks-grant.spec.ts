import {
  createQuest,
  FRIENDSHIP_TIERS,
  GIVER_UNLOCKS,
  seedsFor,
} from '@saigon/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { QuestService } from '@/domain/quests'
import { grantQuest } from '@/domain/quests/rewards'
import { fixture } from './fixture'
import { required } from './support/npc'

let fx: Awaited<ReturnType<typeof fixture>>
beforeAll(async () => {
  fx = await fixture()
})
afterAll(async () => {
  await fx.close()
})

const seed = () => required(seedsFor('hoa')[0])

describe('granting unlocks', () => {
  it('adds the reward unlock exactly once under concurrent completions', async () => {
    const { player } = await fx.guest()
    const unlockId = GIVER_UNLOCKS.hoa[0]
    const quest = createQuest(seed(), undefined, undefined, {
      owned: [],
      promised: [],
      friendship: FRIENDSHIP_TIERS.neutral,
    })
    expect(quest.reward.unlockId).toBe(unlockId)

    const runs = Array.from({ length: 12 }, () =>
      fx.db.mutatePlayer(player.id, (save, client) =>
        grantQuest(player.id, save, structuredClone(quest), client)
      )
    )
    await Promise.all(runs)

    const after = await fx.db.player(player.id)
    expect(after.unlocks.owned.filter((id) => id === unlockId)).toHaveLength(1)
  })

  it('equips an owned unlock and rejects an unowned one', async () => {
    const { player } = await fx.guest()
    const game = new QuestService(fx.db)
    const unlockId = GIVER_UNLOCKS.tam[0]

    const rejected = await game.equip(player.id, 'hat', unlockId)
    expect(rejected).toBe('rejected')

    await fx.db.mutatePlayer(player.id, (save) => {
      save.unlocks.owned = [unlockId]
    })
    const look = await game.equip(player.id, 'hat', unlockId)
    expect(look).toEqual({ hat: unlockId })

    const cleared = await game.equip(player.id, 'hat', null)
    expect(cleared).toBeNull()
    expect((await fx.db.player(player.id)).unlocks.equipped).toEqual({})
  })

  it('rejects an owned unlock equipped into the wrong slot', async () => {
    const { player } = await fx.guest()
    const game = new QuestService(fx.db)
    const petId = GIVER_UNLOCKS.hoa[2]
    await fx.db.mutatePlayer(player.id, (save) => {
      save.unlocks.owned = [petId]
    })
    expect(await game.equip(player.id, 'hat', petId)).toBe('rejected')
    expect(await game.equip(player.id, 'pet', petId)).toEqual({ pet: petId })
  })

  it('clears unlocks on reset', async () => {
    const { player } = await fx.guest()
    const unlockId = GIVER_UNLOCKS.mai[0]
    await fx.db.mutatePlayer(player.id, (save) => {
      save.unlocks.owned = [unlockId]
      save.unlocks.equipped = { accessory: unlockId }
    })
    const reset = await fx.db.reset(player.id)
    expect(reset.unlocks).toEqual({ owned: [], equipped: {} })
  })
})
