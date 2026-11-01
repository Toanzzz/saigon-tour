import { useSelector } from '@tanstack/react-store'
import { audio } from '@/shared/audio'
import { m } from '@/shared/i18n'
import { type GameState, game, trackedQuest } from '@/shared/state/game'
import {
  armJourneyConfirm,
  disarmJourneyConfirm,
  journeyConfirm,
} from '@/shared/state/ui'
import { placeName } from '@/shared/world/places'
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
    const place = placeName(state.world.locationId)
    return [
      done ? m.title_summary_favors({ count: done }) : '',
      quest ? m.title_summary_quest({ quest }) : '',
      place ? m.title_summary_place({ place }) : '',
    ]
      .filter(Boolean)
      .join(' · ')
  })
  if (!parts) return null
  return <span className="title-summary">{parts}</span>
}

/** Two-tap reset: the first tap arms it, the second erases progress. */
export function NewJourneyButton({ className = '' }: { className?: string }) {
  const confirming = useSelector(journeyConfirm, (s) => s.armed)
  const resetting = useSelector(game, (s) => s.guestStatus === 'resetting')
  const press = async () => {
    if (!confirming) return armJourneyConfirm()
    disarmJourneyConfirm()
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
        ? m.journey_resetting()
        : confirming
          ? m.journey_confirm()
          : m.journey_new()}
    </button>
  )
}
