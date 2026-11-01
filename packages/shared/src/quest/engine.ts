import type { PlayerEvent, WorldState } from '../contracts'
import { MARKET_ITEMS, type Reward, RewardSchema } from '../entities'
import { applyPlayerEvents } from '../events'
import { COMPONENT_ITEM_IDS, MILESTONES, type MilestoneId } from '../milestones'
import { selectUnlock, type UnlockId } from '../unlocks'
import { QUEST_DOMAINS, QUEST_LOCATION_POSITIONS } from './domains'
import { isRevealed } from './riddle'
import {
  type Quest,
  type QuestSpec,
  QuestSpecSchema,
  type QuestStep,
} from './schema'
import { applyTwist } from './twist'

export interface QuestPlayer {
  quests: Quest[]
  inParty?: boolean
  /** Held items, used to validate BRING steps. */
  inventory?: Partial<Record<string, number>>
}
export type SpecValidation =
  | { ok: true; spec: QuestSpec }
  | { ok: false; reason: string }

/** Steps whose structural signatures differ. */
function stepSignature(step: QuestStep): string {
  return JSON.stringify(step)
}

/** The milestone a BRING step targets: its host is the giver, item is a component. */
function bringMilestone(
  giverNpcId: QuestSpec['giverNpcId'],
  itemId: string
): MilestoneId | null {
  for (const [id, milestone] of Object.entries(MILESTONES) as [
    MilestoneId,
    (typeof MILESTONES)[MilestoneId],
  ][])
    if (
      milestone.host === giverNpcId &&
      milestone.components.some((component) => component.itemId === itemId)
    )
      return id
  return null
}

function stepInDomain(
  step: QuestStep,
  giverNpcId: QuestSpec['giverNpcId'],
  inventory: Partial<Record<string, number>>
): string | null {
  const domain = QUEST_DOMAINS[giverNpcId]
  if (step.type === 'GO_TO' && !domain.locations.includes(step.locationId))
    return `out_of_domain:location:${step.locationId}`
  if (step.type === 'TALK_TO' || step.type === 'DELIVER') {
    if (step.type === 'DELIVER' && step.npcId === giverNpcId)
      return 'self_delivery'
    if (!domain.npcs.includes(step.npcId))
      return `out_of_domain:npc:${step.npcId}`
  }
  if (step.type === 'BRING') {
    // Validated against MILESTONES, not the giver's items.
    const milestoneId = bringMilestone(giverNpcId, step.itemId)
    if (!milestoneId) return `out_of_domain:bring:${step.itemId}`
    if (step.npcId !== MILESTONES[milestoneId].host) return 'bring_wrong_host'
    if ((inventory[step.itemId] ?? 0) < 1) return `missing_item:${step.itemId}`
    return null
  }
  // Component guard: DELIVER and BUY never move a milestone component.
  const item =
    step.type === 'DELIVER'
      ? step.itemId
      : step.type === 'BUY'
        ? step.marketItemId
        : null
  if (item && COMPONENT_ITEM_IDS.includes(item))
    return `component_not_deliverable:${item}`
  if (item && !domain.items.includes(item)) return `out_of_domain:item:${item}`
  return null
}

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
  if (player.quests.filter((quest) => quest.status !== 'completed').length >= 3)
    return { ok: false, reason: 'cap_reached:maximum_3_active_quests' }
  if (spec.scope === 'party' && !player.inParty)
    return { ok: false, reason: 'party_required' }
  const inventory = player.inventory ?? {}
  const stepSignatures = new Set<string>()
  for (const step of spec.steps) {
    const signature = stepSignature(step)
    if (stepSignatures.has(signature))
      return { ok: false, reason: 'duplicate_step' }
    stepSignatures.add(signature)
    const domainReason = stepInDomain(step, spec.giverNpcId, inventory)
    if (domainReason) return { ok: false, reason: domainReason }
  }
  // Gift override: a component only on its own giver's milestone seed; else a domain gift.
  if (spec.gift) {
    const domain = QUEST_DOMAINS[spec.giverNpcId]
    if (COMPONENT_ITEM_IDS.includes(spec.gift)) {
      const ownsComponent = Object.values(MILESTONES).some(
        (milestone) =>
          spec.milestone !== undefined &&
          milestone.components.some(
            (component) =>
              component.itemId === spec.gift &&
              component.giver === spec.giverNpcId
          )
      )
      if (!ownsComponent)
        return { ok: false, reason: `gift_component:${spec.gift}` }
    } else if (!domain.gifts.includes(spec.gift))
      return { ok: false, reason: `gift_out_of_domain:${spec.gift}` }
  }
  if (spec.twist) {
    const last = spec.steps[spec.steps.length - 1]
    if (spec.steps.length < 2)
      return { ok: false, reason: 'twist_needs_two_steps' }
    if (!last || spec.twist.step.type !== last.type)
      return { ok: false, reason: 'twist_type_mismatch' }
    if (
      last.type === 'DELIVER' &&
      spec.twist.step.type === 'DELIVER' &&
      spec.twist.step.itemId !== last.itemId
    )
      return { ok: false, reason: 'twist_item_mismatch' }
    const twistReason = stepInDomain(
      spec.twist.step,
      spec.giverNpcId,
      inventory
    )
    if (twistReason) return { ok: false, reason: `twist_${twistReason}` }
    const twistSignature = stepSignature(spec.twist.step)
    if (spec.steps.some((step) => stepSignature(step) === twistSignature))
      return { ok: false, reason: 'twist_duplicate_step' }
  }
  if (spec.riddle) {
    const first = spec.steps[0]
    if (
      !first ||
      (first.type !== 'GO_TO' &&
        first.type !== 'TALK_TO' &&
        first.type !== 'DELIVER')
    )
      return { ok: false, reason: 'riddle_bad_first_step' }
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

function stepLocation(step: QuestStep): keyof typeof QUEST_LOCATION_POSITIONS {
  if (step.type === 'GO_TO') return step.locationId
  if (step.type === 'BUY') return 'market'
  return QUEST_DOMAINS[step.npcId].home
}

export function rewardFor(spec: QuestSpec, unlocks?: UnlockContext): Reward {
  const domain = QUEST_DOMAINS[spec.giverNpcId]
  const home = QUEST_LOCATION_POSITIONS[domain.home]
  const steps: QuestStep[] = [...spec.steps]
  // The twist can extend the final leg; count the longer of the two.
  if (spec.twist) steps.push(spec.twist.step)
  let distance = 0
  for (const step of steps) {
    const target = QUEST_LOCATION_POSITIONS[stepLocation(step)]
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
    itemId: spec.gift ?? domain.gifts[0] ?? null,
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

function stepMatches(step: QuestStep, event: PlayerEvent): boolean {
  return (
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
      step.marketItemId === event.itemId) ||
    (step.type === 'BRING' &&
      event.type === 'deliver' &&
      step.itemId === event.itemId &&
      step.npcId === event.npcId)
  )
}

/** Step 0's own NPC, used to resolve a `solved` riddle on a direct talk. */
function stepNpc(step: QuestStep): string | null {
  if (
    step.type === 'TALK_TO' ||
    step.type === 'DELIVER' ||
    step.type === 'BRING'
  )
    return step.npcId
  return null
}

/** Advance only the next step, using an event the caller has already validated. */
export function advance(
  quest: Quest,
  event: PlayerEvent,
  now = Date.now()
): Quest {
  if (quest.status === 'completed') return quest
  // Spend events never match a step; they accrue spend and may reveal a riddle.
  if (event.type === 'spend') {
    // Return-leg coins count for active and ready quests alike.
    let next: Quest = { ...quest, spent: (quest.spent ?? 0) + event.amount }
    if (
      event.mode === 'cyclo' &&
      next.riddle &&
      !next.progress[0] &&
      !isRevealed(next, now)
    )
      next = { ...next, revealed: 'cyclo' }
    return next
  }
  let working = quest
  // A hidden riddle on step 0 may reveal itself from this event.
  if (working.riddle && !working.progress[0] && !isRevealed(working, now)) {
    const first = working.steps[0]
    const ownNpc = first ? stepNpc(first) : null
    if (
      (first && stepMatches(first, event)) ||
      (event.type === 'talk' && ownNpc && event.npcId === ownNpc)
    )
      working = { ...working, revealed: 'solved' }
    else if (
      event.type === 'talk' &&
      event.npcId !== working.giverNpcId &&
      !working.revealed
    )
      working = { ...working, revealed: 'talk' }
  }
  const index = working.progress.findIndex((done) => !done)
  const step = working.steps[index]
  if (!step) return working
  if (!stepMatches(step, event)) return working
  const next = { ...working, progress: [...working.progress] }
  next.progress[index] = true
  next.status = isReady(next) ? 'ready' : 'active'
  return applyTwist(next)
}

/** Does an active quest's next step BUY this market item? Gates market credit. */
export function creditEligible(quests: Quest[], itemId: string): boolean {
  return quests.some((quest) => {
    if (quest.status === 'completed') return false
    const index = quest.progress.findIndex((done) => !done)
    const step = quest.steps[index]
    return step?.type === 'BUY' && step.marketItemId === itemId
  })
}

/** World mutations and quest progression share the same accepted event stream. */
export function applyQuestEvents(
  world: WorldState,
  quests: Quest[],
  events: PlayerEvent[],
  now = Date.now()
): { world: WorldState; quests: Quest[] } {
  let nextWorld = world
  let nextQuests = quests
  for (const rawEvent of events) {
    let event = rawEvent
    if (event.type === 'purchase') {
      const affordable = nextWorld.currency >= MARKET_ITEMS[event.itemId].price
      // Credit only applies when the player can't pay and a quest's next BUY needs it.
      const credited =
        event.credit && !affordable && creditEligible(nextQuests, event.itemId)
      if (credited) event = { ...event, credit: true }
      else if (event.credit) event = { type: 'purchase', itemId: event.itemId }
      if (
        !credited &&
        (!affordable || (nextWorld.inventory[event.itemId] ?? 0) >= 100)
      )
        continue
      if ((nextWorld.inventory[event.itemId] ?? 0) >= 100) continue
    }
    if (
      event.type === 'deliver' &&
      (nextWorld.inventory[event.itemId] ?? 0) < 1
    )
      continue
    nextWorld = applyPlayerEvents(nextWorld, [event])
    nextQuests = nextQuests.map((quest) => advance(quest, event, now))
  }
  return { world: nextWorld, quests: nextQuests }
}
