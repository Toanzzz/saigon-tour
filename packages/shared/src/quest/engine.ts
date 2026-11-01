import type { PlayerEvent, WorldState } from '../contracts'
import { MARKET_ITEMS, type Reward, RewardSchema } from '../entities'
import { applyPlayerEvents } from '../events'
import { selectUnlock, type UnlockId } from '../unlocks'
import { QUEST_DOMAINS, QUEST_LOCATION_POSITIONS } from './domains'
import { type Quest, type QuestSpec, QuestSpecSchema } from './schema'

export interface QuestPlayer {
  quests: Quest[]
  inParty?: boolean
}
export type SpecValidation =
  | { ok: true; spec: QuestSpec }
  | { ok: false; reason: string }

export function validateSpec(
  input: unknown,
  player: QuestPlayer
): SpecValidation {
  const parsed = QuestSpecSchema.safeParse(input)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const field = issue?.path.join('.') ?? 'spec'
    return { ok: false, reason: `invalid_spec:${field}:${issue?.message}` }
  }
  const spec = parsed.data
  const domain = QUEST_DOMAINS[spec.giverNpcId]
  if (player.quests.filter((quest) => quest.status !== 'completed').length >= 3)
    return { ok: false, reason: 'cap_reached:maximum_3_active_quests' }
  if (spec.scope === 'party' && !player.inParty)
    return { ok: false, reason: 'party_required' }
  const stepSignatures = new Set<string>()
  for (const step of spec.steps) {
    const signature = JSON.stringify(step)
    if (stepSignatures.has(signature))
      return { ok: false, reason: 'duplicate_step' }
    stepSignatures.add(signature)
    if (step.type === 'GO_TO' && !domain.locations.includes(step.locationId))
      return { ok: false, reason: `out_of_domain:location:${step.locationId}` }
    if (step.type === 'TALK_TO' || step.type === 'DELIVER') {
      if (step.type === 'DELIVER' && step.npcId === spec.giverNpcId)
        return { ok: false, reason: 'self_delivery' }
      if (!domain.npcs.includes(step.npcId))
        return { ok: false, reason: `out_of_domain:npc:${step.npcId}` }
    }
    const item =
      step.type === 'DELIVER'
        ? step.itemId
        : step.type === 'BUY'
          ? step.marketItemId
          : null
    if (item && !domain.items.includes(item))
      return { ok: false, reason: `out_of_domain:item:${item}` }
  }
  const signature = JSON.stringify(spec.steps)
  if (
    player.quests.some(
      (quest) =>
        quest.status !== 'completed' &&
        quest.giverNpcId === spec.giverNpcId &&
        JSON.stringify(quest.steps) === signature
    )
  )
    return { ok: false, reason: 'duplicate_active_quest' }
  return { ok: true, spec }
}

/** Signature-unlock context: what the player already owns, what other active quests promised, and their friendship with the giver. */
export interface UnlockContext {
  owned: readonly UnlockId[]
  promised: readonly UnlockId[]
  friendship: number
}

const NEIGHBOR_GIVERS = new Set([
  'hoa',
  'tam',
  'linh',
  'ba',
  'mai',
  'alex',
  'vy',
  'son',
  'thao',
])

export function rewardFor(spec: QuestSpec, unlocks?: UnlockContext): Reward {
  const domain = QUEST_DOMAINS[spec.giverNpcId]
  const home = QUEST_LOCATION_POSITIONS[domain.home]
  let distance = 0
  for (const step of spec.steps) {
    const location =
      step.type === 'GO_TO'
        ? step.locationId
        : step.type === 'BUY'
          ? 'market'
          : QUEST_DOMAINS[step.npcId].home
    const target = QUEST_LOCATION_POSITIONS[location]
    distance += Math.hypot(home[0] - target[0], home[1] - target[1])
  }
  const unlockId =
    unlocks && NEIGHBOR_GIVERS.has(spec.giverNpcId)
      ? selectUnlock(
          spec.giverNpcId as Parameters<typeof selectUnlock>[0],
          unlocks
        )
      : undefined
  return RewardSchema.parse({
    currency: Math.min(
      100,
      Math.max(0, 10 + spec.steps.length * 10 + Math.round(distance / 10))
    ),
    itemId: domain.gifts[0] ?? null,
    reputation: spec.steps.length >= 2 ? 2 : 1,
    ...(unlockId ? { unlockId } : {}),
  })
}

export function createQuest(
  spec: QuestSpec,
  id = `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`,
  now = Date.now(),
  unlocks?: UnlockContext
): Quest {
  return {
    ...spec,
    steps: spec.steps.map((step) => ({ ...step })),
    id,
    reward: rewardFor(spec, unlocks),
    progress: spec.steps.map(() => false),
    status: 'active',
    createdAt: now,
  }
}

export function isReady(quest: Quest): boolean {
  return (
    quest.progress.length === quest.steps.length &&
    quest.progress.every(Boolean)
  )
}

/** Advance only the next step, using an event the caller has already validated. */
export function advance(quest: Quest, event: PlayerEvent): Quest {
  if (quest.status === 'completed') return quest
  const index = quest.progress.findIndex((done) => !done)
  const step = quest.steps[index]
  if (!step) return quest
  const matches =
    (step.type === 'GO_TO' &&
      event.type === 'visit' &&
      step.locationId === event.locationId) ||
    (step.type === 'TALK_TO' &&
      event.type === 'talk' &&
      step.npcId === event.npcId) ||
    (step.type === 'DELIVER' &&
      event.type === 'deliver' &&
      step.itemId === event.itemId &&
      step.npcId === event.npcId) ||
    (step.type === 'BUY' &&
      event.type === 'purchase' &&
      step.marketItemId === event.itemId)
  if (!matches) return quest
  const next = { ...quest, progress: [...quest.progress] }
  next.progress[index] = true
  next.status = isReady(next) ? 'ready' : 'active'
  return next
}

/** World mutations and quest progression share the same accepted event stream. */
export function applyQuestEvents(
  world: WorldState,
  quests: Quest[],
  events: PlayerEvent[]
): { world: WorldState; quests: Quest[] } {
  let nextWorld = world
  let nextQuests = quests
  for (const event of events) {
    if (
      (event.type === 'purchase' &&
        (nextWorld.currency < MARKET_ITEMS[event.itemId].price ||
          (nextWorld.inventory[event.itemId] ?? 0) >= 100)) ||
      (event.type === 'deliver' && (nextWorld.inventory[event.itemId] ?? 0) < 1)
    )
      continue
    nextWorld = applyPlayerEvents(nextWorld, [event])
    nextQuests = nextQuests.map((quest) => advance(quest, event))
  }
  return { world: nextWorld, quests: nextQuests }
}
