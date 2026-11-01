import type { NpcId } from '../entities'
import type { Locale } from '../locale'
import { NPCS, QUEST_SEEDS } from '../npcs/derive'
import type { QuestSpec } from './schema'

/** Seed quests carry text per language; projected to a plain QuestSpec on use. */
export type SeedCatalog = Omit<QuestSpec, 'title' | 'description'> & {
  text: Record<Locale, { title: string; description: string }>
}

export { QUEST_SEEDS }

export function seedsFor(npcId: NpcId, locale: Locale = 'en'): QuestSpec[] {
  return QUEST_SEEDS.filter((seed) => seed.giverNpcId === npcId).map((seed) => {
    const steps = seed.steps.map((step) => ({ ...step }))
    const { title, description } = seed.text[locale]
    // Authored fields are optional; project each into the requested locale.
    const extra = {
      ...(seed.payoff ? { payoff: seed.payoff[locale] } : {}),
      ...(seed.twist
        ? {
            twist: {
              step: { ...seed.twist.step },
              line: seed.twist.line[locale],
            },
          }
        : {}),
      ...(seed.riddle ? { riddle: { text: seed.riddle.text[locale] } } : {}),
    }
    // Field order is preserved per kind so embedded JSON stays byte-identical:
    // neighbors emitted steps before scope, residents emitted scope before steps.
    return NPCS[seed.giverNpcId].kind === 'resident'
      ? {
          giverNpcId: seed.giverNpcId,
          scope: seed.scope,
          steps,
          title,
          description,
          ...extra,
        }
      : {
          giverNpcId: seed.giverNpcId,
          steps,
          scope: seed.scope,
          title,
          description,
          ...extra,
        }
  })
}
