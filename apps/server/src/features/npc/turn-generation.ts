import type { Mastra } from '@mastra/core/mastra'
import { RequestContext } from '@mastra/core/request-context'
import type { InteractRequest, NpcId } from '@saigon/shared'
import type { QuestService } from '@/domain/quests'
import type { ServerConfig } from '@/shared/config'
import { offeredErrandLine } from './fallbacks'
import type { NpcMemoryService } from './memory/npc-memory'
import { describeError, storageUnavailable } from './meter'
import { cleanReply } from './safety'
import type { NpcRequestValues, ToolOutcome } from './tools/context'
import { buildContext, turnMessage } from './turn'
import { isCasualTurn, turnInstructions } from './turn-profile'

export type TurnReport = (
  event: string,
  npcId: NpcId,
  calls: string[],
  level?: 'info' | 'warn' | 'error',
  detail?: string
) => void
export interface TurnDelivery {
  onText: (text: string) => void | Promise<void>
  signal?: AbortSignal
}

export class TurnGenerator {
  constructor(
    private readonly config: ServerConfig,
    private readonly mastra: Mastra,
    private readonly game: QuestService,
    private readonly memory: NpcMemoryService,
    private readonly report: TurnReport
  ) {}

  async generate(
    npcId: NpcId,
    request: InteractRequest,
    playerId: string,
    outcome: ToolOutcome,
    twistedLine: string | null,
    riddleContext: string | null = null,
    milestoneContext: string | null = null,
    referredGreeting: string | null = null,
    delivery?: TurnDelivery
  ): Promise<string | null> {
    const agent = this.mastra.getAgentById(npcId)
    // Only offers made by this generation end the loop; milestone offers may
    // already be present and still need their normal dialogue.
    const eventOffset = outcome.events.length
    const record = await this.game.get(playerId)
    const casual = isCasualTurn(request, record.quests.length, eventOffset)
    const newlyOffered = () =>
      outcome.events
        .slice(eventOffset)
        .find((event) => event.type === 'offered')?.quest
    const context = await buildContext(
      this.game,
      this.memory,
      npcId,
      request,
      playerId,
      outcome,
      twistedLine,
      riddleContext,
      milestoneContext,
      referredGreeting,
      casual
    )
    for (let attempt = 0; attempt < 2; attempt++) {
      const requestContext = new RequestContext<NpcRequestValues>([
        ['playerId', playerId],
        ['npcId', npcId],
        ['outcome', outcome],
      ])
      try {
        const deadline = AbortSignal.timeout(this.config.timeoutMs + 2000)
        const options: AgentExecutionOptions = {
          instructions: turnInstructions(npcId, request.locale, casual),
          ...(casual
            ? { activeTools: ['adjustFriendliness', 'rememberPlayerFact'] }
            : {}),
          memory: {
            thread: `${npcId}:${playerId}`,
            resource: playerId,
            // The harness is the single history writer (see recordTurn below).
            // Read memory for recall, but never let the agent persist turns, or
            // live and fallback writers duplicate/orphan messages in the thread.
            options: { readOnly: true, lastMessages: casual ? 12 : 40 },
          },
          context: [{ role: 'system', content: context }],
          requestContext,
          maxSteps: 3,
          stopWhen: () => Boolean(newlyOffered()),
          abortSignal: delivery?.signal
            ? AbortSignal.any([deadline, delivery.signal])
            : deadline,
          modelSettings: {
            maxOutputTokens: 4000,
            maxRetries: 0,
            timeout: {
              totalMs: this.config.timeoutMs + 2000,
              stepMs: this.config.timeoutMs,
            },
          },
          providerOptions: { meta: { reasoningEffort: 'minimal' } },
        }
        const result =
          casual && delivery
            ? await (async () => {
                await delivery.onText('')
                const stream = await agent.stream(turnMessage(request), options)
                let text = ''
                for await (const chunk of stream.textStream) {
                  text += chunk
                  const safe = cleanReply(text)
                  await delivery.onText(safe ?? '')
                }
                return { text: await stream.text, steps: await stream.steps }
              })()
            : await agent.generate(turnMessage(request), options)
        const offered = newlyOffered()
        if (offered) {
          this.report('npc_turn_completed', npcId, outcome.calls)
          return offeredErrandLine(offered, request.locale)
        }
        // Tool-call steps may carry interim narration; reply with the final step.
        const last = result.steps?.at(-1)?.text
        const reply = cleanReply(last?.trim() ? last : result.text)
        if (reply) {
          this.report('npc_turn_completed', npcId, outcome.calls)
          return reply
        }
        if (outcome.calls.length) return null
      } catch (error) {
        if (storageUnavailable(error)) throw error
        if (delivery?.signal?.aborted) throw error
        await delivery?.onText('')
        this.report(
          'npc_turn_failed',
          npcId,
          outcome.calls,
          'error',
          describeError(error, attempt)
        )
        if (outcome.calls.length) return null
      }
    }
    return null
  }
}

import type { AgentExecutionOptions } from '@mastra/core/agent'
