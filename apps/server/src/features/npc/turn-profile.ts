import { type InteractRequest, type NpcId, wantsErrand } from '@saigon/shared'
import { NPC_PERSONAS, npcInstructions } from './agents'
import { languageRule } from './personas/shared'

/** Conservative fast lane: ambiguous requests keep the full quest toolset. */
export function isCasualTurn(
  request: InteractRequest,
  activeQuests: number,
  changedQuests: number
): boolean {
  if (
    request.intent !== 'chat' ||
    activeQuests > 0 ||
    changedQuests > 0 ||
    request.events.length > 0 ||
    wantsErrand(request.message)
  )
    return false
  if (
    /bring|deliver|carry|give|accept|decline|abandon|cancel|need|event|festival|concert|join|giúp|việc|mang|giao|đưa|nhận|bỏ|hủy|cần|sự kiện|lễ hội|hòa nhạc/iu.test(
      request.message
    )
  )
    return false
  return /^(hi|hello|hey|thanks|thank you|chào|cảm ơn)\b|food|eat|phở|coffee|tea|snack|story|stories|weather|market|landmark|neighbo[u]?rhood|ăn|món|cà phê|trà|chuyện|thời tiết|chợ|địa danh|khu phố/iu.test(
    request.message
  )
}

/** Stable per NPC/profile/locale prefix; changing world data follows it. */
export function turnInstructions(
  npcId: NpcId,
  locale: InteractRequest['locale'],
  casual: boolean
) {
  return [
    casual ? NPC_PERSONAS[npcId] : npcInstructions(npcId),
    languageRule(locale),
    casual
      ? 'Answer the conversation directly. This turn has no active errands or quest changes. You can remember player facts and adjust friendliness when meaningful; never claim to have created an errand.'
      : 'Read the supplied current world context first. Do not call getContext for information already present there.',
  ].join('\n')
}
