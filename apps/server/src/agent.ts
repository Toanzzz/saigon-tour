import {
  type ChatRequest,
  type ChatResponse,
  ChatResponseSchema,
  DEMO_QUEST,
  objectiveSatisfied,
  type Quest,
  type QuestRequest,
  type QuestResponse,
  QuestResponseSchema,
  type VerifyRequest,
  type VerifyResponse,
  ZERO_REWARD,
} from '@saigon/shared'
import { isLiveConfigured, type ServerConfig } from './config'
import { fallbackChat, fallbackQuest } from './fallback'
import { BoundedCache, CostGuard } from './guard'
import { log } from './logger'
import { callModel, type Fetcher, safeLine } from './meta'

const ChatModelSchema = ChatResponseSchema.omit({ source: true })
const QuestModelSchema = QuestResponseSchema.omit({ source: true })

export class NpcAgent {
  private readonly guard: CostGuard
  private readonly chatCache = new BoundedCache<ChatResponse>()
  private readonly quests = new BoundedCache<Quest>(1000, 60 * 60 * 1000)

  constructor(
    private readonly config: ServerConfig,
    private readonly fetcher: Fetcher = fetch
  ) {
    this.guard = new CostGuard(
      config.sessionCallLimit,
      config.globalCallLimit,
      config.spendLimitUsd
    )
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const key = JSON.stringify({ ...request, sessionId: undefined })
    const cached = this.chatCache.get(key)
    if (cached) return cached
    if (!isLiveConfigured(this.config) || !this.guard.allow(request.sessionId))
      return fallbackChat(request)
    try {
      const response = await callModel(
        this.config,
        this.fetcher,
        request.personaId,
        request,
        ChatModelSchema,
        'Return {"reply":string,"mayOfferQuest":boolean}. Only Hoa can offer the herb-delivery quest. The player may take the bus for 5 coins or walk.'
      )
      if (!safeLine(response.reply)) throw new Error('model_unsafe_output')
      const result: ChatResponse = {
        ...response,
        mayOfferQuest: request.personaId === 'hoa' && response.mayOfferQuest,
        source: 'live',
      }
      this.chatCache.set(key, result)
      this.report('chat_completed', request.personaId)
      return result
    } catch {
      this.report('chat_fallback', request.personaId)
      return fallbackChat(request)
    }
  }

  async quest(request: QuestRequest): Promise<QuestResponse> {
    const issued = this.quests.get(`${request.sessionId}:${DEMO_QUEST.id}`)
    if (issued)
      return {
        quest: issued,
        line: 'The herbs are ready. Chị Linh is waiting in the park.',
        source: 'live',
      }
    const fallback = fallbackQuest()
    if (
      request.personaId !== 'hoa' ||
      !isLiveConfigured(this.config) ||
      !this.guard.allow(request.sessionId)
    )
      return fallback
    try {
      const response = await callModel(
        this.config,
        this.fetcher,
        request.personaId,
        request,
        QuestModelSchema,
        [
          `Offer a playable delivery quest based on this template: ${JSON.stringify(DEMO_QUEST)}.`,
          'You decide the title, description, welcoming line, and currency reward between 30 and 60.',
          'Keep id, giverNpcId, objective, itemId and reputation exactly as the template.',
          'Return {"quest": the complete quest object, "line": string}.',
        ].join('\n')
      )
      const quest = response.quest
      if (
        quest.id !== DEMO_QUEST.id ||
        quest.giverNpcId !== 'hoa' ||
        quest.objective.type !== 'DELIVER' ||
        quest.objective.itemId !== 'herbs' ||
        quest.objective.npcId !== 'linh' ||
        quest.reward.currency < 30 ||
        quest.reward.currency > 60 ||
        quest.reward.itemId !== 'postcard' ||
        quest.reward.reputation !== 1
      )
        throw new Error('model_unreachable_quest')
      if (![response.line, quest.title, quest.description].every(safeLine))
        throw new Error('model_unsafe_output')
      this.quests.set(`${request.sessionId}:${quest.id}`, quest)
      this.report('quest_completed', request.personaId)
      return { ...response, source: 'live' }
    } catch {
      this.report('quest_fallback', request.personaId)
      return fallback
    }
  }

  verify(request: VerifyRequest): VerifyResponse {
    const issued = this.quests.get(`${request.sessionId}:${request.quest.id}`)
    const canonical =
      issued ?? (request.quest.id === DEMO_QUEST.id ? DEMO_QUEST : undefined)
    if (
      !canonical ||
      request.personaId !== canonical.giverNpcId ||
      JSON.stringify(request.quest) !== JSON.stringify(canonical)
    ) {
      return {
        status: 'INCOMPLETE',
        reward: ZERO_REWARD,
        line: 'Let’s check the original errand in your journal first.',
        source: 'fallback',
      }
    }
    if (request.worldState.completedQuestIds.includes(canonical.id)) {
      return {
        status: 'COMPLETE',
        reward: ZERO_REWARD,
        line: 'You already earned your thank-you for this errand. Enjoy your postcard!',
        source: 'fallback',
      }
    }
    const complete = objectiveSatisfied(canonical, request.worldState)
    return {
      status: complete ? 'COMPLETE' : 'INCOMPLETE',
      reward: complete ? canonical.reward : ZERO_REWARD,
      line: complete
        ? 'Cảm ơn con! Linh has the herbs for lunch. Here’s your thank-you, and a postcard to remember our neighborhood.'
        : 'Chị Linh is still waiting in the park. Hand her the herbs, then come back and tell me how it went.',
      source: 'fallback',
    }
  }

  private report(event: string, personaId: string): void {
    if (!this.config.production) log(event, `NPC ${personaId}`)
  }
}
