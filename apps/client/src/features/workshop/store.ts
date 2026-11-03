import {
  type AvatarBody,
  advance,
  bonusCurrency,
  completionBonus,
  createQuest,
  GIVER_UNLOCKS,
  type Locale,
  type Look,
  milestoneSeeds,
  type NpcId,
  type PlayerEvent,
  type Quest,
  seedsFor,
  UNLOCKS,
  type UnlockSlot,
} from '@saigon/shared'
import { Store } from '@tanstack/store'
import { getLocale, overwriteGetLocale } from '@/paraglide/runtime'
import { locale as localeStore } from '@/shared/i18n/locale'

export type Phase = 'offered' | 'active' | 'ready' | 'completed'
export type Fixture = 'authored' | 'generated' | 'legacy' | 'party' | 'multiple'
export type Gait = 'idle' | 'walk' | 'sprint' | 'sit'
export type View = 'front' | 'side' | 'back'
export interface WorkshopState {
  npc: NpcId
  seed: number
  locale: Locale
  phase: Phase
  fixture: Fixture
  friendship: number
  owned: boolean
  body: AvatarBody
  look: Look
  animation: Gait
  view: View
  frozen: boolean
  bounds: boolean
  anchors: boolean
  selected: string
  quest: Quest
  receipts: Quest[]
}
export const inspectorSeeds = (npc: NpcId, locale: Locale) => [
  ...seedsFor(npc, locale),
  ...milestoneSeeds(npc, locale),
]

/** Use the engine for fixture progression so twists and riddle reveals agree. */
function advanceNext(quest: Quest): Quest {
  const step = quest.steps.find((_, index) => !quest.progress[index])
  if (!step) return quest
  let event: PlayerEvent
  switch (step.type) {
    case 'GO_TO':
      event = { type: 'visit', locationId: step.locationId }
      break
    case 'TALK_TO':
      event = { type: 'talk', npcId: step.npcId }
      break
    case 'BUY':
      event = { type: 'purchase', itemId: step.marketItemId }
      break
    default:
      event = { type: 'deliver', itemId: step.itemId, npcId: step.npcId }
  }
  return advance(quest, event)
}

function readyQuest(quest: Quest): Quest {
  let current = quest
  for (let index = 0; index < quest.steps.length; index++) {
    if (current.status !== 'active') break
    current = advanceNext(current)
  }
  return current
}

function completeQuest(quest: Quest): Quest {
  if (quest.status === 'completed') return quest
  const ready = readyQuest(quest)
  const bonus = completionBonus(ready)
  return {
    ...ready,
    status: 'completed',
    reward: {
      ...ready.reward,
      bonus,
      currency: Math.min(100, ready.reward.currency + bonusCurrency(bonus)),
    },
  }
}

function buildQuest(
  state: Pick<
    WorkshopState,
    'npc' | 'seed' | 'locale' | 'friendship' | 'owned' | 'fixture' | 'phase'
  >
): Quest {
  const seeds = inspectorSeeds(state.npc, state.locale)
  const spec = seeds[state.seed] ?? seeds[0]
  let quest = createQuest(
    spec,
    `q_preview_${state.npc}_${state.seed}`,
    Date.now(),
    {
      owned: state.owned ? Object.keys(UNLOCKS) : [],
      promised: [],
      friendship: state.friendship,
    }
  )
  if (state.fixture === 'legacy' || state.fixture === 'generated')
    delete quest.payoff
  if (state.fixture === 'party') {
    quest.scope = 'party'
    quest.party = {
      id: '00000000-0000-4000-8000-000000000001',
      memberIds: [
        '00000000-0000-4000-8000-000000000002',
        '00000000-0000-4000-8000-000000000003',
      ],
    }
  }
  if (state.phase === 'active' && quest.steps.length > 1) {
    quest = advanceNext(quest)
  } else if (state.phase === 'ready' || state.phase === 'completed') {
    quest = readyQuest(quest)
  }
  if (state.phase === 'completed') quest = completeQuest(quest)
  return quest
}
function initialWorkshop(): WorkshopState {
  const state = {
    npc: 'hoa' as NpcId,
    seed: 0,
    locale: 'en' as Locale,
    phase: 'offered' as Phase,
    fixture: 'authored' as Fixture,
    friendship: 0,
    owned: false,
    body: 'man' as AvatarBody,
    look: {},
    animation: 'idle' as Gait,
    view: 'front' as View,
    frozen: false,
    bounds: false,
    anchors: false,
    selected: GIVER_UNLOCKS.hoa[0],
    receipts: [],
  }
  return { ...state, quest: buildQuest(state) }
}
export const workshop = new Store<WorkshopState>(initialWorkshop())
export function resetWorkshop() {
  workshop.setState(() => initialWorkshop())
}
export const inspectWardrobe = (patch: Partial<WorkshopState>) =>
  workshop.setState((state) => ({ ...state, ...patch }))
export function inspectQuest(patch: Partial<WorkshopState>) {
  workshop.setState((state) => {
    const next = { ...state, ...patch, receipts: [] }
    return { ...next, quest: buildQuest(next) }
  })
}
export function workshopLocale(locale: Locale) {
  inspectQuest({ locale })
  localeStore.setState(() => locale)
}
export function equipPreview(slot: UnlockSlot, id: string | null) {
  workshop.setState((state) => {
    const look = { ...state.look }
    if (id) look[slot] = id
    else delete look[slot]
    return { ...state, look, selected: id ?? state.selected }
  })
}
export function advancePreview() {
  const quest = workshop.state.quest
  if (quest.status !== 'active') return
  const next = advanceNext(quest)
  inspectWardrobe({
    quest: next,
    phase: next.status === 'ready' ? 'ready' : 'active',
  })
}
export function replayCompletion() {
  const state = workshop.state
  const quest = completeQuest(state.quest)
  const receipts =
    state.fixture === 'multiple'
      ? [
          quest,
          {
            ...quest,
            id: `${quest.id}_second`,
            reward: { ...quest.reward, currency: 20, unlockId: undefined },
          },
        ]
      : [quest]
  inspectWardrobe({ receipts, phase: 'completed', quest })
}
export function nextPreviewCompletion() {
  inspectWardrobe({ receipts: workshop.state.receipts.slice(1) })
}
export function initializeWorkshop() {
  const language = getLocale()
  resetWorkshop()
  inspectQuest({ locale: language })
  // This module loads only in an isolated development page. Locale selection
  // stays in its store rather than the normal persisted settings strategy.
  overwriteGetLocale(() => workshop.state.locale)
  const params = new URLSearchParams(location.search)
  const body = params.get('body') === 'woman' ? 'woman' : 'man'
  const id = params.get('item')
  inspectWardrobe({
    body,
    frozen: params.has('capture'),
    view:
      params.get('view') === 'side'
        ? 'side'
        : params.get('view') === 'back'
          ? 'back'
          : 'front',
  })
  if (id && UNLOCKS[id]) equipPreview(UNLOCKS[id].slot, id)
}
