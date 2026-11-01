import { QUEST_EXPIRY_MS } from '@saigon/shared'
import { useMutation } from '@tanstack/react-query'
import { close } from '@/app/actions'
import { abandonQuest } from '@/shared/api/quests'
import { itemLabel, m, unlockLabel } from '@/shared/i18n'
import { type GameState, update } from '@/shared/state/game'
import { questHint, stepCopy } from '@/shared/state/quests'
import { CoinEmblem } from '@/shared/ui/coin-emblem'
import { Dialog } from '@/shared/ui/dialog'
import { Icon } from '@/shared/ui/icons'

export function JournalPanel({ state }: { state: GameState }) {
  const abandon = useMutation({ mutationFn: abandonQuest })
  return (
    <Dialog
      title={m.journal_title()}
      eyebrow={m.journal_eyebrow()}
      onClose={close}
    >
      <div className="journal-section">
        <h3>{m.journal_on_mind({ count: state.quests.length })}</h3>
        {state.quests.map((quest) => (
          <section key={quest.id} aria-label={quest.title}>
            <h4>{quest.title}</h4>
            <p>{quest.description}</p>
            {quest.status === 'active' && (
              <p>
                {m.quest_expires({
                  minutes: Math.max(
                    0,
                    Math.ceil(
                      (quest.createdAt + QUEST_EXPIRY_MS - Date.now()) / 60000
                    )
                  ),
                })}
              </p>
            )}
            {quest.scope === 'party' && <p>{m.journal_shared()}</p>}
            <ol>
              {quest.steps.map((step, index) => {
                const twisted =
                  quest.twist?.replaced !== undefined &&
                  index === quest.steps.length - 1
                return (
                  <li
                    key={`${quest.id}-${JSON.stringify(step)}-${quest.steps.slice(0, index).filter((entry) => JSON.stringify(entry) === JSON.stringify(step)).length}`}
                  >
                    <span
                      role="img"
                      aria-label={
                        quest.progress[index]
                          ? m.journal_done()
                          : m.journal_pending()
                      }
                    >
                      {quest.progress[index] ? '✓ ' : '○ '}
                    </span>
                    {twisted && quest.twist?.replaced ? (
                      <span className="journal-twist">
                        <s className="journal-twist-old">
                          {m.twist_journal_was()}
                          {stepCopy(quest.twist.replaced)}
                        </s>
                        <span className="journal-twist-new">
                          <span className="journal-twist-mark">
                            {m.twist_journal_mark()}
                          </span>{' '}
                          {stepCopy(step)}
                        </span>
                        <span className="journal-twist-line">
                          {quest.twist.line}
                        </span>
                      </span>
                    ) : (
                      stepCopy(step)
                    )}
                  </li>
                )
              })}
            </ol>
            <p>{questHint(quest)}</p>
            <span className="journal-reward">
              {m.journal_reward({
                coins: m.coins({ count: quest.reward.currency }),
                item: quest.reward.itemId
                  ? itemLabel(quest.reward.itemId)
                  : m.journal_thank_you(),
                reputation: quest.reward.reputation,
              })}
            </span>
            {quest.reward.unlockId && (
              <span className="journal-reward journal-unlock">
                {m.reward_unlock({
                  item: unlockLabel(quest.reward.unlockId),
                })}
              </span>
            )}
            <div className="journal-actions">
              <button
                type="button"
                className="text-button"
                aria-pressed={state.trackedQuestId === quest.id}
                onClick={() =>
                  update({
                    trackedQuestId:
                      state.trackedQuestId === quest.id ? null : quest.id,
                  })
                }
              >
                {state.trackedQuestId === quest.id
                  ? m.journal_tracking()
                  : m.journal_track()}
              </button>
              <button
                type="button"
                className="text-button"
                disabled={abandon.isPending}
                onClick={() => abandon.mutate(quest.id)}
              >
                {m.journal_abandon()}
              </button>
            </div>
          </section>
        ))}
        {!state.quests.length && <p>{m.journal_empty()}</p>}
      </div>
      <div className="journal-section">
        <h3>{m.journal_bag()}</h3>
        <div className="bag-items">
          <span>
            <CoinEmblem />
            {m.coins({ count: state.world.currency })}
          </span>
          {(state.world.inventory.herbs ?? 0) > 0 && (
            <span>
              <Icon name="leaf" />
              {m.journal_herbs()} × {state.world.inventory.herbs}
            </span>
          )}
          {(state.world.inventory.postcard ?? 0) > 0 && (
            <span>
              <Icon name="map" />
              {m.journal_postcard()} × {state.world.inventory.postcard}
            </span>
          )}
          {(state.world.inventory.photo ?? 0) > 0 && (
            <span>
              <Icon name="star" />
              {m.journal_photo()} × {state.world.inventory.photo}
            </span>
          )}
          {(state.world.inventory.coffee ?? 0) > 0 && (
            <span>
              <Icon name="sound" />
              Cà phê sữa × {state.world.inventory.coffee}
            </span>
          )}
          {(state.world.inventory.banana ?? 0) > 0 && (
            <span>
              <Icon name="leaf" />
              Chuối chín × {state.world.inventory.banana}
            </span>
          )}
        </div>
      </div>
      <div className="journal-section">
        <h3>{m.journal_memories()}</h3>
        {state.completed.length ? (
          state.completed.map((quest) => (
            <p className="completed-errand" key={quest.id}>
              <Icon name="check" />
              {quest.title}
            </p>
          ))
        ) : (
          <p className="muted-copy">{m.journal_first_story()}</p>
        )}
      </div>
      <button type="button" className="primary-button wide" onClick={close}>
        {m.pause_continue()}
      </button>
    </Dialog>
  )
}
