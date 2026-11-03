import type { PartySnapshot } from '@saigon/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it } from 'vitest'
import { Conversation } from '@/features/conversation/conversation'
import { RewardPanel } from '@/features/postcard/reward'
import {
  clearExpiredInvite,
  completedQuest,
  handlePartyMessage,
} from '@/shared/api/party'
import { net, updateNet } from '@/shared/api/status'
import { grantQuest, initialState } from '@/shared/state/game'
import { PartyInviteControls } from '@/widgets/hud/party'
import { completedFixture, questFixture } from './quest-fixture'

const self = '11111111-1111-4111-8111-111111111111'
const other = '22222222-2222-4222-8222-222222222222'
const solo = questFixture()
const finished = {
  ...questFixture('mai'),
  status: 'completed' as const,
  scope: 'party' as const,
  party: { id: self, memberIds: [self, other] },
}
const summary = completedFixture(finished)
const party = (): PartySnapshot => ({
  id: self,
  members: [
    { id: self, name: 'Sóc Nắng', color: '#ffeeaa' },
    { id: other, name: 'Mây', color: '#aaffee' },
  ],
})
beforeEach(() =>
  updateNet({
    party: null,
    invite: null,
    selfId: self,
    connection: 'connected',
  })
)
const completion = () => ({
  type: 'quest-completed' as const,
  friendship: {},
  revision: 4,
  quest: finished,
  quests: [solo],
  world: {
    ...initialState().world,
    currency: 70,
    inventory: { herbs: 1 },
    completedQuestIds: [finished.id],
  },
  completed: [summary],
  reputation: finished.reward.reputation,
  unlocks: { owned: [], equipped: {} },
})
describe('party controls and authoritative quest rewards', () => {
  it('applies rewards once, preserves active quests, and exits pause', () => {
    const state = {
      ...grantQuest(initialState(), solo),
      screen: 'paused' as const,
      panel: 'settings' as const,
    }
    const result = completedQuest(state, completion())
    expect(result.quests).toEqual([solo])
    expect(result).toMatchObject({
      screen: 'playing',
      panel: 'reward',
      reward: finished.reward.currency,
    })
    expect(
      renderToStaticMarkup(
        <QueryClientProvider client={new QueryClient()}>
          <RewardPanel state={result} />
        </QueryClientProvider>
      )
    ).toContain(
      // The reward card now quotes the giver's payoff when present.
      finished.title
    )
    expect(
      completedQuest({ ...result, panel: 'none' }, completion()).panel
    ).toBe('none')
  })
  it('keeps contextual conversation guidance available after a completed quest', () => {
    const state = {
      ...initialState(),
      completed: [summary],
      dialogue: {
        npc: 'hoa' as const,
        requestId: 'turn',
        history: [],
        thinking: false,
        source: null,
      },
    }
    expect(
      renderToStaticMarkup(
        <QueryClientProvider client={new QueryClient()}>
          <Conversation state={state} />
        </QueryClientProvider>
      )
    ).toContain('Ask Ms. Hoa about the bowls being prepared.')
  })
  it('handles invites, expiry, and presence membership', () => {
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
  it('does not reopen a completed reward after another reward was displayed', () => {
    const state = { ...initialState(), completed: [summary], rewardQuest: solo }
    const result = completedQuest(state, completion())
    expect(result.panel).toBe('none')
    expect(result.rewardQuest).toEqual(solo)
    expect(result.world.currency).toBe(70)
  })
  it('ignores stale completion pushes', () => {
    const state = { ...initialState(), serverRevision: 5 }
    expect(completedQuest(state, completion())).toBe(state)
  })
  it('shows all rewards from a batch even when individual socket pushes share a save revision', () => {
    const second = {
      ...questFixture('mai', 'q_test_mai_second'),
      steps: [{ type: 'GO_TO' as const, locationId: 'postoffice' as const }],
      status: 'completed' as const,
      scope: 'party' as const,
      party: { id: self, memberIds: [self, other] },
    }
    const message = {
      ...completion(),
      quests: [],
      completed: [summary, completedFixture(second)],
      world: {
        ...completion().world,
        currency: 30 + finished.reward.currency + second.reward.currency,
        completedQuestIds: [finished.id, second.id],
      },
    }
    const firstPush = completedQuest(initialState(), message)
    const secondPush = completedQuest(firstPush, { ...message, quest: second })
    expect(secondPush.reward).toBe(finished.reward.currency)
    expect(secondPush.rewardQueue.map((quest) => quest.id)).toEqual([
      finished.id,
      second.id,
    ])
    expect(secondPush.completed).toHaveLength(2)
  })
  it('replays pending delivery progress after an unrelated reward push', () => {
    const state = {
      ...grantQuest(initialState(), solo),
      pending: [
        {
          type: 'deliver' as const,
          itemId: 'herbs' as const,
          npcId: 'linh' as const,
        },
      ],
    }
    const result = completedQuest(state, completion())
    expect(result.world.inventory.herbs).toBe(0)
    expect(result.quests[0]?.status).toBe('ready')
  })
})
