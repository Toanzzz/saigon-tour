import { DEMO_QUEST, NPCS, SECRET_QUESTS } from '@saigon/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../src/app'
import { readConfig } from '../src/config'
import { fixture } from './fixture'

const offline = { ...readConfig({}), apiKey: undefined, production: true }
let fx: Awaited<ReturnType<typeof fixture>>

beforeAll(async () => {
  fx = await fixture()
})
afterAll(() => fx.close())

describe('new neighborhood conversations', () => {
  it.each([
    ['mai', 'market', /coffee|café|bánh mì/i],
    ['alex', 'opera', /opera|post office|skyline/i],
  ] as const)('%s has an in-character fallback and cannot give Cô Hoa’s errand', async (npc, location, topic) => {
    const identity = await fx.db.createGuest()
    const app = createApp(offline, fetch, fx)
    try {
      const response = await app.request(`/npc/${npc}/interact`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${identity.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Could I help you with an errand?',
          intent: 'help',
          worldContext: {
            playerLocation: location,
            nearbyNpcs: [npc],
            timeOfDay: 'afternoon',
          },
        }),
      })
      expect(response.status).toBe(200)
      const result = await response.json()
      expect(result).toMatchObject({
        npcId: npc,
        source: 'fallback',
        quest: null,
        questEvent: null,
        world: {
          currency: 30,
          inventory: {},
          locationId: location,
          talkedTo: [npc],
        },
      })
      expect(result.reply).toMatch(topic)
      expect(result.toolCalls).toEqual([])
      expect(
        await app.harness.game.offerQuest(
          identity.player.id,
          npc,
          DEMO_QUEST.id
        )
      ).toEqual({ accepted: false, reason: 'not_your_quest' })
    } finally {
      app.realtime.shutdown()
    }
  })

  it.each([
    'mai',
    'alex',
  ] as const)('%s can use memory and context tools without quest or purchase tools', async (npc) => {
    const seen: {
      tools?: { function: { name: string } }[]
      messages: { content: unknown }[]
    }[] = []
    const harness = fx.harness(
      { ...offline, apiKey: 'test-key', timeoutMs: 500 },
      async (_url, init) => {
        seen.push(JSON.parse(String(init?.body)))
        return Response.json({
          id: `${npc}-reply`,
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: 'Enjoy your walk!' },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 100, completion_tokens: 20 },
        })
      }
    )
    const identity = await fx.db.createGuest()
    const result = await harness.interact(
      npc,
      {
        message: 'What should I look for nearby?',
        worldContext: {
          playerLocation: NPCS[npc].location,
          timeOfDay: 'afternoon',
        },
      },
      identity.player.id
    )
    expect(result.source).toBe('live')
    expect(seen).toHaveLength(1)
    expect(seen[0]?.tools?.map((tool) => tool.function.name).sort()).toEqual([
      'getWorldContext',
      'rememberPlayerFact',
    ])
    expect(String(seen[0]?.messages[0]?.content)).toContain(NPCS[npc].name)
    expect(result.world.currency).toBe(30)
    expect(result.quest).toBeNull()
  })

  it.each([
    ['vy', 'cityhall', 'alley', 'cityhall-lanterns', 20],
    ['son', 'postoffice', 'river', 'postoffice-river-postcard', 25],
    ['thao', 'opera', 'cathedral', 'opera-cathedral-note', 30],
  ] as const)('%s reveals and verifies a secret city quest', async (npc, start, destination, questId, reward) => {
    const harness = fx.harness(offline)
    const identity = await fx.db.createGuest()
    const offered = await harness.interact(
      npc,
      {
        message: 'Do you know a secret?',
        intent: 'help',
        worldContext: {
          playerLocation: start,
          nearbyNpcs: [npc],
          timeOfDay: 'afternoon',
        },
      },
      identity.player.id
    )
    expect(offered.questEvent).toMatchObject({
      type: 'offered',
      quest: SECRET_QUESTS[questId],
    })
    const incomplete = await harness.interact(
      npc,
      {
        message: 'I am ready to check.',
        intent: 'check',
        worldContext: {
          playerLocation: start,
          nearbyNpcs: [npc],
          timeOfDay: 'afternoon',
        },
      },
      identity.player.id
    )
    expect(incomplete.questEvent?.type).toBe('incomplete')
    const completed = await harness.interact(
      npc,
      {
        message: 'I found it.',
        intent: 'check',
        events: [{ type: 'visit', locationId: destination }],
        worldContext: {
          playerLocation: destination,
          nearbyNpcs: [npc],
          timeOfDay: 'afternoon',
        },
      },
      identity.player.id
    )
    expect(completed.questEvent).toMatchObject({
      type: 'completed',
      reward: { currency: reward },
    })
    expect(completed.world.completedQuestIds).toContain(questId)
  })
})
