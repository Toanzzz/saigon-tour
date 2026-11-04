import { FRAGILE_ITEM_IDS, type NpcId, npcActivity } from '@saigon/shared'
import {
  carePhrase,
  carryStore,
  reactionFor,
  resetCarry,
} from '@/features/carry'
import { resetCollectedCoins } from '@/features/collectibles/pickup'
import { converse, deliver } from '@/features/conversation/converse'
import { resetCommerce, resetShop } from '@/features/shop'
import { resetStamina } from '@/features/stamina'
import { resetAsides } from '@/features/transport/asides'
import { resetVoice, resetVoiceClips } from '@/features/voice'
import { city, npcPosition } from '@/shared/api/city'
import {
  beginHttpTurn,
  endHttpTurn,
  resetEventSequence,
} from '@/shared/api/events'
import { cachedHistory, fetchHistory } from '@/shared/api/history'
import { clearPersistedQueries, queryClient } from '@/shared/api/query'
import { guestState, resetSession, signOut } from '@/shared/api/session'
import { audio } from '@/shared/audio'
import { itemLabel, m, npcLabel } from '@/shared/i18n'
import { nextCompletion } from '@/shared/state/completions'
import {
  advanceQuests,
  game,
  initialState,
  notify,
  update,
} from '@/shared/state/game'
import { resetNavigation } from '@/shared/state/navigation'
import { dialogueQuests } from '@/shared/state/quests'
import { resetRiddles } from '@/shared/state/riddles'
import { resetTwists } from '@/shared/state/twists'
import {
  resetChatDraft,
  resetJourneyConfirm,
  resetTransportForm,
  resetWardrobeTab,
} from '@/shared/state/ui'
import { npcPoses } from '@/shared/world/npc-pose'
import {
  distance,
  MODES,
  PEOPLE,
  PLACES,
  type Point,
  type TravelMode,
} from '@/shared/world/places'
import { isXRPresenting } from '@/shared/xr/store'

export function start() {
  update({ screen: 'playing' })
  void audio.unlock()
}
export async function restart() {
  const state = game.state
  if (state.guestStatus === 'resetting') return false
  const acquired = await beginHttpTurn()
  if (!acquired) {
    notify(m.toast_wait_conversation())
    return false
  }
  resetVoice()
  update({ guestStatus: 'resetting' })
  let player = null
  try {
    player = await resetSession()
  } catch {
    endHttpTurn()
    update({ guestStatus: state.guestStatus })
    notify(m.toast_reset_failed())
    return false
  }
  queryClient.removeQueries({ queryKey: ['npc-history'] })
  resetVoiceClips()
  resetEventSequence()
  audio.setPaused(false)
  game.setState(() => ({
    ...initialState(state.generation + 1),
    guestId: state.guestId,
    guestName: state.guestName,
    guestColor: state.guestColor,
    guestStatus: player ? 'online' : 'offline',
    returningGuest: false,
    account: state.account,
    metaAvailable: state.metaAvailable,
    ...(player ? guestState(player) : {}),
    muted: state.muted,
    volume: state.volume,
    reducedMotion: state.reducedMotion,
    timeOfDay: state.timeOfDay,
  }))
  resetNavigation()
  resetCommerce()
  resetShop()
  resetStamina()
  resetChatDraft()
  resetTransportForm()
  resetWardrobeTab()
  resetJourneyConfirm()
  resetCollectedCoins()
  resetCarry()
  resetTwists()
  resetRiddles()
  resetAsides()
  return true
}
/** Drop this device's saved session; reload as a brand-new guest. */
export async function forgetDevice() {
  await signOut().catch(() => {})
  await clearPersistedQueries()
  location.reload()
}
export function pause() {
  const paused = game.state.screen !== 'paused'
  update({ screen: paused ? 'paused' : 'playing' })
  audio.setPaused(paused)
}
export function openJournal() {
  update({ dialogue: null, panel: 'journal' })
}
export function close() {
  const { panel, hubShown } = game.state
  if (panel === 'reward') {
    update(nextCompletion(game.state))
    if (game.state.rewardQuest) return
  }
  if (panel === 'reward' && !hubShown && !isXRPresenting()) {
    update({ dialogue: null, panel: 'none', screen: 'hub', hubShown: true })
    return
  }
  update({ dialogue: null, panel: 'none', viewpoint: null })
}
export function canOpenHub(state = game.state) {
  return (
    state.screen === 'playing' &&
    !state.dialogue &&
    !state.ride &&
    !isXRPresenting()
  )
}
export function openHub() {
  if (!canOpenHub()) return
  update({ screen: 'hub', panel: 'none', hubShown: true })
  audio.play('click')
}
export function closeHub(panel: 'none' | 'journal' | 'map' = 'none') {
  if (game.state.screen !== 'hub') return
  update({ screen: 'playing', panel })
}
export function toggleHub() {
  if (game.state.screen === 'hub') closeHub()
  else openHub()
}
export function toggleTimeOfDay() {
  update({ timeOfDay: game.state.timeOfDay === 'day' ? 'evening' : 'day' })
}
export function openRiverPostcard() {
  if (game.state.world.locationId !== 'river') return
  update({ panel: 'postcard', viewpoint: 'river' })
}
export function nearby(
  position = game.state.position
): { kind: 'npc' | 'stop'; id: string; label: string; at: Point } | null {
  const targets = [
    ...Object.entries(PEOPLE).map(([id]) => ({
      kind: 'npc' as const,
      id,
      label: m.hud_talk_to({ name: npcLabel(id as NpcId) }),
      at: npcPosition(id as NpcId),
    })),
    ...Object.entries(PLACES).map(([id, value]) => ({
      kind: 'stop' as const,
      id,
      label: m.hud_choose_ride(),
      at: value.stop,
    })),
  ].filter((target) => distance(target.at, position) < 4)
  return (
    targets.sort(
      (a, b) => distance(a.at, position) - distance(b.at, position)
    )[0] ?? null
  )
}
export function interact() {
  resetNavigation()
  const state = game.state
  if (
    state.screen !== 'playing' ||
    state.ride ||
    state.dialogue ||
    state.panel !== 'none'
  )
    return
  const target = nearby()
  if (!target) return
  if (target.kind === 'npc') void talk(target.id as NpcId)
  else update({ panel: 'transport', stop: target.id as keyof typeof PLACES })
  audio.play('click')
}
export async function talk(npc: NpcId) {
  const state = game.state
  if (
    state.dialogue ||
    distance(state.position, npcPoses.get(npc) ?? npcPosition(npc)) > 4
  )
    return
  const requestId = crypto.randomUUID()
  const sessionId = state.sessionId
  const activity = npcActivity(npc, city.state)
  game.setState((s) => ({
    ...s,
    dialogue: {
      npc,
      requestId,
      openedAt: new Date().toISOString(),
      activity: { id: activity.id, text: activity.text },
      history: cachedHistory(npc),
      earlierCount: cachedHistory(npc).length,
      thinking: true,
      source: null,
    },
    world: { ...s.world, talkedTo: [...new Set([...s.world.talkedTo, npc])] },
    pending: [...s.pending, { type: 'talk', npcId: npc }],
  }))
  if (state.guestStatus === 'online') {
    await fetchHistory(npc).catch(() => {})
    if (
      game.state.sessionId !== sessionId ||
      game.state.dialogue?.requestId !== requestId
    )
      return
    update({
      dialogue: {
        ...game.state.dialogue,
        history: cachedHistory(npc),
        earlierCount: cachedHistory(npc).length,
      },
    })
  }
  await converse('', 'open', true)
}
export const chat = (text: string, recording?: Blob) =>
  converse(text, 'chat', false, recording)
export const askMilestone = () => converse('', 'milestone')
export async function giveItem() {
  const state = game.state
  const { dialogue } = state
  if (!dialogue || dialogue.thinking) return
  const { delivery } = dialogueQuests(state, dialogue.npc)
  if (delivery) {
    game.setState((current) => deliver(current, delivery.itemId, dialogue.npc))
    audio.play('pickup')
    const fragile = (FRAGILE_ITEM_IDS as readonly string[]).includes(
      delivery.itemId
    )
    if (fragile) {
      const { care } = carryStore.state
      // Show the authored reaction immediately so it lands offline too, then
      // let a live NPC react to the care level through the prompt.
      notify(reactionFor(care))
      resetCarry()
      await converse(
        m.carry_prompt_deliver_care({
          item: itemLabel(delivery.itemId),
          care: carePhrase(care),
        }),
        'chat'
      )
      return
    }
    await converse(
      m.prompt_deliver({ item: itemLabel(delivery.itemId) }),
      'chat'
    )
    return
  }
}
export function board(to: keyof typeof PLACES, mode: TravelMode) {
  const state = game.state
  const fare = MODES[mode].fare
  if (state.ride || to === state.stop) return
  if (state.world.currency < fare) {
    notify(m.toast_not_enough_coins())
    return
  }
  const event = { type: 'spend', amount: fare, mode } as const
  update({
    ride: { from: state.stop, to, mode, progress: 0 },
    panel: 'none',
    dialogue: null,
    world: { ...state.world, currency: state.world.currency - fare },
    // Advance locally like buyMarketItem, so `spent` and a cyclo riddle reveal
    // show before the next NPC turn instead of waiting for the server.
    quests: advanceQuests(state.quests, [event]),
    pending: [...state.pending, event],
  })
  audio.play('board')
}
