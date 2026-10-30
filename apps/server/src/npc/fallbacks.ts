import { DEMO_QUEST, type NpcId, type WorldState } from '@saigon/shared'

/** Deterministic, in-character lines used when the model is unavailable. */
export function fallbackLine(
  npcId: NpcId,
  world: WorldState,
  outcome: 'offered' | 'completed' | 'incomplete' | null
): string {
  if (outcome === 'offered')
    return 'Here are the fresh herbs. Bring them to Chị Linh in the park, then come tell me. Đi nhé!'
  if (outcome === 'completed')
    return 'Cảm ơn con! Linh has the herbs for lunch. Here is your thank-you, and a postcard to remember us.'
  if (outcome === 'incomplete')
    return 'Chị Linh is still waiting in the park. Hand her the herbs, then come back and tell me.'
  const delivered = world.deliveredItems.includes('herbs:linh')
  const completed = world.completedQuestIds.includes(DEMO_QUEST.id)
  const lines: Record<NpcId, string> = {
    hoa: completed
      ? 'Cảm ơn con! Your kindness made the community lunch. Come back for a bowl of phở anytime.'
      : delivered
        ? 'Linh got the herbs? Wonderful! Tell me you are done and I will check.'
        : 'Ah, the market is busy today. Could you help me with a little errand?',
    tam: 'Where do you want to go? The bus is 5 coins, xích lô 3, and walking is always free.',
    linh: delivered
      ? 'Cảm ơn! These herbs smell like home. Cô Hoa will be happy to hear they arrived.'
      : 'Hello! I am waiting for Cô Hoa’s fresh herbs for our community lunch.',
    ba: 'Sit a moment, cháu. The river has seen this city grow. The city can wait a few minutes.',
    mai: 'Chào bạn! Pull up a stool for cà phê sữa and bánh mì. Follow Lê Lợi to Nguyễn Huệ when you are ready for another little walk.',
    alex: 'The Opera House columns are lovely in this light. Have you seen the cathedral and Post Office square, or the skyline from the riverfront?',
  }
  return lines[npcId]
}
