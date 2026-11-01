import { useSelector } from '@tanstack/react-store'
import { useEffect, useState } from 'react'
import { m } from '@/shared/i18n'
import { type GameState, trackedQuest, update } from '@/shared/state/game'
import { questHint } from '@/shared/state/quests'
import { twistSignal } from '@/shared/state/twists'
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
            : quest
              ? m.objective_needs_hand()
              : m.objective_memory()}
        </span>
        <strong>{quest?.title ?? m.map_title()}</strong>
        <span className="objective-hint">
          {quest ? questHint(quest) : m.objective_say_hello()}
        </span>
      </span>
      <Icon name={quest ? 'leaf' : 'book'} size={22} />
    </button>
  )
}
