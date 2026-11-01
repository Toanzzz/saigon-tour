import { useState } from 'react'
import { close } from '@/app/actions'
import { abandonQuest } from '@/shared/api/quests'
import { type GameState, update } from '@/shared/state/game'
import { questHint, stepCopy } from '@/shared/state/quests'
import { Dialog } from '@/shared/ui/dialog'
import { Icon } from '@/shared/ui/icons'

export function JournalPanel({ state }: { state: GameState }) {
  const [abandoning, setAbandoning] = useState<string | null>(null)
  return (
    <Dialog
      title="Your little journey"
      eyebrow="Travel journal"
      onClose={close}
    >
      <div className="journal-section">
        <h3>On your mind · {state.quests.length}/3</h3>
        {state.quests.map((quest) => (
          <section key={quest.id} aria-label={quest.title}>
            <h4>{quest.title}</h4>
            <p>{quest.description}</p>
            {quest.scope === 'party' && (
              <p>
                Shared errand · your steps. Everyone finishes before the group
                thank-you.
              </p>
            )}
            <ol>
              {quest.steps.map((step, index) => (
                <li
                  key={`${quest.id}-${JSON.stringify(step)}-${quest.steps.slice(0, index).filter((entry) => JSON.stringify(entry) === JSON.stringify(step)).length}`}
                >
                  <span
                    role="img"
                    aria-label={quest.progress[index] ? 'Done' : 'Pending'}
                  >
                    {quest.progress[index] ? '✓ ' : '○ '}
                  </span>
                  {stepCopy(step)}
                </li>
              ))}
            </ol>
            <p>{questHint(quest)}</p>
            <span className="journal-reward">
              {quest.reward.currency} coins ·{' '}
              {quest.reward.itemId ?? 'a thank-you'} · +
              {quest.reward.reputation} reputation
            </span>
            <div className="journal-actions">
              <button
                type="button"
                className="text-button"
                aria-pressed={state.trackedQuestId === quest.id}
                onClick={() => update({ trackedQuestId: quest.id })}
              >
                Track errand
              </button>
              <button
                type="button"
                className="text-button"
                disabled={abandoning !== null}
                onClick={async () => {
                  setAbandoning(quest.id)
                  try {
                    await abandonQuest(quest.id)
                  } finally {
                    setAbandoning(null)
                  }
                }}
              >
                Abandon errand
              </button>
            </div>
          </section>
        ))}
        {!state.quests.length && (
          <p>Say hello to a neighbor and see who could use a hand.</p>
        )}
      </div>
      <div className="journal-section">
        <h3>In your bag</h3>
        <div className="bag-items">
          <span>
            <Icon name="coin" />
            {state.world.currency} coins
          </span>
          {(state.world.inventory.herbs ?? 0) > 0 && (
            <span>
              <Icon name="leaf" />
              Fresh herbs × {state.world.inventory.herbs}
            </span>
          )}
          {(state.world.inventory.postcard ?? 0) > 0 && (
            <span>
              <Icon name="map" />
              Sài Gòn postcard × {state.world.inventory.postcard}
            </span>
          )}
          {(state.world.inventory.photo ?? 0) > 0 && (
            <span>
              <Icon name="star" />
              Group photo × {state.world.inventory.photo}
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
        <h3>Good memories</h3>
        {state.completed.length ? (
          state.completed.map((quest) => (
            <p className="completed-errand" key={quest.id}>
              <Icon name="check" />
              {quest.title}
            </p>
          ))
        ) : (
          <p className="muted-copy">Your first story is waiting to happen.</p>
        )}
      </div>
      <button type="button" className="primary-button wide" onClick={close}>
        Continue exploring
      </button>
    </Dialog>
  )
}
