import {
  type ChatRequest,
  type ChatResponse,
  DEMO_QUEST,
  NPCS,
  type QuestResponse,
} from '@saigon/shared'

export function fallbackChat(request: ChatRequest): ChatResponse {
  const { personaId, worldState } = request
  const delivered = worldState.deliveredItems.includes('herbs:linh')
  const completed = worldState.completedQuestIds.includes(DEMO_QUEST.id)
  const lines = {
    hoa: completed
      ? 'Cảm ơn con! Your kindness made the community lunch. Keep the postcard as a little memory of Sài Gòn.'
      : delivered
        ? 'Linh received the herbs? Wonderful! Let me check your delivery and thank you properly.'
        : 'Chào con! These herbs are for Chị Linh’s community lunch in the park. Could you take them over? The bus stops just outside.',
    tam: 'Chào bạn! A bus ride to the park is 5 coins. Choose the park at the stop, enjoy the view, and look for Chị Linh when you arrive.',
    linh: delivered
      ? 'Cảm ơn! These herbs smell like home. Our lunch will be lovely. Cô Hoa will be happy to hear they arrived.'
      : 'Hello! I’m waiting for Cô Hoa’s fresh herbs for our community lunch. If you have the bundle, hand it over here.',
    ba: 'Sài Gòn rewards a slow look. The market, the cathedral, the trees by the river—each has a story. Take a little time to enjoy them.',
  }
  return {
    reply: lines[personaId] ?? `Welcome! I’m ${NPCS[personaId].name}.`,
    mayOfferQuest: personaId === 'hoa' && !completed,
    source: 'fallback',
  }
}

export function fallbackQuest(): QuestResponse {
  return {
    quest: structuredClone(DEMO_QUEST),
    line: 'Here are the fresh herbs. Bring them to Chị Linh in the park, then let me know how it went. Đi nhé!',
    source: 'fallback',
  }
}
