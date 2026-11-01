import { m } from '@/shared/i18n'
import { type GameState, trackedQuest, update } from '@/shared/state/game'
import { questHint } from '@/shared/state/quests'
import { Icon } from '@/shared/ui/icons'

export function Objective({ state }: { state: GameState }) {
  const quest = trackedQuest(state)
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
          {quest ? m.objective_needs_hand() : m.objective_memory()}
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
