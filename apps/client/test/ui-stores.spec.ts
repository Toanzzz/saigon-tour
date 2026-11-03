import type { PresencePlayer } from '@saigon/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ownVoiceResource } from '@/features/voice/store'
import { clearPresence, recordPlayer } from '@/shared/api/presence'
import {
  presenceView,
  resetPresenceView,
  samplePresenceView,
} from '@/shared/api/presence-view'
import { game, initialState, update } from '@/shared/state/game'
import {
  armJourneyConfirm,
  chatDraft,
  journeyConfirm,
  nameDraft,
  resetUiStores,
  setChatText,
  setNameDraft,
  setTransportMode,
  setWardrobeTab,
  transportForm,
  wardrobeTab,
} from '@/shared/state/ui'
import { installUiResets } from '@/shared/state/ui-resets'

afterEach(() => {
  game.setState(() => initialState())
  resetUiStores()
  resetPresenceView()
  clearPresence()
})

it('cancels microphone ownership when a typed turn, close, pause, or reset begins', () => {
  const dialog = {
    npc: 'hoa' as const,
    requestId: 'voice-conversation',
    history: [],
    thinking: false,
    source: null,
  }
  game.setState(() => ({
    ...initialState(),
    screen: 'playing',
    dialogue: dialog,
  }))
  const stop = installUiResets()
  try {
    for (const patch of [
      { dialogue: { ...dialog, thinking: true } },
      { dialogue: null },
      { screen: 'paused' as const },
      { sessionId: crypto.randomUUID() },
    ]) {
      update({ screen: 'playing', dialogue: dialog })
      const cancel = vi.fn()
      ownVoiceResource(cancel)
      update(patch)
      expect(cancel).toHaveBeenCalledOnce()
    }
  } finally {
    stop()
  }
})

describe('resetUiStores', () => {
  it('clears every transient draft and toggle', () => {
    setNameDraft('Mai')
    setChatText('hello')
    setTransportMode('metro')
    setWardrobeTab('vehicle')
    armJourneyConfirm()
    resetUiStores()
    expect(nameDraft.state.name).toBe('')
    expect(chatDraft.state).toEqual({ text: '' })
    expect(transportForm.state).toEqual({ mode: 'bus', destination: 'park' })
    expect(wardrobeTab.state.slot).toBe('all')
    expect(journeyConfirm.state.armed).toBe(false)
  })
})

describe('installUiResets', () => {
  it('seeds the transport form from the current stop on open', () => {
    const stop = installUiResets()
    update({ stop: 'market', panel: 'transport' })
    expect(transportForm.state).toEqual({ mode: 'bus', destination: 'park' })
    stop()
  })

  it('clears the chat draft when the dialogue npc changes', () => {
    const stop = installUiResets()
    update({
      dialogue: {
        npc: 'hoa',
        requestId: 'a',
        history: [],
        thinking: false,
        source: null,
      },
    })
    setChatText('typing…')
    update({
      dialogue: {
        npc: 'mai',
        requestId: 'b',
        history: [],
        thinking: false,
        source: null,
      },
    })
    expect(chatDraft.state.text).toBe('')
    stop()
  })

  it('seeds the name draft when guestName changes', () => {
    const stop = installUiResets()
    update({ guestName: 'Linh' })
    expect(nameDraft.state.name).toBe('Linh')
    stop()
  })

  it('resets the wardrobe tab when the panel opens', () => {
    const stop = installUiResets()
    setWardrobeTab('vehicle')
    update({ panel: 'wardrobe' })
    expect(wardrobeTab.state.slot).toBe('all')
    stop()
  })
})

describe('journeyConfirm', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())
  it('auto-disarms after 4 seconds', () => {
    armJourneyConfirm()
    expect(journeyConfirm.state.armed).toBe(true)
    vi.advanceTimersByTime(3999)
    expect(journeyConfirm.state.armed).toBe(true)
    vi.advanceTimersByTime(1)
    expect(journeyConfirm.state.armed).toBe(false)
  })
})

describe('samplePresenceView', () => {
  const player = (id: string, x: number): PresencePlayer => ({
    id,
    name: id,
    body: 'man',
    color: '#fff',
    position: [x, 0, 0],
    heading: 0,
    ride: null,
    look: null,
  })
  it('writes a new nearest list only when ids change', () => {
    recordPlayer(player('a', 1), performance.now())
    samplePresenceView(8)
    const first = presenceView.state.nearest
    expect(first.map((value) => value.id)).toEqual(['a'])
    samplePresenceView(8)
    // No membership change → same reference (write-on-change).
    expect(presenceView.state.nearest).toBe(first)
    recordPlayer(player('b', 2), performance.now())
    samplePresenceView(8)
    expect(presenceView.state.nearest).not.toBe(first)
    expect(presenceView.state.nearest.map((value) => value.id).sort()).toEqual([
      'a',
      'b',
    ])
  })
})
