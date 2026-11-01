import { m } from '@/shared/i18n'
import { AffinityIcon } from '@/shared/ui/affinity'

export function MarkerGuide() {
  return (
    <section className="marker-guide" aria-label={m.guide_title()}>
      <h3>{m.guide_title()}</h3>
      <ul>
        <li>
          <span className="guide-diamond" aria-hidden="true">
            <b>!</b>
          </span>
          {m.guide_quest_new()}
        </li>
        <li>
          <span className="guide-diamond" aria-hidden="true">
            <b>?</b>
          </span>
          {m.guide_quest_ready()}
        </li>
        <li>
          <AffinityIcon tier="warm" size={24} />
          {m.guide_affinity()}
        </li>
      </ul>
    </section>
  )
}
