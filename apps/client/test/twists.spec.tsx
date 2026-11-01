import { createQuest, type Quest, type QuestSpec } from '@saigon/shared'
import { QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { queryClient } from '@/shared/api/agent'
import { audio } from '@/shared/audio'
import { game, initialState, update } from '@/shared/state/game'
import { installTwists, resetTwists } from '@/shared/state/twists'
import { JournalPanel } from '@/widgets/hud/journal'

/** A two-step hoa arc whose final DELIVER step a twist rewrites to Vy. */
const arcSpec: QuestSpec = {
  giverNpcId: 'hoa',
  title: 'Twist arc',
  description: 'Talk to Mai, then deliver broth to Linh.',
  scope: 'solo',
  steps: [
    { type: 'TALK_TO', npcId: 'mai' },
    { type: 'DELIVER', itemId: 'broth', npcId: 'linh' },
  ],
  twist: {
    step: { type: 'DELIVER', itemId: 'broth', npcId: 'vy' },
    line: 'Mai: feed Vy instead.',
  },
}

/** A quest whose twist has already applied (final step rewritten, replaced set). */
function twistedQuest(id = 'q_twisted'): Quest {
  const quest = createQuest(arcSpec, id, Date.now())
  return {
    ...quest,
    progress: [true, false],
    steps: [quest.steps[0], arcSpec.twist?.step] as Quest['steps'],
    twist: {
      ...(quest.twist as NonNullable<Quest['twist']>),
      replaced: { type: 'DELIVER', itemId: 'broth', npcId: 'linh' },
    },
  }
}

describe('quest twist announcements', () => {
  let stop: () => void
  let play: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    game.setState(() => initialState())
    resetTwists()
    play = vi.spyOn(audio, 'play').mockImplementation(() => {})
    stop = installTwists()
  })
  afterEach(() => {
    stop()
    play.mockRestore()
  })

  it('fires the toast and pickup once per quest, even on a server replay', () => {
    const quest = twistedQuest()
    update({ quests: [quest] })
    expect(game.state.toast).toContain('feed Vy instead')
    expect(play).toHaveBeenCalledTimes(1)
    expect(play).toHaveBeenCalledWith('pickup')

    // A server replay re-sends the same already-twisted quest: no second fire.
    update({ quests: [{ ...quest }] })
    expect(play).toHaveBeenCalledTimes(1)
  })

  it('resetTwists lets a quest fire again after a restart', () => {
    const quest = twistedQuest()
    update({ quests: [quest] })
    expect(play).toHaveBeenCalledTimes(1)

    resetTwists()
    update({ quests: [] })
    update({ quests: [{ ...quest }] })
    expect(play).toHaveBeenCalledTimes(2)
  })

  it('renders the replaced step struck through in the journal', () => {
    const quest = twistedQuest()
    const state = { ...initialState(), quests: [quest] }
    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <JournalPanel state={state} />
      </QueryClientProvider>
    )
    // The replaced original step is struck through...
    expect(html).toContain('<s')
    expect(html).toContain('Linh')
    // ...and the twist line is shown.
    expect(html).toContain('feed Vy instead')
  })
})
