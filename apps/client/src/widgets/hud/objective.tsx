import { isRevealed } from '@saigon/shared'
import { useSelector } from '@tanstack/react-store'
import { useEffect, useState } from 'react'
import { m } from '@/shared/i18n'
import { type GameState, trackedQuest, update } from '@/shared/state/game'
import { questHint } from '@/shared/state/quests'
import { riddleClock } from '@/shared/state/riddles'
import { twistSignal } from '@/shared/state/twists'
import { clock } from '@/shared/state/ui'
import { Icon } from '@/shared/ui/icons'

const TWIST_EYEBROW_MS = 6000

/** True for 6 s after the latest twist fires, so the eyebrow can flag it. */
function useRecentTwist(): boolean {
  const at = useSelector(twistSignal, (signal) => signal.at)
  const [recent, setRecent] = useState(false)
  useEffect(() => {
    if (!at) return
    setRecent(true)
    const timer = setTimeout(() => setRecent(false), TWIST_EYEBROW_MS)
    return () => clearTimeout(timer)
  }, [at])
  return recent
}

export function Objective({ state }: { state: GameState }) {
  const quest = trackedQuest(state)
  const twisted = useRecentTwist()
  const now = useSelector(clock, (value) => value.now)
  const riddling = Boolean(quest?.riddle) && !!quest && !isRevealed(quest, now)
  return (
    <button
      type="button"
      className="objective-note"
      aria-label={m.objective_open_journal()}
      onClick={() => update({ panel: 'journal' })}
    >
      <span className="objective-rule" />
      <span>
        <span className="eyebrow">
          {twisted
            ? m.twist_eyebrow()
            : riddling
              ? m.riddle_eyebrow()
              : quest
                ? m.objective_needs_hand()
                : m.objective_memory()}
        </span>
        <strong>{quest?.title ?? m.map_title()}</strong>
        <span className="objective-hint">
          {quest ? questHint(quest) : m.objective_say_hello()}
        </span>
        {riddling && quest && (
          <span className="objective-riddle-options">
            {m.riddle_options({ time: riddleClock(quest, now) })}
          </span>
        )}
      </span>
      <span className="objective-riddle-mark" aria-hidden="true">
        {riddling ? '?' : null}
      </span>
      <Icon name={quest ? 'leaf' : 'book'} size={22} />
    </button>
  )
}
