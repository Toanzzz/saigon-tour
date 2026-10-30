import { NPCS, type NpcId, objectiveSatisfied } from '@saigon/shared'
import { audio } from '../audio'
import { agent, queryClient } from '../net/agent'
import {
  game,
  grantQuest,
  grantReward,
  initialState,
  notify,
  update,
} from '../state/game'
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
export function restart() {
  const state = game.state
  audio.setPaused(false)
  game.setState(() => ({
    ...initialState(state.generation + 1),
    screen: 'playing',
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
  if (game.state.dialogue?.thinking) {
    update({ dialogue: null, panel: 'none' })
  } else update({ dialogue: null, panel: 'none' })
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
function body(npc: NpcId) {
  return {
    sessionId: game.state.sessionId,
    personaId: npc,
    worldState: game.state.world,
  }
}
async function mutate<T>(fn: () => Promise<T>) {
  return queryClient
    .getMutationCache()
    .build(queryClient, { mutationFn: fn })
    .execute(undefined)
}
export async function talk(npc: NpcId) {
  const state = game.state
  if (state.dialogue || distance(state.position, PEOPLE[npc].at) > 4) return
  game.setState((s) => ({
    ...s,
    dialogue: { npc, history: [], thinking: true, source: null },
    world: { ...s.world, talkedTo: [...new Set([...s.world.talkedTo, npc])] },
  }))
  await chat('Chào bạn! What is happening in the neighborhood?', true)
}
export async function chat(text: string, opening = false) {
  const dialog = game.state.dialogue
  if (!dialog || (!opening && dialog.thinking) || !text.trim()) return
  const session = game.state.sessionId
  const history = opening
    ? dialog.history
    : [...dialog.history, { role: 'user' as const, content: text }]
  update({ dialogue: { ...dialog, history, thinking: true } })
  const result = await mutate(() =>
    agent.chat({
      ...body(dialog.npc),
      history: dialog.history.slice(-10),
      playerText: text.slice(0, 500),
    })
  )
  if (
    game.state.sessionId !== session ||
    game.state.dialogue?.npc !== dialog.npc
  )
    return
  update({
    source: result.source,
    dialogue: {
      ...dialog,
      thinking: false,
      source: result.source,
      history: [
        ...history,
        { role: 'assistant' as const, content: result.reply },
      ].slice(-12),
    },
  })
}
export async function acceptQuest() {
  const dialog = game.state.dialogue
  if (!dialog || dialog.thinking || game.state.quest) return
  const session = game.state.sessionId
  update({ dialogue: { ...dialog, thinking: true } })
  const result = await mutate(() =>
    agent.quest({
      ...body(dialog.npc),
      context: 'I would love to help a neighbor. Offer a short errand.',
      history: dialog.history,
    })
  )
  if (
    game.state.sessionId !== session ||
    game.state.dialogue?.npc !== dialog.npc
  )
    return
  game.setState((s) => ({
    ...grantQuest(s, result.quest),
    source: result.source,
    dialogue: {
      ...dialog,
      thinking: false,
      source: result.source,
      history: [
        ...dialog.history,
        { role: 'assistant' as const, content: result.line },
      ].slice(-12),
    },
  }))
  audio.play('pickup')
  notify('Fresh herbs tucked into your bag')
}
export async function deliverOrVerify() {
  const s = game.state
  const { quest, dialogue } = s
  if (!quest || !dialogue || dialogue.thinking) return
  const objective = quest.objective
  if (
    objective.type === 'DELIVER' &&
    objective.npcId === dialogue.npc &&
    (s.world.inventory[objective.itemId] ?? 0) > 0
  ) {
    game.setState((state) => ({
      ...state,
      world: {
        ...state.world,
        inventory: {
          ...state.world.inventory,
          [objective.itemId]:
            (state.world.inventory[objective.itemId] ?? 1) - 1,
        },
        deliveredItems: [
          ...new Set([
            ...state.world.deliveredItems,
            `${objective.itemId}:${dialogue.npc}`,
          ]),
        ],
      },
    }))
    audio.play('pickup')
  }
  update({ dialogue: { ...dialogue, thinking: true } })
  const result = await mutate(() =>
    agent.verify({
      ...body(quest.giverNpcId),
      quest,
      playerClaim: 'Please check my errand.',
    })
  )
  if (game.state.sessionId !== s.sessionId || game.state.quest?.id !== quest.id)
    return
  if (
    result.status === 'COMPLETE' &&
    objectiveSatisfied(quest, game.state.world)
  ) {
    game.setState((state) =>
      grantReward(state, { ...quest, reward: result.reward })
    )
    audio.play('reward')
  } else if (game.state.dialogue?.npc === dialogue.npc) {
    update({
      dialogue: {
        ...dialogue,
        thinking: false,
        history: [
          ...dialogue.history,
          { role: 'assistant' as const, content: result.line },
        ].slice(-12),
      },
    })
  }
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
  })
  audio.play('board')
}
