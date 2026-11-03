import type { Locale } from '../locale'
import { NPC_COMPLETION, NPC_NAMES } from '../npcs/derive'
import type { Quest } from './schema'

/** Authored payoffs and per-person fallback copy share every completion surface. */
export function completionLine(
  quest: Pick<Quest, 'giverNpcId' | 'payoff'>,
  locale: Locale = 'en'
) {
  if (quest.payoff) return quest.payoff
  return (
    NPC_COMPLETION[quest.giverNpcId]?.[locale] ??
    (locale === 'vi'
      ? `${NPC_NAMES[quest.giverNpcId].vi}: Cảm ơn bạn đã giúp một tay, cả xóm vui hơn rồi!`
      : `${NPC_NAMES[quest.giverNpcId].en}: Thank you for lending a hand. You made the neighborhood brighter!`)
  )
}
