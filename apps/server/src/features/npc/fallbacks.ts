import type { NpcId, WorldState } from '@saigon/shared'

/** Deterministic lines describe only validated outcomes. */
export function fallbackLine(
  npcId: NpcId,
  _world: WorldState,
  outcome: 'offered' | 'completed' | 'incomplete' | null
): string {
  if (outcome === 'offered')
    return 'Cảm ơn! Your errand is in the journal. Follow its steps, then come back to me.'
  if (outcome === 'completed')
    return 'Cảm ơn! You finished the errand. Your thank-you is in your bag.'
  if (outcome === 'incomplete')
    return 'There is still something to do. Check the steps in your journal, then come back.'
  const lines: Record<NpcId, string> = {
    hoa: 'Chào con! The market is busy. Ask me for an errand if you would like to help.',
    tam: 'Where do you want to go? The bus is 5 coins, xích lô 3, and walking is always free.',
    linh: 'Chào bạn! There is always a neighbor who could use a little help.',
    ba: 'Sit a moment, cháu. The river has seen this city grow. The city can wait a few minutes.',
    mai: 'Chào bạn! Pull up a stool for cà phê sữa and bánh mì.',
    alex: 'The Opera House columns are lovely in this light. Have you seen the view from the river?',
    vy: 'The evening streets need a little color. Ask me how you can help.',
    son: 'I collect small city stories. There is always another view to find.',
    thao: 'I am practicing a melody that wants to travel. Come walk a little with the music.',
  }
  return lines[npcId]
}
