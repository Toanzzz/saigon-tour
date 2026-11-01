import { slotOf } from '@saigon/shared'
import { close } from '@/app/actions'
import { NewJourneyButton } from '@/app/title-journey'
import { NpcAvatar } from '@/features/conversation/npc-avatar'
import { rewardCopy } from '@/shared/api/party'
import { equipUnlock } from '@/shared/api/wardrobe'
import { itemLabel, m, unlockLabel } from '@/shared/i18n'
import type { GameState } from '@/shared/state/game'
import { CoinEmblem } from '@/shared/ui/coin-emblem'
import { Dialog } from '@/shared/ui/dialog'
import { Icon } from '@/shared/ui/icons'

export function RewardPanel({ state }: { state: GameState }) {
  return (
    <Dialog
      title={m.reward_title()}
      eyebrow={m.reward_eyebrow()}
      onClose={close}
      className="reward-dialog"
    >
      <div
        className="postcard"
        role="img"
        aria-label={m.reward_earned({
          item: state.rewardQuest?.reward.itemId
            ? itemLabel(state.rewardQuest.reward.itemId)
            : m.reward_keepsake(),
        })}
      >
        <span className="postcard-mark">Sài Gòn</span>
        <span>{m.reward_with_love()}</span>
        <i className="postcard-stamp">
          <Icon name="star" size={28} />
        </i>
      </div>
      {state.rewardQuest?.payoff ? (
        <blockquote className="reward-payoff">
          <NpcAvatar id={state.rewardQuest.giverNpcId} size="sm" />
          <span>{state.rewardQuest.payoff}</span>
        </blockquote>
      ) : (
        <p className="reward-copy">{rewardCopy(state.rewardQuest)}</p>
      )}
      <div className="reward-earned">
        <span className="reward-coin-row">
          <CoinEmblem size={88} />+{m.coins({ count: state.reward })}
        </span>
        <span>
          <Icon name="star" />
          {m.reward_item_reputation({
            item: state.rewardQuest?.reward.itemId
              ? itemLabel(state.rewardQuest.reward.itemId)
              : m.reward_new_friend(),
            reputation: state.rewardQuest?.reward.reputation ?? 0,
          })}
        </span>
      </div>
      {(state.rewardQuest?.reward.bonus?.thrifty ||
        state.rewardQuest?.reward.bonus?.sharp) && (
        <div className="reward-earned reward-bonus">
          {state.rewardQuest?.reward.bonus?.thrifty ? (
            <span>
              <Icon name="coin" />
              {m.reward_thrifty()}
            </span>
          ) : null}
          {state.rewardQuest?.reward.bonus?.sharp ? (
            <span>
              <Icon name="star" />
              {m.reward_sharp()}
            </span>
          ) : null}
        </div>
      )}
      {state.rewardQuest?.reward.unlockId && (
        <div className="reward-earned reward-unlock">
          <span>
            <Icon name="star" />
            {m.reward_unlock({
              item: unlockLabel(state.rewardQuest.reward.unlockId),
            })}
          </span>
        </div>
      )}
      {state.rewardQuest?.reward.unlockId && (
        <button
          type="button"
          className="primary-button wide reward-wear-now"
          onClick={() => {
            const id = state.rewardQuest?.reward.unlockId
            if (id) equipUnlock(slotOf(id), id)
            close()
          }}
        >
          {m.wardrobe_wear_now()}
        </button>
      )}
      <button type="button" className="primary-button wide" onClick={close}>
        {m.pause_continue()}
      </button>
      <NewJourneyButton className="restart-button" />
    </Dialog>
  )
}
