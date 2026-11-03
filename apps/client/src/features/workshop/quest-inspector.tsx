import {
  completionLine,
  NPC_REGISTRY,
  parFare,
  questPurchaseCost,
  questRouteDistance,
  questRouteLegs,
  stepText,
} from '@saigon/shared'
import { useSelector } from '@tanstack/react-store'
import { CompletionCard } from '@/features/postcard/reward'
import { m, npcLabel } from '@/shared/i18n'
import {
  advancePreview,
  equipPreview,
  type Fixture,
  inspectorSeeds,
  inspectQuest,
  nextPreviewCompletion,
  type Phase,
  replayCompletion,
  workshop,
} from './store'

export function QuestInspector() {
  const state = useSelector(workshop, (value) => value)
  const quest = state.quest
  const seeds = inspectorSeeds(state.npc, state.locale)
  const receipt = state.receipts[0]
  return (
    <>
      <section className="workshop-controls">
        <label>
          {m.debug_npc()}
          <select
            aria-label={m.debug_npc()}
            value={state.npc}
            onChange={(event) =>
              inspectQuest({
                npc: event.target.value as typeof state.npc,
                seed: 0,
                phase: 'offered',
              })
            }
          >
            {Object.keys(NPC_REGISTRY).map((id) => (
              <option key={id} value={id}>
                {npcLabel(id as typeof state.npc)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {m.debug_quest()}
          <select
            aria-label={m.debug_quest()}
            value={state.seed}
            onChange={(event) =>
              inspectQuest({ seed: Number(event.target.value) })
            }
          >
            {seeds.map((spec, index) => (
              <option
                key={`${spec.giverNpcId}-${spec.title}-${JSON.stringify(spec.steps)}`}
                value={index}
              >
                {spec.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          {m.debug_fixture()}
          <select
            aria-label={m.debug_fixture()}
            value={state.fixture}
            onChange={(event) =>
              inspectQuest({ fixture: event.target.value as Fixture })
            }
          >
            <option value="authored">{m.debug_authored()}</option>
            <option value="generated">{m.debug_generated()}</option>
            <option value="legacy">{m.debug_legacy()}</option>
            <option value="party">{m.debug_party()}</option>
            <option value="multiple">{m.debug_multiple()}</option>
          </select>
        </label>
        <label>
          {m.debug_phase()}
          <select
            aria-label={m.debug_phase()}
            value={state.phase}
            onChange={(event) =>
              inspectQuest({ phase: event.target.value as Phase })
            }
          >
            <option value="offered">{m.debug_offered()}</option>
            <option value="active">{m.debug_active()}</option>
            <option value="ready">{m.debug_ready()}</option>
            <option value="completed">{m.debug_completed()}</option>
          </select>
        </label>
        <label>
          {m.debug_friendship()}
          <input
            type="number"
            min={-5}
            max={5}
            value={state.friendship}
            onChange={(event) =>
              inspectQuest({
                friendship: Math.max(
                  -5,
                  Math.min(5, Number(event.target.value))
                ),
              })
            }
          />
        </label>
        <label className="workshop-checkbox">
          <input
            type="checkbox"
            checked={state.owned}
            onChange={(event) => inspectQuest({ owned: event.target.checked })}
          />
          {m.debug_owned()}
        </label>
        <button
          type="button"
          onClick={advancePreview}
          disabled={quest.status !== 'active'}
        >
          {m.debug_advance()}
        </button>
        <button
          type="button"
          className="primary-button"
          onClick={replayCompletion}
        >
          {m.debug_replay()}
        </button>
      </section>
      <article className="workshop-quest" aria-label={m.debug_quest()}>
        <h2>{quest.title}</h2>
        <p>{quest.description}</p>
        <ol>
          {quest.steps.map((step, index) => (
            <li key={`${quest.id}-${JSON.stringify(step)}`}>
              <span
                role="img"
                aria-label={
                  quest.progress[index]
                    ? m.journal_done()
                    : m.errands_in_progress()
                }
              >
                {quest.progress[index] ? '✓' : '○'}
              </span>{' '}
              {stepText(step, state.locale)}
            </li>
          ))}
        </ol>
        <blockquote>{completionLine(quest, state.locale)}</blockquote>
        <details open>
          <summary>{m.debug_details()}</summary>
          <pre>
            {JSON.stringify(
              {
                reward: quest.reward,
                status: quest.status,
                scope: quest.scope,
                milestone: quest.milestone,
                twist: quest.twist,
                riddle: quest.riddle,
                revealed: quest.revealed,
                spent: quest.spent ?? 0,
                routeDistance:
                  Math.round(questRouteDistance(quest) * 100) / 100,
                routeLegs: questRouteLegs(quest).map(
                  (distance) => Math.round(distance * 100) / 100
                ),
                purchaseCost: questPurchaseCost(quest),
                parFare: parFare(quest),
              },
              null,
              2
            )}
          </pre>
        </details>
      </article>
      {receipt && (
        <CompletionCard
          key={receipt.id}
          quest={receipt}
          body={state.body}
          remaining={state.receipts.length - 1}
          onContinue={nextPreviewCompletion}
          onEquip={async () => {
            const id = receipt.reward.unlockId
            if (id) {
              const { UNLOCKS } = await import('@saigon/shared')
              equipPreview(UNLOCKS[id].slot, id)
            }
            nextPreviewCompletion()
            return true
          }}
        />
      )}
    </>
  )
}
