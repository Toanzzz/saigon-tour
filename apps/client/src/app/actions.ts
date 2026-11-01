import { MARKET_ITEMS, type MarketItemId, type NpcId } from '@saigon/shared'
import { converse, deliver } from '@/features/conversation/converse'
import { npcPosition } from '@/shared/api/city'
import {
  beginHttpTurn,
  endHttpTurn,
  resetEventSequence,
} from '@/shared/api/events'
import { cachedHistory, fetchHistory } from '@/shared/api/history'
import { clearPersistedQueries, queryClient } from '@/shared/api/query'
import { guestState, resetSession, signOut } from '@/shared/api/session'
import { audio } from '@/shared/audio'
import { itemLabel, m, marketItemLabel, npcLabel } from '@/shared/i18n'
import {
  advanceQuests,
  game,
  initialState,
  notify,
  update,
} from '@/shared/state/game'
import { dialogueQuests } from '@/shared/state/quests'
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
  if (state.guestStatus === 'resetting') return
  const acquired = await beginHttpTurn()
  if (!acquired) {
    notify(m.toast_wait_conversation())
    return
  }
  update({ guestStatus: 'resetting' })
  let player = null
  try {
    player = await resetSession()
  } catch {
    endHttpTurn()
    update({ guestStatus: state.guestStatus })
    notify(m.toast_reset_failed())
    return
  }
  queryClient.removeQueries({ queryKey: ['npc-history'] })
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
export function buyMarketItem(itemId: MarketItemId) {
  const state = game.state
  const item = MARKET_ITEMS[itemId]
  if (
    state.world.locationId !== 'market' ||
    (state.world.inventory[itemId] ?? 0) >= 100
  )
    return
  if (state.world.currency < item.price) {
    notify(
      m.toast_need_coins({ count: item.price, item: marketItemLabel(itemId) })
    )
    return
  }
  update({
    panel: 'market',
    world: {
      ...state.world,
      currency: state.world.currency - item.price,
      inventory: {
        ...state.world.inventory,
        [itemId]: (state.world.inventory[itemId] ?? 0) + 1,
      },
    },
    quests: advanceQuests(state.quests, [{ type: 'purchase', itemId }]),
    pending: [...state.pending, { type: 'purchase', itemId }],
  })
  audio.play('pickup')
  notify(m.toast_added_to_bag({ item: marketItemLabel(itemId) }))
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
  if (state.dialogue || distance(state.position, npcPosition(npc)) > 4) return
  game.setState((s) => ({
    ...s,
    dialogue: {
      npc,
      requestId: crypto.randomUUID(),
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
    if (game.state.dialogue?.npc !== npc) return
    update({
      dialogue: {
        ...game.state.dialogue,
        history: cachedHistory(npc),
        earlierCount: cachedHistory(npc).length,
      },
    })
  }
  await converse('', 'greet', true)
}
export const chat = (text: string) => converse(text, 'chat')
export async function giveItem() {
  const state = game.state
  const { dialogue } = state
  if (!dialogue || dialogue.thinking) return
  const { delivery } = dialogueQuests(state, dialogue.npc)
  if (delivery) {
    game.setState((current) => deliver(current, delivery.itemId, dialogue.npc))
    audio.play('pickup')
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
  update({
    ride: { from: state.stop, to, mode, progress: 0 },
    panel: 'none',
    dialogue: null,
    world: { ...state.world, currency: state.world.currency - fare },
    pending: [...state.pending, { type: 'spend', amount: fare }],
  })
  audio.play('board')
}
