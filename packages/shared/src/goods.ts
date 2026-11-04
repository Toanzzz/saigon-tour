import { z } from 'zod'
import type { Quest, WorldState } from './contracts'
import {
  MARKET_ITEMS,
  type MarketItemId,
  MarketItemIdSchema,
  type NpcId,
} from './entities'
import { NPC_SHOPS } from './npcs/derive'

export const ActiveEffectSchema = z
  .object({
    itemId: MarketItemIdSchema,
    endsAt: z.number().int().nonnegative(),
  })
  .strict()
export type ActiveEffect = z.infer<typeof ActiveEffectSchema>

export function merchantFor(itemId: MarketItemId): NpcId {
  const match = Object.entries(NPC_SHOPS).find(([, stock]) =>
    stock.includes(itemId)
  )
  if (!match) throw new Error(`missing_merchant:${itemId}`)
  return match[0] as NpcId
}

/** Copies promised to recipients remain available throughout an active errand. */
export function reservedQuantity(
  quests: readonly Quest[],
  itemId: string
): number {
  return quests.reduce(
    (total, quest) =>
      total +
      (quest.status === 'completed'
        ? 0
        : quest.steps.reduce(
            (count, step, index) =>
              count +
              Number(
                !quest.progress[index] &&
                  (step.type === 'DELIVER' || step.type === 'BRING') &&
                  step.itemId === itemId
              ),
            0
          )),
    0
  )
}

export function staminaModifiers(
  effects: readonly ActiveEffect[] = [],
  now = Date.now()
) {
  const active = new Set(
    effects
      .filter((effect) => effect.endsAt > now)
      .map((effect) => effect.itemId)
  )
  return {
    max: active.has('pho') ? 150 : 100,
    drain: (100 / 12) * (active.has('coffee') ? 0.5 : 1),
    regen: 12.5 * (active.has('baguette') ? 1.5 : 1),
  }
}

export function consumeGood(
  world: WorldState,
  quests: readonly Quest[],
  itemId: MarketItemId,
  now = Date.now()
): { world: WorldState; restore: number } | { error: string } {
  const held = world.inventory[itemId] ?? 0
  if (held < 1) return { error: 'item_not_owned' }
  if (held <= reservedQuantity(quests, itemId))
    return { error: 'item_reserved' }
  const { effect } = MARKET_ITEMS[itemId]
  const effects = (world.effects ?? []).filter(
    (entry) => entry.endsAt > now && entry.itemId !== itemId
  )
  if (effect.durationMs > 0)
    effects.push({ itemId, endsAt: now + effect.durationMs })
  return {
    world: {
      ...world,
      inventory: { ...world.inventory, [itemId]: held - 1 },
      effects,
    },
    restore:
      effect.kind === 'restore' || effect.kind === 'capacity'
        ? effect.amount
        : 0,
  }
}
