import { UNLOCK_SLOTS, UNLOCKS } from '@saigon/shared'
import { useSelector } from '@tanstack/react-store'
import { m, npcLabel, slotLabel, tierLabel, unlockLabel } from '@/shared/i18n'
import { OwnedCard } from '@/widgets/hud/wardrobe/item-card'
import { WardrobeStage } from '@/widgets/hud/wardrobe/stage'
import {
  equipPreview,
  type Gait,
  inspectWardrobe,
  type View,
  workshop,
} from './store'

export function WardrobeInspector({ capture = false }: { capture?: boolean }) {
  const state = useSelector(workshop, (value) => value)
  const selected = UNLOCKS[state.selected]
  const stage = (
    <WardrobeStage
      body={state.body}
      look={state.look}
      animation={state.animation}
      frozen={state.frozen}
      bounds={state.bounds}
      anchors={state.anchors}
      view={state.view}
    />
  )
  if (capture) return <div className="workshop-capture">{stage}</div>
  return (
    <>
      <section className="workshop-controls">
        <label>
          {m.debug_body()}
          <select
            aria-label={m.debug_body()}
            value={state.body}
            onChange={(event) =>
              inspectWardrobe({ body: event.target.value as typeof state.body })
            }
          >
            <option value="man">{m.body_man()}</option>
            <option value="woman">{m.body_woman()}</option>
          </select>
        </label>
        <label>
          {m.debug_animation()}
          <select
            aria-label={m.debug_animation()}
            value={state.animation}
            onChange={(event) =>
              inspectWardrobe({ animation: event.target.value as Gait })
            }
          >
            <option value="idle">{m.debug_gait_idle()}</option>
            <option value="walk">{m.debug_gait_walk()}</option>
            <option value="sprint">{m.debug_gait_sprint()}</option>
            <option value="sit">{m.debug_gait_sit()}</option>
          </select>
        </label>
        <label>
          {m.debug_view()}
          <select
            aria-label={m.debug_view()}
            value={state.view}
            onChange={(event) =>
              inspectWardrobe({ view: event.target.value as View })
            }
          >
            <option value="front">{m.debug_front()}</option>
            <option value="side">{m.debug_side()}</option>
            <option value="back">{m.debug_back()}</option>
          </select>
        </label>
        {(['frozen', 'bounds', 'anchors'] as const).map((key) => (
          <label className="workshop-checkbox" key={key}>
            <input
              type="checkbox"
              checked={state[key]}
              onChange={(event) =>
                inspectWardrobe({ [key]: event.target.checked })
              }
            />
            {key === 'frozen'
              ? m.debug_freeze()
              : key === 'bounds'
                ? m.debug_bounds()
                : m.debug_anchors()}
          </label>
        ))}
        <button type="button" onClick={() => inspectWardrobe({ look: {} })}>
          {m.debug_clear()}
        </button>
      </section>
      <div className="workshop-fitting">
        {stage}
        <aside>
          <h2>{m.debug_equipped()}</h2>
          {UNLOCK_SLOTS.map((slot) => (
            <p key={slot}>
              {slotLabel(slot)}:{' '}
              {state.look[slot] ? unlockLabel(state.look[slot]) : '—'}
            </p>
          ))}
          <details open>
            <summary>{m.debug_details()}</summary>
            {selected && (
              <p>
                {npcLabel(selected.giver)} · {tierLabel(selected.tier)}
              </p>
            )}
            <pre>{JSON.stringify(selected, null, 2)}</pre>
          </details>
        </aside>
      </div>
      <div className="wardrobe-grid workshop-catalog">
        {Object.values(UNLOCKS).map((item) => (
          <OwnedCard
            key={item.id}
            id={item.id}
            slot={item.slot}
            body={state.body}
            equipped={state.look[item.slot] === item.id}
            onEquip={equipPreview}
          />
        ))}
      </div>
    </>
  )
}
