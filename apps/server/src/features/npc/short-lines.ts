import { Agent } from '@mastra/core/agent'
import type { MastraModelConfig } from '@mastra/core/llm'
import { NPCS, type NpcId, npcActivity, type TimeOfDay } from '@saigon/shared'
import { NPC_PERSONAS } from './agents'
import { storageUnavailable } from './meter'
import { cleanReply } from './safety'

export interface ShortLine {
  reply: string
  source: 'live' | 'fallback'
}

/** Ambient barks have no tools or conversation memory. */
export class ShortLines {
  private readonly agents: Record<NpcId, Agent>

  constructor(
    model: MastraModelConfig,
    private readonly live: boolean,
    private readonly timeoutMs: number
  ) {
    this.agents = Object.fromEntries(
      (Object.keys(NPCS) as NpcId[]).map((npc) => [
        npc,
        new Agent({
          id: `${npc}-bark`,
          name: NPCS[npc].name,
          instructions: NPC_PERSONAS[npc],
          model,
        }),
      ])
    ) as Record<NpcId, Agent>
  }

  async bark(npc: NpcId, bucket: TimeOfDay): Promise<ShortLine> {
    if (this.live) {
      try {
        const result = await this.agents[npc].generate(
          `It is ${bucket}. Say one short atmospheric neighborhood line for passersby. Do not greet or offer an errand.`,
          {
            activeTools: [],
            maxSteps: 1,
            abortSignal: AbortSignal.timeout(this.timeoutMs),
            modelSettings: { maxOutputTokens: 2000, maxRetries: 0 },
            providerOptions: { meta: { reasoningEffort: 'minimal' } },
          }
        )
        const reply = cleanReply(result.text)
        if (reply && result.finishReason !== 'length')
          return { reply, source: 'live' }
      } catch (error) {
        if (storageUnavailable(error)) throw error
      }
    }
    return {
      reply: npcActivity(npc).text.en.replace('{name}', NPCS[npc].name),
      source: 'fallback',
    }
  }
}
