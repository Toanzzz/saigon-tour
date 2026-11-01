import { useSelector } from '@tanstack/react-store'
import { useEffect, useState } from 'react'
import { audio } from '@/shared/audio'
import { type GameState, game, trackedQuest } from '@/shared/state/game'
import { PLACES } from '@/shared/world/places'
import { restart } from './actions'

/** True once the saved guest has played: favors, quests, talks, or travel. */
export function hasJourney(state: GameState) {
  return (
    state.guestStatus !== 'loading' &&
    Boolean(
      state.completed.length ||
        state.quests.length ||
        state.world.talkedTo.length ||
        state.world.visitedLocations.length > 1
    )
  )
}

export function JourneySummary() {
  const parts = useSelector(game, (state) => {
    const done = state.completed.length
    const quest = trackedQuest(state)?.title
    const place = PLACES[state.world.locationId]?.name
    return [
      done ? `${done} ${done === 1 ? 'favor' : 'favors'} done` : '',
      quest ? `Helping with “${quest}”` : '',
      place ? `near ${place}` : '',
    ]
      .filter(Boolean)
      .join(' · ')
  })
  if (!parts) return null
  return <span className="title-summary">{parts}</span>
}

/** Two-tap reset: the first tap arms it, the second erases progress. */
export function NewJourneyButton({ className = '' }: { className?: string }) {
  const [confirming, setConfirming] = useState(false)
  const resetting = useSelector(game, (s) => s.guestStatus === 'resetting')
  useEffect(() => {
    if (!confirming) return
    const timer = setTimeout(() => setConfirming(false), 4000)
    return () => clearTimeout(timer)
  }, [confirming])
  const press = async () => {
    if (!confirming) return setConfirming(true)
    setConfirming(false)
    void audio.unlock()
    await restart()
  }
  return (
    <button
      type="button"
      className={`text-button new-journey ${className}`}
      data-confirming={confirming}
      disabled={resetting}
      onClick={press}
    >
      {resetting
        ? 'Starting fresh…'
        : confirming
          ? 'Tap again to erase progress'
          : 'Start a new journey'}
    </button>
  )
}
