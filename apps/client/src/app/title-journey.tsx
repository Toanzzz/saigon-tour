import { useSelector } from '@tanstack/react-store'
import { useEffect, useState } from 'react'
import { audio } from '@/shared/audio'
import { type GameState, game, trackedQuest } from '@/shared/state/game'
import { PLACES } from '@/shared/world/places'
import { restart } from './actions'
import { commitPlayerName, TitleName } from './title-identity'

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

export function PlayingAs({
  name,
  onName,
}: {
  name: string
  onName: (name: string) => void
}) {
  const guestName = useSelector(game, (s) => s.guestName)
  const [editing, setEditing] = useState(false)
  if (editing) return <TitleName name={name} onName={onName} />
  return (
    <p className="title-playing-as">
      <span>
        Playing as <strong>{guestName}</strong>
      </span>
      <span aria-hidden="true">·</span>
      <button
        type="button"
        className="text-button"
        onClick={() => setEditing(true)}
      >
        Change
      </button>
    </p>
  )
}

export function NewJourneyButton({ name }: { name: string }) {
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
    if (await commitPlayerName(name)) await restart()
  }
  return (
    <button
      type="button"
      className="text-button title-new-journey"
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
