import {
  type CitySnapshot,
  initialCity,
  NPC_ACTIVITIES,
  type NpcId,
  npcActivity,
  type Quest,
} from '@saigon/shared'
import { afterEach, describe, expect, it } from 'vitest'
import { conversationHint } from '@/features/conversation/hint'
import { changeLocale } from '@/shared/i18n'
import { type GameState, initialState } from '@/shared/state/game'

const setup = (npc: NpcId = 'commuter'): GameState => ({
  ...initialState(),
  friendship: { [npc]: { level: 0 } },
  dialogue: {
    npc,
    requestId: 'hint-encounter',
    earlierCount: 0,
    history: [],
    thinking: false,
    source: null,
    activity: npcActivity(npc),
  },
})
const quest = (patch: Partial<Quest> = {}): Quest => ({
  id: 'q_hint',
  giverNpcId: 'tam',
  title: 'Neighborhood delivery',
  description: 'Bring herbs to Linh.',
  steps: [{ type: 'DELIVER', npcId: 'linh', itemId: 'herbs' }],
  scope: 'solo',
  reward: { currency: 25, reputation: 1, itemId: null },
  progress: [false],
  status: 'active',
  createdAt: Date.now(),
  ...patch,
})
const now = 100_000
const hostingCity = (): CitySnapshot => ({
  ...initialCity(),
  needs: { tam: 'Untranslated generated need' },
  events: [
    {
      id: 'rush',
      kind: 'market-rush' as const,
      title: 'Untranslated generated title',
      description: 'A market rush.',
      locationId: 'market' as const,
      startedAt: now - 1000,
      endsAt: now + 1000,
    },
  ],
})

afterEach(() => changeLocale('en'))

describe('contextual conversation hints', () => {
  it('authors bilingual first and returning topics for every activity', () => {
    expect(Object.keys(NPC_ACTIVITIES)).toHaveLength(29)
    for (const catalog of Object.values(NPC_ACTIVITIES))
      for (const activity of Object.values(catalog)) {
        for (const locale of ['en', 'vi'] as const) {
          const { first, returning } = activity.conversationHints
          expect(first[locale]).toContain('{name}')
          expect(returning[locale]).toContain('{name}')
          expect(first[locale]).not.toEqual(returning[locale])
        }
      }
  })

  it('matches captured activity even after the live city activity changes', () => {
    const state = setup()
    const city = initialCity()
    city.npcActivities.commuter = {
      activityId: 'busy',
      startedAt: now - 1000,
      endsAt: now + 1000,
    }
    expect(conversationHint(state, city, now)).toBe(
      'Ask Tuan how the commute is going.'
    )
    if (!state.dialogue) throw new Error('Missing dialogue')
    state.dialogue.activity = npcActivity('commuter', city, now)
    expect(conversationHint(state, city, now)).toBe(
      'Check whether Tuan has a moment to chat.'
    )
    expect(conversationHint(state, city, now + 5000)).toBe(
      'Check whether Tuan has a moment to chat.'
    )
  })

  it('uses returning copy only for earlier history and hides after a current user message', () => {
    const state = setup()
    if (!state.dialogue) throw new Error('Missing dialogue')
    state.dialogue.history = [{ role: 'user', content: 'Earlier hello' }]
    state.dialogue.earlierCount = 1
    expect(conversationHint(state, initialCity())).toBe(
      'Catch up with Tuan about the neighborhood.'
    )
    state.dialogue.history.push({ role: 'assistant', content: 'An opener' })
    expect(conversationHint(state, initialCity())).toContain('Catch up')
    state.dialogue.history.push({ role: 'user', content: 'How is your day?' })
    expect(conversationHint(state, initialCity())).toBeNull()
    state.dialogue.source = 'fallback'
    expect(conversationHint(state, initialCity())).toBeNull()
    expect(conversationHint(initialState(), initialCity())).toBeNull()
  })

  it('falls back safely for unknown captured activity IDs and resolves missing captures', () => {
    const state = setup()
    if (!state.dialogue?.activity) throw new Error('Missing activity')
    for (const id of ['missing', 'constructor', '__proto__']) {
      state.dialogue.activity.id = id
      expect(conversationHint(state, initialCity())).toContain('commute')
    }
    state.dialogue.activity = undefined
    expect(conversationHint(state, initialCity())).toContain('commute')
  })

  it('keeps friendship guidance gentle before considering an event or need', () => {
    const state = setup('tam')
    for (const level of [-5, -3]) {
      state.friendship = { tam: { level } }
      expect(conversationHint(state, hostingCity(), now)).toContain(
        'gentle hello'
      )
    }
    for (const level of [-2, -1]) {
      state.friendship = { tam: { level } }
      expect(conversationHint(state, hostingCity(), now)).toContain(
        'Keep it light'
      )
    }
    for (const level of [0, 2, 5]) {
      state.friendship = { tam: { level } }
      expect(conversationHint(state, hostingCity(), now)).toContain(
        'market rush'
      )
    }
  })

  it('localizes confirmed hosting without exposing generated city text', () => {
    const state = setup('tam')
    expect(conversationHint(state, hostingCity(), now)).toContain(
      'the market rush'
    )
    changeLocale('vi')
    const hint = conversationHint(state, hostingCity(), now)
    expect(hint).toContain('giờ cao điểm ở chợ')
    expect(hint).not.toContain('Untranslated')
    expect(hint).not.toContain('market rush')
  })

  it('requires an active event at the NPC location and an explicit city need', () => {
    const state = setup('tam')
    const city = hostingCity()
    expect(conversationHint(state, city, now + 1000)).toContain('on their mind')
    expect(conversationHint(state, city, now - 2000)).toContain('on their mind')
    const event = city.events[0]
    if (!event) throw new Error('Missing event')
    event.locationId = 'park'
    expect(conversationHint(state, city, now)).toContain('on their mind')
    city.needs = {}
    expect(conversationHint(state, city, now)).toContain('getting around')
  })

  it('suppresses hints when quest or milestone cards provide guidance', () => {
    for (const status of ['active', 'ready'] as const) {
      const state = setup()
      state.quests = [quest({ giverNpcId: 'commuter', status })]
      expect(conversationHint(state, initialCity())).toBeNull()
    }
    const state = setup()
    state.quests = [quest({ steps: [{ type: 'TALK_TO', npcId: 'commuter' }] })]
    expect(conversationHint(state, initialCity())).toBeNull()
    state.quests = [
      quest({
        steps: [{ type: 'DELIVER', npcId: 'commuter', itemId: 'herbs' }],
      }),
    ]
    expect(conversationHint(state, initialCity())).toBeNull()
    expect(conversationHint(setup('mai'), initialCity())).toBeNull()
  })

  it('keeps social topics with a full journal instead of inviting another errand', () => {
    const state = setup('tam')
    state.quests = [0, 1, 2].map((id) =>
      quest({ id: `q_full_${id}`, giverNpcId: 'hoa' })
    )
    expect(conversationHint(state, hostingCity(), now)).toContain(
      'getting around'
    )
    expect(conversationHint(state, hostingCity(), now)).not.toContain('help')
  })

  it('switches locale without changing history, and stays stable across unrelated state updates', () => {
    const state = setup()
    const city = initialCity()
    const en = conversationHint(state, city)
    state.toast = 'Unrelated notification'
    expect(conversationHint(state, city)).toBe(en)
    changeLocale('vi')
    expect(conversationHint(state, city)).toBe(
      'Hỏi Tuấn hôm nay đi làm thế nào.'
    )
    expect(state.dialogue?.history).toEqual([])
  })
})
