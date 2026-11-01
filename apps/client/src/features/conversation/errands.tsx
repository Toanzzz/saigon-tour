import { type ItemId, NPCS, type NpcId, type Quest } from '@saigon/shared'
import { acceptQuest, deliverOrVerify, openJournal } from '@/app/actions'
import { type GameState, update } from '@/shared/state/game'
import { dialogueQuests, questHint } from '@/shared/state/quests'
import { Icon } from '@/shared/ui/icons'

const ITEM_LABELS: Record<ItemId, string> = {
  herbs: 'fresh herbs',
  postcard: 'postcard',
  photo: 'group photo',
  noodles: 'noodles',
  broth: 'broth',
  baguette: 'bánh mì',
  coffee: 'cà phê sữa',
  banana: 'chuối chín',
}
function itemLabel(itemId: ItemId): string {
  return ITEM_LABELS[itemId]
}

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
    <section className="errands" aria-label="Errands">
      {ready.map((quest) => (
        <div className="errand" key={quest.id}>
          <div className="errand-head">
            <span className="errand-title">{quest.title}</span>
            <Pill tone="ready" label="Ready" />
          </div>
          <p className="errand-hint">Bring the good news back to {npcName}.</p>
          <button
            type="button"
            className="primary-button"
            onClick={() => void deliverOrVerify()}
          >
            <Icon name="check" />
            Turn in
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
              <Pill tone="active" label="Needs you" />
            </div>
            <p className="errand-hint">{questHint(quest)}</p>
            {item && held ? (
              <button
                type="button"
                className="primary-button"
                onClick={() => void deliverOrVerify()}
              >
                Give {itemLabel(item)}
              </button>
            ) : item ? (
              <p className="errand-need">Need {itemLabel(item)}.</p>
            ) : null}
          </div>
        )
      })}
      {active.map((quest) => (
        <div className="errand" key={quest.id}>
          <div className="errand-head">
            <span className="errand-title">{quest.title}</span>
            <Pill tone="active" label="In progress" />
          </div>
          <p className="errand-hint">{questHint(quest)}</p>
          <button
            type="button"
            className="text-button"
            aria-pressed={state.trackedQuestId === quest.id}
            onClick={() => update({ trackedQuestId: quest.id })}
          >
            {state.trackedQuestId === quest.id ? 'Tracking' : 'Track'}
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
          Ask for an errand
        </button>
      ) : (
        full && (
          <div className="errand errand-full">
            <p className="errand-need">
              Journal full (3/3) — finish or abandon one to take more.
            </p>
            <button type="button" className="text-button" onClick={openJournal}>
              Open journal
            </button>
          </div>
        )
      )}
    </section>
  )
}
