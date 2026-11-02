import {
  advance,
  applyPlayerEvents,
  bonusCurrency,
  canOfferQuests,
  completionBonus,
  createQuest,
  friendlinessOf,
  type InteractResponse,
  isExpired,
  MILESTONES,
  milestoneForGiver,
  milestoneReady,
  milestoneSeeds,
  type NpcId,
  seedsFor,
  shiftFriendship,
  stepText,
  validateSpec,
  wantsErrand,
  ZERO_REWARD,
} from '@saigon/shared'
import type { InferRequestType } from 'hono/client'
import { getLocale, m, npcDisplay, npcLabel } from '@/shared/i18n'
import { type GameState, game } from '@/shared/state/game'
import { rpc } from './client'
import { readNpcResponse } from './npc-stream'
import { authorizationHeaders } from './transport'

export { queryClient } from './query'

import { initializeSession, sessionToken } from './session'

/** NPC interact endpoint, typed from the shared Hono RPC contract. */
const interact$post = rpc.npc[':npcId'].interact.$post
/** The client adds the current language itself. */
export type InteractBody = Omit<
  InferRequestType<typeof interact$post>['json'],
  'locale'
>
export type InteractResponsePayload = InteractResponse

export interface InteractionResult {
  response: InteractResponse
  synced: boolean
}

/** Talk to an NPC. If the backend is unreachable, keep the loop playable offline. */
export async function interactWith(
  npc: NpcId,
  body: InteractBody,
  state: GameState,
  onText?: (text: string) => void
): Promise<InteractionResult> {
  try {
    if (!sessionToken() || state.guestStatus !== 'online') {
      await initializeSession()
      if (game.state.guestStatus !== 'online') throw new Error('Offline guest')
    }
    const response = await interact$post(
      { param: { npcId: npc }, json: { ...body, locale: getLocale() } },
      {
        init: {
          credentials: 'include',
          headers: {
            ...authorizationHeaders(),
            'Content-Type': 'application/json',
            Accept: 'application/x-ndjson',
          },
          // Outlasts the server: two live attempts of up to 17s each, then fallback.
          signal: AbortSignal.timeout(40000),
        },
      }
    )
    if (!response.ok) throw new Error(`Guide unavailable (${response.status})`)
    // Validate the untrusted body; the parsed shape must match the RPC payload.
    const payload: InteractResponsePayload = await readNpcResponse(
      response,
      onText
    )
    return { response: payload, synced: true }
  } catch {
    onText?.('')
    return { response: offline(npc, body, state), synced: false }
  }
}

/** Offline seeds use the same proposal validation and event engine as the server. */
export function offline(
  npc: NpcId,
  body: InteractBody,
  state: GameState
): InteractResponse {
  let friendship = structuredClone(state.friendship)
  let world = structuredClone(state.world)
  let quests = structuredClone(state.quests)
  const questEvents: InteractResponse['questEvents'] = []
  for (const quest of quests.filter((quest) => isExpired(quest))) {
    for (const [index, step] of quest.steps.entries())
      if (step.type === 'DELIVER' && !quest.progress[index])
        world.inventory[step.itemId] = Math.max(
          0,
          (world.inventory[step.itemId] ?? 0) - 1
        )
    friendship = shiftFriendship(friendship, quest.giverNpcId, -1)
    questEvents.push({
      type: 'failed',
      reason: 'expired',
      quest,
      reward: ZERO_REWARD,
    })
  }
  quests = quests.filter((quest) => !isExpired(quest))
  // Track which quests had already applied their twist, to detect a fresh one.
  const twistedBefore = new Set(
    quests.filter((quest) => quest.twist?.replaced).map((quest) => quest.id)
  )
  // Track which riddle quests were already revealed, to detect a greet reveal.
  const revealedBefore = new Set(
    quests.filter((quest) => quest.revealed).map((quest) => quest.id)
  )
  // Pending events already changed the local world. Advance quests without charging twice.
  for (const event of [
    { type: 'talk' as const, npcId: npc },
    { type: 'visit' as const, locationId: body.worldContext.playerLocation },
  ]) {
    quests = quests.map((quest) => advance(quest, event))
  }
  world = applyPlayerEvents(world, [{ type: 'talk', npcId: npc }])
  let reply: string = m.offline_greeting({
    name: npcLabel(npc),
    fact: npcDisplay(npc).knowledge[0] ?? '',
  })
  // A twist that applied during this turn speaks its authored line.
  const freshTwist = quests.find(
    (quest) => quest.twist?.replaced && !twistedBefore.has(quest.id)
  )
  if (freshTwist?.twist) reply = freshTwist.twist.line
  // A riddle this greet's talk revealed speaks the authored reveal line.
  const freshReveal = quests.find(
    (quest) => quest.riddle && quest.revealed && !revealedBefore.has(quest.id)
  )
  if (!freshTwist?.twist && freshReveal?.steps[0])
    reply = m.riddle_greet_reveal({
      answer: stepText(freshReveal.steps[0], getLocale()),
    })
  for (const quest of quests.filter((entry) => entry.giverNpcId === npc)) {
    if (quest.scope === 'party') {
      continue
    }
    if (
      quest.status === 'ready' &&
      !world.completedQuestIds.includes(quest.id)
    ) {
      quest.status = 'completed'
      friendship = shiftFriendship(friendship, quest.giverNpcId, 1)
      const bonus = completionBonus(quest)
      const extra = bonusCurrency(bonus)
      const reward = {
        ...quest.reward,
        currency: Math.min(100, quest.reward.currency + extra),
        ...(extra ? { bonus } : {}),
      }
      quest.reward = reward
      world.currency = Math.min(100000, world.currency + reward.currency)
      world.completedQuestIds = [...world.completedQuestIds, quest.id].slice(
        -32
      )
      if (reward.itemId)
        world.inventory[reward.itemId] = Math.min(
          100,
          (world.inventory[reward.itemId] ?? 0) + 1
        )
      questEvents.push({ type: 'completed', quest, reward })
    }
  }
  quests = quests.filter((quest) => quest.status !== 'completed')
  const completedWithPayoff = questEvents.find(
    (event) => event.type === 'completed' && event.quest.payoff
  )
  if (completedWithPayoff?.quest.payoff)
    reply = completedWithPayoff.quest.payoff
  else if (questEvents.some((event) => event.type === 'completed'))
    reply = m.offline_thanks()
  // Mirror the server milestone offers: the apex auto-offers for the host on
  // every interaction; the `milestone` intent asks a component giver.
  let milestoneOffered = false
  const completedMilestones = new Set(
    state.completed
      .map((entry) => entry.milestone)
      .filter((id): id is NonNullable<typeof id> => Boolean(id))
  )
  const offerMilestoneSeed = (giver: NpcId) => {
    // Mirror the server: a cold giver (friendliness <= -3) offers nothing.
    if (!canOfferQuests(friendship, giver)) return
    const spec = milestoneSeeds(giver, getLocale())[0]
    if (!spec) return
    const result = validateSpec(spec, { quests, inventory: world.inventory })
    if (!result.ok) return
    const quest = createQuest(spec, undefined, undefined, {
      owned: state.unlocks.owned,
      promised: quests
        .filter((entry) => entry.status !== 'completed')
        .map((entry) => entry.reward.unlockId)
        .filter((id): id is NonNullable<typeof id> => Boolean(id)),
      friendship: friendlinessOf(friendship, giver),
    })
    quests.push(quest)
    questEvents.push({ type: 'offered', quest, reward: quest.reward })
    reply = `${quest.title}. ${quest.description}`
    milestoneOffered = true
  }
  // Apex: the host offers when the player holds every component.
  for (const [id, milestone] of Object.entries(MILESTONES)) {
    if (milestone.host !== npc) continue
    if (completedMilestones.has(id as keyof typeof MILESTONES)) continue
    if (!milestoneReady(world, id as keyof typeof MILESTONES)) continue
    const active = quests.some(
      (quest) =>
        quest.giverNpcId === npc &&
        quest.milestone === id &&
        quest.status !== 'completed'
    )
    if (active) continue
    offerMilestoneSeed(npc)
  }
  // Component giver: the `milestone` intent asks for its errand.
  if (!milestoneOffered && body.intent === 'milestone') {
    const milestoneId = milestoneForGiver(npc)
    const component = milestoneId
      ? MILESTONES[milestoneId].components.find((entry) => entry.giver === npc)
      : undefined
    if (
      milestoneId &&
      component &&
      !completedMilestones.has(milestoneId) &&
      (world.inventory[component.itemId] ?? 0) === 0 &&
      !quests.some(
        (quest) =>
          quest.giverNpcId === npc &&
          quest.milestone === milestoneId &&
          quest.status !== 'completed'
      )
    )
      offerMilestoneSeed(npc)
  }
  if (
    !milestoneOffered &&
    wantsErrand(body.message ?? '') &&
    canOfferQuests(friendship, npc)
  ) {
    // Titles this giver completed in its last 3 quests, in either locale, so
    // the deterministic offer rotates past a just-finished seed.
    const recent = new Set(
      state.completed
        .filter((entry) => entry.giverNpcId === npc)
        .slice(-3)
        .map((entry) => entry.title)
    )
    const isRecentSeed = (candidate: ReturnType<typeof seedsFor>[number]) => {
      if (recent.has(candidate.title)) return true
      const signature = JSON.stringify(candidate.steps)
      const vi = seedsFor(npc, 'vi').find(
        (other) =>
          JSON.stringify(other.steps) === signature &&
          other.scope === candidate.scope
      )
      return vi ? recent.has(vi.title) : false
    }
    const offerable = (candidate: ReturnType<typeof seedsFor>[number]) =>
      validateSpec(candidate, { quests }).ok &&
      candidate.steps.every(
        (step) =>
          step.type !== 'DELIVER' ||
          (world.inventory[step.itemId] ?? 0) +
            candidate.steps.filter(
              (entry) =>
                entry.type === 'DELIVER' && entry.itemId === step.itemId
            ).length <=
            100
      )
    const candidates = seedsFor(npc, getLocale(), {
      demo: body.demo,
    }).filter(offerable)
    const spec =
      candidates.find((candidate) => !isRecentSeed(candidate)) ?? candidates[0]
    if (spec) {
      const promised = quests
        .filter((entry) => entry.status !== 'completed')
        .map((entry) => entry.reward.unlockId)
        .filter((id): id is NonNullable<typeof id> => Boolean(id))
      const quest = createQuest(spec, undefined, undefined, {
        owned: state.unlocks.owned,
        promised,
        friendship: friendlinessOf(friendship, npc),
      })
      quests.push(quest)
      for (const step of quest.steps)
        if (step.type === 'DELIVER')
          world.inventory[step.itemId] = Math.min(
            100,
            (world.inventory[step.itemId] ?? 0) + 1
          )
      questEvents.push({ type: 'offered', quest, reward: quest.reward })
      reply = `${quest.title}. ${quest.description}`
    } else reply = m.offline_no_errand()
  }
  return {
    friendship,
    friendshipEvents: [],
    revision: state.serverRevision,
    npcId: npc,
    reply,
    source: 'fallback',
    degraded: true,
    cached: false,
    party: null,
    world,
    quests,
    questEvents,
    toolCalls: [],
  }
}
