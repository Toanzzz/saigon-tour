import {
  CITY_ANCHORS,
  NEIGHBOR_IDS,
  NPC_ACTIVITIES,
  QUEST_DOMAINS,
} from '@saigon/shared'
import { describe, expect, it, vi } from 'vitest'
import { CityWorld } from '@/domain/city'
import { directorAgent } from '@/features/director/agent'
import { DIRECTOR_PERSONA } from '@/features/director/persona'
import { live, setupNpc } from './support/npc'

const ctx = setupNpc()

describe('Director activity context', () => {
  it('preserves the authored prompt context without UI conversation hints', async () => {
    const activities = Object.fromEntries(
      Object.entries(NPC_ACTIVITIES).map(([npc, catalog]) => [
        npc,
        Object.fromEntries(
          Object.entries(catalog).map(([id, activity]) => [
            id,
            {
              text: activity.text,
              animation: activity.animation,
              ...(activity.movement ? { movement: activity.movement } : {}),
              ...(activity.prop ? { prop: activity.prop } : {}),
            },
          ])
        ),
      ])
    )
    const agent = directorAgent(live, ctx.fx.db, vi.fn(), new CityWorld(), [], {
      calls: 0,
      inputTokens: 0,
      outputTokens: 0,
      estimatedUsd: 0,
    })
    expect(await agent.getInstructions()).toBe(
      `${DIRECTOR_PERSONA}\nAuthored anchors: ${JSON.stringify(CITY_ANCHORS)}\nNPC activities: ${JSON.stringify(activities)}\nNPC quest domains: ${JSON.stringify(Object.fromEntries(NEIGHBOR_IDS.map((id) => [id, QUEST_DOMAINS[id]])))}`
    )
  })
})
