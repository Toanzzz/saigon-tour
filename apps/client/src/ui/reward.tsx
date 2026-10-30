import { close, restart } from '../core/actions'
import { rewardCopy } from '../net/party'
import type { GameState } from '../state/game'
import { Dialog } from './dialog'
import { Icon } from './icons'

export function RewardPanel({ state }: { state: GameState }) {
  const team = state.rewardQuest?.id === 'hoa-team-lunch'
  return (
    <Dialog
      title="A little kindness goes far."
      eyebrow="A good day in Sài Gòn"
      onClose={close}
      className="reward-dialog"
    >
      <div
        className="postcard"
        role="img"
        aria-label={
          team ? 'Sài Gòn group photo earned' : 'Sài Gòn postcard earned'
        }
      >
        <span className="postcard-mark">Sài Gòn</span>
        <span>with love, from the neighborhood</span>
        <i className="postcard-stamp">
          <Icon name="star" size={28} />
        </i>
      </div>
      <p className="reward-copy">{rewardCopy(state.rewardQuest)}</p>
      <div className="reward-earned">
        <span>
          <Icon name="coin" />+{state.reward} coins
        </span>
        <span>
          <Icon name="star" />
          {team ? 'A group photo · +2 reputation' : 'A new friend'}
        </span>
      </div>
      <button type="button" className="primary-button wide" onClick={close}>
        Continue exploring
      </button>
      <button
        type="button"
        className="text-button restart-button"
        disabled={state.guestStatus === 'resetting'}
        onClick={restart}
      >
        Start a new journey
      </button>
    </Dialog>
  )
}
