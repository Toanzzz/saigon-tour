import { type ItemId, NPCS, type NpcId, type Quest } from '@saigon/shared'
import { acceptQuest, deliverOrVerify, openJournal } from '@/app/actions'
import { itemLabel, m } from '@/shared/i18n'
import { type GameState, update } from '@/shared/state/game'
import { dialogueQuests, questHint } from '@/shared/state/quests'
import { Icon } from '@/shared/ui/icons'

function Pill({ tone, label }: { tone: string; label: string }) {
  return <span className={`errand-pill errand-pill-${tone}`}>{label}</span>
}

function deliveryItem(quest: Quest, npc: NpcId): ItemId | null {
  const step = quest.steps.find((_, index) => !quest.progress[index])
  return step?.type === 'DELIVER' && step.npcId === npc ? step.itemId : null
}

export function NpcErrands({ state, npc }: { state: GameState; npc: NpcId }) {
  const { fromNpc, forNpc, canHelp, full } = dialogueQuests(state, npc)
  const ready = fromNpc.filter((quest) => quest.status === 'ready')
  const active = fromNpc.filter((quest) => quest.status === 'active')
  const npcName = NPCS[npc].name
  return (
    <section className="errands" aria-label={m.errands_label()}>
      {ready.map((quest) => (
        <div className="errand" key={quest.id}>
          <div className="errand-head">
            <span className="errand-title">{quest.title}</span>
            <Pill tone="ready" label={m.errands_ready()} />
          </div>
          <p className="errand-hint">
            {m.errands_good_news({ name: npcName })}
          </p>
          <button
            type="button"
            className="primary-button"
            onClick={() => void deliverOrVerify()}
          >
            <Icon name="check" />
            {m.errands_turn_in()}
          </button>
        </div>
      ))}
      {forNpc.map((quest) => {
        const item = deliveryItem(quest, npc)
        const held = item ? (state.world.inventory[item] ?? 0) > 0 : false
        return (
          <div className="errand" key={quest.id}>
            <div className="errand-head">
              <span className="errand-title">{quest.title}</span>
              <Pill tone="active" label={m.errands_needs_you()} />
            </div>
            <p className="errand-hint">{questHint(quest)}</p>
            {item && held ? (
              <button
                type="button"
                className="primary-button"
                onClick={() => void deliverOrVerify()}
              >
                {m.errands_give({ item: itemLabel(item) })}
              </button>
            ) : item ? (
              <p className="errand-need">
                {m.errands_need({ item: itemLabel(item) })}
              </p>
            ) : null}
          </div>
        )
      })}
      {active.map((quest) => (
        <div className="errand" key={quest.id}>
          <div className="errand-head">
            <span className="errand-title">{quest.title}</span>
            <Pill tone="active" label={m.errands_in_progress()} />
          </div>
          <p className="errand-hint">{questHint(quest)}</p>
          <button
            type="button"
            className="text-button"
            aria-pressed={state.trackedQuestId === quest.id}
            onClick={() => update({ trackedQuestId: quest.id })}
          >
            {state.trackedQuestId === quest.id
              ? m.errands_tracking()
              : m.errands_track()}
          </button>
        </div>
      ))}
      {canHelp ? (
        <button
          type="button"
          className="primary-button errand-offer"
          onClick={() => void acceptQuest()}
        >
          <Icon name="leaf" />
          {m.errands_ask()}
        </button>
      ) : (
        full && (
          <div className="errand errand-full">
            <p className="errand-need">{m.errands_full()}</p>
            <button type="button" className="text-button" onClick={openJournal}>
              {m.header_open_journal()}
            </button>
          </div>
        )
      )}
    </section>
  )
}
