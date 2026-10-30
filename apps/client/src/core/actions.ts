import { NPCS, type NpcId } from '@saigon/shared'
import { audio } from '../audio'
import { beginHttpTurn, endHttpTurn, resetEventSequence } from '../net/events'
import { guestState, resetSession } from '../net/session'
import { net } from '../net/status'
import { isXRPresenting } from '../platform/xr/store'
import { game, initialState, notify, update } from '../state/game'
import { converse, deliver } from './conversation'
import {
  distance,
  MODES,
  PEOPLE,
  PLACES,
  type Point,
  type TravelMode,
} from './places'

export function start() {
  update({ screen: 'playing' })
  void audio.unlock()
}
export async function restart() {
  const state = game.state
  if (state.guestStatus === 'resetting') return
  const acquired = await beginHttpTurn()
  if (!acquired) {
    notify(
      'Please wait for your current conversation to finish, then try again.'
    )
    return
  }
  update({ guestStatus: 'resetting' })
  let player = null
  try {
    player = await resetSession()
  } catch {
    endHttpTurn()
    update({ guestStatus: state.guestStatus })
    notify('Your saved journey could not be reset. Try again when connected.')
    return
  }
  resetEventSequence()
  audio.setPaused(false)
  game.setState(() => ({
    ...initialState(state.generation + 1),
    screen: 'playing',
    guestId: state.guestId,
    guestName: state.guestName,
    guestColor: state.guestColor,
    guestStatus: player ? 'online' : 'offline',
    returningGuest: state.returningGuest,
    ...(player ? guestState(player) : {}),
    muted: state.muted,
    volume: state.volume,
    reducedMotion: state.reducedMotion,
  }))
}
export function pause() {
  const paused = game.state.screen !== 'paused'
  update({ screen: paused ? 'paused' : 'playing' })
  audio.setPaused(paused)
}
export function close() {
  const { panel, hubShown } = game.state
  if (panel === 'reward' && !hubShown && !isXRPresenting()) {
    update({ dialogue: null, panel: 'none', screen: 'hub', hubShown: true })
    return
  }
  update({ dialogue: null, panel: 'none' })
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
export function nearby(
  position = game.state.position
): { kind: 'npc' | 'stop'; id: string; label: string; at: Point } | null {
  const targets = [
    ...Object.entries(PEOPLE).map(([id, value]) => ({
      kind: 'npc' as const,
      id,
      label: `Talk to ${NPCS[id as NpcId].name}`,
      at: value.at,
    })),
    ...Object.entries(PLACES).map(([id, value]) => ({
      kind: 'stop' as const,
      id,
      label: 'Choose a ride',
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
  if (state.dialogue || distance(state.position, PEOPLE[npc].at) > 4) return
  game.setState((s) => ({
    ...s,
    dialogue: {
      npc,
      requestId: crypto.randomUUID(),
      history: [],
      thinking: true,
      source: null,
    },
    world: { ...s.world, talkedTo: [...new Set([...s.world.talkedTo, npc])] },
    pending: [...s.pending, { type: 'talk', npcId: npc }],
  }))
  await converse(
    'Chào bạn! What is happening in the neighborhood?',
    'greet',
    true
  )
}
export const chat = (text: string) => converse(text, 'chat')
export async function teamErrand() {
  if (net.state.connection !== 'connected') return
  await converse('Can you offer or check our team lunch errand?', 'team')
}
export async function deliverTeamDish() {
  const { dialogue } = game.state
  const assignment = net.state.party?.quest?.assignments.find(
    (entry) => entry.playerId === net.state.selfId
  )
  if (
    dialogue?.npc !== 'linh' ||
    dialogue.thinking ||
    !assignment ||
    assignment.delivered ||
    net.state.connection !== 'connected'
  )
    return
  game.setState((state) => ({
    ...state,
    pending: [
      ...state.pending,
      { type: 'deliver', itemId: assignment.dish, npcId: 'linh' },
    ],
  }))
  await converse(`Here is the ${assignment.dish} for the team lunch!`, 'chat')
}
export async function acceptQuest() {
  const state = game.state
  if (!state.dialogue || state.dialogue.thinking || state.quest) return
  await converse('I would love to help. Do you have an errand for me?', 'help')
}
export async function deliverOrVerify() {
  const { quest, dialogue, world } = game.state
  if (!quest || !dialogue || dialogue.thinking) return
  const objective = quest.objective
  if (
    objective.type === 'DELIVER' &&
    objective.npcId === dialogue.npc &&
    (world.inventory[objective.itemId] ?? 0) > 0
  ) {
    game.setState((state) => deliver(state, objective.itemId, dialogue.npc))
    audio.play('pickup')
    await converse(`Here are the ${objective.itemId} from Cô Hoa!`, 'chat')
    return
  }
  await converse('I finished your errand. Can you check?', 'check')
}
export function board(to: keyof typeof PLACES, mode: TravelMode) {
  const state = game.state
  const fare = MODES[mode].fare
  if (state.ride || to === state.stop) return
  if (state.world.currency < fare) {
    notify('Not enough coins. The city is always free to explore on foot.')
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
