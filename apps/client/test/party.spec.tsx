import { DEMO_QUEST, type PartySnapshot, TEAM_QUEST } from '@saigon/shared'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearExpiredInvite,
  completedQuest,
  handlePartyMessage,
  teamObjective,
} from '../src/net/party'
import { net, updateNet } from '../src/net/status'
import { grantQuest, initialState } from '../src/state/game'
import { Conversation } from '../src/ui/dialogue'
import { PartyInviteControls } from '../src/ui/party'
import { RewardPanel } from '../src/ui/reward'

const self = '11111111-1111-4111-8111-111111111111'
const other = '22222222-2222-4222-8222-222222222222'
const party = (): PartySnapshot => ({
  id: self,
  members: [
    { id: self, name: 'Sóc Nắng', color: '#ffeeaa' },
    { id: other, name: 'Mây', color: '#aaffee' },
  ],
  quest: {
    id: 'hoa-team-lunch',
    assignments: [
      { playerId: self, name: 'Sóc Nắng', dish: 'noodles', delivered: false },
      { playerId: other, name: 'Mây', dish: 'broth', delivered: false },
    ],
    completed: false,
  },
})
beforeEach(() =>
  updateNet({
    party: null,
    invite: null,
    selfId: self,
    connection: 'connected',
  })
)

describe('co-op client state and controls', () => {
  it('explains assigned dish, waiting, and check steps', () => {
    const value = party()
    expect(teamObjective(value, self)).toMatchObject({
      hint: expect.stringContaining('noodles'),
      progress: '0/2 dishes delivered',
    })
    if (!value.quest) throw new Error('missing fixture quest')
    value.quest.assignments[0].delivered = true
    expect(teamObjective(value, self)?.hint).toContain('Cheer')
    value.quest.assignments[1].delivered = true
    expect(teamObjective(value, self)?.hint).toContain('Check team errand')
    value.quest.completed = true
    expect(teamObjective(value, self)).toBeNull()
  })
  it('shows authoritative team rewards once, preserves solo, and exits pause', () => {
    const state = {
      ...grantQuest(initialState(), DEMO_QUEST),
      screen: 'paused' as const,
      panel: 'settings' as const,
    }
    const message = {
      type: 'quest-completed' as const,
      revision: 0,
      quest: TEAM_QUEST,
      world: {
        ...state.world,
        currency: 70,
        inventory: { herbs: 1, photo: 1 },
        completedQuestIds: [TEAM_QUEST.id],
      },
      completed: [TEAM_QUEST],
      reputation: 2,
    }
    const result = completedQuest(state, message)
    expect(result.quest).toEqual(DEMO_QUEST)
    expect(result).toMatchObject({
      screen: 'playing',
      panel: 'reward',
      reward: 40,
      reputation: 2,
    })
    const markup = renderToStaticMarkup(<RewardPanel state={result} />)
    expect(markup).toContain('group photo')
    expect(markup).not.toContain('The herbs made it')
    expect(completedQuest({ ...result, panel: 'none' }, message).panel).toBe(
      'none'
    )
    expect(result.world.currency).toBe(70)
  })
  it('offers solo herbs after completing only the team errand', () => {
    const state = {
      ...initialState(),
      completed: [TEAM_QUEST],
      world: { ...initialState().world, completedQuestIds: [TEAM_QUEST.id] },
      dialogue: {
        npc: 'hoa' as const,
        requestId: 'turn',
        history: [],
        thinking: false,
        source: null,
      },
    }
    expect(renderToStaticMarkup(<Conversation state={state} />)).toContain(
      'Help Cô Hoa'
    )
  })
  it('handles invites and expiry with accessible response controls', () => {
    handlePartyMessage({
      type: 'party-invited',
      inviteId: other,
      fromId: other,
      fromName: 'Mây',
      expiresAt: Date.now() + 30000,
    })
    const markup = renderToStaticMarkup(<PartyInviteControls />)
    expect(markup).toContain('Accept invite')
    expect(markup).toContain('Decline invite')
    clearExpiredInvite(Date.now() + 31000)
    expect(net.state.invite).toBeNull()
    handlePartyMessage({ type: 'party', party: party() })
    expect(net.state.party?.members).toHaveLength(2)
    handlePartyMessage({ type: 'party', party: null })
    expect(net.state.party).toBeNull()
  })
})

describe('reward save ordering', () => {
  const completion = {
    type: 'quest-completed' as const,
    revision: 4,
    quest: TEAM_QUEST,
    world: {
      ...initialState().world,
      currency: 70,
      completedQuestIds: [TEAM_QUEST.id],
    },
    completed: [TEAM_QUEST],
    reputation: 2,
  }
  it('does not reopen an already completed reward after a different reward was displayed', () => {
    const state = {
      ...initialState(),
      completed: [TEAM_QUEST],
      rewardQuest: DEMO_QUEST,
    }
    const result = completedQuest(state, completion)
    expect(result.panel).toBe('none')
    expect(result.rewardQuest).toEqual(DEMO_QUEST)
    expect(result.world.currency).toBe(70)
  })
  it('ignores a stale completion push entirely', () => {
    const state = { ...initialState(), serverRevision: 5 }
    expect(completedQuest(state, completion)).toBe(state)
  })
})
