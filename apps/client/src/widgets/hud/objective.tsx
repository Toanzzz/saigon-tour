import { useSelector } from '@tanstack/react-store'
import { teamObjective } from '@/shared/api/party'
import { net } from '@/shared/api/status'
import { type GameState, update } from '@/shared/state/game'
import { Icon } from '@/shared/ui/icons'

export function Objective({ state }: { state: GameState }) {
  const network = useSelector(net, (value) => value)
  const team = teamObjective(network.party, network.selfId)
  const quest = state.quest
  const delivered = state.world.deliveredItems.includes('herbs:linh')
  const hint = quest
    ? delivered
      ? 'Let Cô Hoa know the herbs arrived.'
      : 'Bring the herbs to Chị Linh in the park.'
    : state.completed.length
      ? 'Follow your curiosity. The city is yours.'
      : 'Say hello to Cô Hoa at the market stall.'
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
          {team
            ? 'A little teamwork'
            : quest
              ? 'A neighbor needs a hand'
              : state.completed.length
                ? 'Make another memory'
                : 'Your first little story'}
        </span>
        <strong>
          {team?.title ??
            quest?.title ??
            (state.completed.length
              ? 'Take the scenic route'
              : 'A warm welcome')}
        </strong>
        <span className="objective-hint">
          {team ? `${team.hint} ${team.progress}` : hint}
        </span>
      </span>
      <Icon name={quest ? 'leaf' : 'book'} size={22} />
    </button>
  )
}
