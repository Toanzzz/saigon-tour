import { close } from '@/app/actions'
import { NewJourneyButton } from '@/app/title-journey'
import { rewardCopy } from '@/shared/api/party'
import type { GameState } from '@/shared/state/game'
import { Dialog } from '@/shared/ui/dialog'
import { Icon } from '@/shared/ui/icons'

export function RewardPanel({ state }: { state: GameState }) {
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
        aria-label={`${state.rewardQuest?.reward.itemId ?? 'Neighborhood keepsake'} earned`}
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
          {state.rewardQuest?.reward.itemId ?? 'A new friend'} · +
          {state.rewardQuest?.reward.reputation ?? 0} reputation
        </span>
      </div>
      <button type="button" className="primary-button wide" onClick={close}>
        Continue exploring
      </button>
      <NewJourneyButton className="restart-button" />
    </Dialog>
  )
}
