import { isMilestoneFinale, type Quest, slotOf, UNLOCKS } from '@saigon/shared'
import { useMutation } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { close } from '@/app/actions'
import { NewJourneyButton } from '@/app/title-journey'
import { NpcAvatar } from '@/features/conversation/npc-avatar'
import { rewardCopy } from '@/shared/api/party'
import { equipUnlock } from '@/shared/api/wardrobe'
import { itemLabel, m, npcLabel, unlockLabel } from '@/shared/i18n'
import { type GameState, game, update } from '@/shared/state/game'
import { CoinEmblem } from '@/shared/ui/coin-emblem'
import { Dialog } from '@/shared/ui/dialog'
import { Icon } from '@/shared/ui/icons'
import { WardrobeThumbnail } from '@/shared/ui/wardrobe-thumbnail'
import './reward.css'

function GratitudeArt({ quest }: { quest: Quest }) {
  const name = npcLabel(quest.giverNpcId)
  return (
    <figure className="reward-art">
      <img
        key={quest.giverNpcId}
        src={`${import.meta.env.BASE_URL}npcs/${quest.giverNpcId}/gratitude.webp`}
        alt={m.reward_art_alt({ name })}
        onError={(event) => {
          const image = event.currentTarget
          if (!image.dataset.fallback) {
            image.dataset.fallback = 'true'
            image.src = `${import.meta.env.BASE_URL}npcs/${quest.giverNpcId}/avatar-lg.webp`
          }
        }}
      />
      <figcaption>{m.reward_from({ name })}</figcaption>
    </figure>
  )
}

/** Presentation accepts actions so workshop previews never touch a player save. */
export function CompletionCard({
  quest,
  body = 'man',
  remaining = 0,
  onContinue,
  onEquip,
  onDismiss = onContinue,
  footer,
}: {
  quest: Quest
  body?: GameState['body']
  remaining?: number
  onContinue: () => void
  onDismiss?: () => void
  onEquip: () => Promise<boolean | undefined>
  footer?: ReactNode
}) {
  const equip = useMutation({ mutationFn: onEquip })
  const reward = quest.reward
  const unlock = reward.unlockId ? UNLOCKS[reward.unlockId] : null
  const action =
    unlock?.slot === 'vehicle'
      ? m.reward_ride_now()
      : unlock?.slot === 'pet'
        ? m.reward_bring_now()
        : m.wardrobe_wear_now()
  return (
    <Dialog
      title={quest.title}
      eyebrow={m.reward_eyebrow()}
      onClose={onDismiss}
      className="reward-dialog"
    >
      <GratitudeArt quest={quest} />
      {isMilestoneFinale(quest) && (
        <p className="reward-milestone-banner">{m.milestone_reward_banner()}</p>
      )}
      <blockquote className="reward-payoff">
        <NpcAvatar id={quest.giverNpcId} size="sm" />
        <span>{rewardCopy(quest)}</span>
      </blockquote>
      <div className="reward-earned">
        <span className="reward-coin-row">
          <CoinEmblem size={36} />+{m.coins({ count: reward.currency })}
        </span>
        <span>
          <Icon name="star" />
          {m.reward_item_reputation({
            item: reward.itemId
              ? itemLabel(reward.itemId)
              : m.reward_new_friend(),
            reputation: reward.reputation,
          })}
        </span>
      </div>
      {(reward.bonus?.thrifty || reward.bonus?.sharp) && (
        <div className="reward-bonus">
          {reward.bonus.thrifty && <span>{m.reward_thrifty()}</span>}
          {reward.bonus.sharp && <span>{m.reward_sharp()}</span>}
        </div>
      )}
      {unlock && reward.unlockId && (
        <section className="reward-gift">
          <WardrobeThumbnail body={body} id={unlock.id} eager />
          <span>{m.reward_unlock({ item: unlockLabel(reward.unlockId) })}</span>
        </section>
      )}
      <div className="reward-actions">
        {unlock && (
          <button
            type="button"
            className="primary-button wide reward-wear-now"
            disabled={equip.isPending}
            onClick={() => equip.mutate()}
          >
            {equip.isPending ? m.app_loading() : action}
          </button>
        )}
        {equip.data === false && <p role="alert">{m.reward_equip_failed()}</p>}
        <button
          type="button"
          className="primary-button wide"
          onClick={onContinue}
        >
          {remaining ? m.reward_next({ count: remaining }) : m.pause_continue()}
        </button>
      </div>
      {footer}
    </Dialog>
  )
}

export function RewardPanel({ state }: { state: GameState }) {
  const quest = state.rewardQuest
  if (!quest) return null
  return (
    <CompletionCard
      key={quest.id}
      quest={quest}
      body={state.body}
      remaining={Math.max(0, state.rewardQueue.length - 1)}
      onContinue={close}
      footer={<NewJourneyButton className="restart-button" />}
      onEquip={async () => {
        const id = quest.reward.unlockId
        if (!id || !(await equipUnlock(slotOf(id), id))) return false
        if (game.state.rewardQuest?.id !== quest.id) return true
        if (game.state.rewardQueue.length > 1) close()
        else {
          close()
          update({ panel: 'none', screen: 'playing', hubShown: true })
        }
        return true
      }}
    />
  )
}
