import { type GameState, trackedQuest, update } from '@/shared/state/game'
import { questHint } from '@/shared/state/quests'
import { Icon } from '@/shared/ui/icons'

export function Objective({ state }: { state: GameState }) {
  const quest = trackedQuest(state)
  return (
    <button
      type="button"
      className="objective-note"
      aria-label="Open travel journal"
      onClick={() => update({ panel: 'journal' })}
    >
      <span className="objective-rule" />
      <span>
        <span className="eyebrow">
          {quest ? 'A neighbor needs a hand' : 'Make another memory'}
        </span>
        <strong>{quest?.title ?? 'A city of small stories'}</strong>
        <span className="objective-hint">
          {quest
            ? questHint(quest)
            : 'Say hello to a neighbor and ask for an errand.'}
        </span>
      </span>
      <Icon name={quest ? 'leaf' : 'book'} size={22} />
    </button>
  )
}
