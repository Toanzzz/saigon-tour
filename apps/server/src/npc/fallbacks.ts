import {
  DEMO_QUEST,
  type NpcId,
  SECRET_QUESTS,
  type WorldState,
} from '@saigon/shared'

const SECRET_QUEST_BY_NPC = {
  vy: SECRET_QUESTS['cityhall-lanterns'],
  son: SECRET_QUESTS['postoffice-river-postcard'],
  thao: SECRET_QUESTS['opera-cathedral-note'],
} as const

/** Deterministic, in-character lines used when the model is unavailable. */
export function fallbackLine(
  npcId: NpcId,
  world: WorldState,
  outcome: 'offered' | 'completed' | 'incomplete' | null
): string {
  if (outcome === 'offered') {
    if (npcId === 'hoa')
      return 'Here are the fresh herbs. Bring them to Chị Linh in the park, then come tell me. Đi nhé!'
    if (npcId === 'vy')
      return 'A little secret: look for my missing lantern in the quiet food-alley corner, then come back to City Hall.'
    if (npcId === 'son')
      return 'A little secret: visit the riverfront and bring me one wide view for my postcard collection.'
    if (npcId === 'thao')
      return 'A little secret: carry my melody from the Opera House to the cathedral square and listen for its echo.'
  }
  if (outcome === 'completed') {
    if (npcId === 'hoa')
      return 'Cảm ơn con! Linh has the herbs for lunch. Here is your thank-you, and a postcard to remember us.'
    if (npcId === 'vy')
      return 'You found the lantern. The City Hall walk will glow tonight, and this coffee is my thank-you.'
    if (npcId === 'son')
      return 'That river view is perfect. My collection has a new horizon, and this photo is for you.'
    if (npcId === 'thao')
      return 'The cathedral carried the note beautifully. Thank you for bringing the melody across the city.'
  }
  if (outcome === 'incomplete') {
    if (npcId === 'hoa')
      return 'Chị Linh is still waiting in the park. Hand her the herbs, then come back and tell me.'
    if (npcId === 'vy')
      return 'The lantern is still waiting in the food alley. Follow the small lights, then come back here.'
    if (npcId === 'son')
      return 'I still need the wide river view. Take the promenade, then return with what you saw.'
    if (npcId === 'thao')
      return 'The note is still waiting for its echo. Visit the cathedral square, then come back and tell me.'
  }
  const delivered = world.deliveredItems.includes('herbs:linh')
  const completed = world.completedQuestIds.includes(DEMO_QUEST.id)
  const secretQuest =
    SECRET_QUEST_BY_NPC[npcId as keyof typeof SECRET_QUEST_BY_NPC]
  const secretCompleted = secretQuest
    ? world.completedQuestIds.includes(secretQuest.id)
    : false
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
    vy: secretCompleted
      ? 'The lantern is back where it belongs. Walk Nguyễn Huệ after sunset and you will see its color.'
      : 'The evening streets need one more lantern. If you like small secrets, I may know where to look.',
    son: secretCompleted
      ? 'The river view made a beautiful postcard. The city has more stories than any album can hold.'
      : 'I collect small city stories. If you find a secret view, come tell me before the light changes.',
    thao: secretCompleted
      ? 'The note found its echo. Listen between the Opera House and cathedral; the city keeps the melody moving.'
      : 'I am practicing a melody that wants to travel. Ask me for a secret when you are ready to follow it.',
  }
  return lines[npcId]
}
