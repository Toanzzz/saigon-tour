import { useSelector } from '@tanstack/react-store'
import { m, marketItemLabel } from '@/shared/i18n'
import { game } from '@/shared/state/game'
import { GoodIcon } from '@/shared/ui/good-icon'
import { stamina } from './store'

export function StaminaHud() {
  const view = useSelector(stamina, (value) => value)
  const effects = useSelector(game, (state) => state.world.effects)
  const reduced = useSelector(game, (state) => state.reducedMotion)
  const used = view.usedAt > 0 && view.now - view.usedAt < 650
  return (
    <div
      className={`stamina-hud${view.exhausted ? ' is-exhausted' : ''}${used && !reduced ? ' is-restored' : ''}`}
    >
      <label htmlFor="stamina-meter">{m.stamina_label()}</label>
      <meter
        id="stamina-meter"
        min={0}
        max={view.max}
        value={view.current}
        low={25}
      />
      <span className="stamina-number">
        {Math.ceil(view.current)}/{view.max}
      </span>
      {view.exhausted && <small role="status">{m.stamina_exhausted()}</small>}
      <div className="stamina-effects">
        {effects
          ?.filter((effect) => effect.endsAt > view.now)
          .map((effect) => (
            <span key={effect.itemId} title={marketItemLabel(effect.itemId)}>
              <GoodIcon id={effect.itemId} />
              <span>{Math.ceil((effect.endsAt - view.now) / 1000)}s</span>
            </span>
          ))}
      </div>
    </div>
  )
}
