import { m, npcLabel } from '@/shared/i18n'
import { Icon } from '@/shared/ui/icons'
import type { HubView } from './view'

/** The district milestone board: three components, the apex state, next giver. */
export function MilestoneCard({ view }: { view: HubView }) {
  const { milestone } = view
  const kicker =
    milestone.state === 'done'
      ? m.milestone_state_done()
      : milestone.state === 'ready'
        ? m.milestone_state_ready({ host: milestone.hostName })
        : m.milestone_state_gather()
  return (
    <section className="hub-card milestone-card roofed">
      <div className="card-header">
        <div>
          <p className="card-kicker">{kicker}</p>
          <h2 className="card-title">{milestone.title}</h2>
        </div>
      </div>
      <ul className="milestone-components">
        {milestone.components.map((component) => (
          <li
            key={component.itemId}
            className={`milestone-component ${component.held ? 'held' : 'wanted'}`}
          >
            <span className="milestone-mark" aria-hidden="true">
              {component.held ? <Icon name="check" size={16} /> : '○'}
            </span>
            <span>
              <strong>
                {m.milestone_component({
                  giver: component.giverName,
                  place: component.place,
                })}
              </strong>
              <small>
                {component.held
                  ? m.milestone_component_held()
                  : m.milestone_component_wanted()}
              </small>
            </span>
          </li>
        ))}
      </ul>
      {milestone.state === 'gather' && milestone.nextGiver ? (
        <p className="milestone-next">
          {m.milestone_next({ name: npcLabel(milestone.nextGiver) })}
        </p>
      ) : milestone.state === 'ready' ? (
        <p className="milestone-next">
          {m.milestone_next_apex({ host: milestone.hostName })}
        </p>
      ) : (
        <p className="milestone-next">{m.milestone_done_note()}</p>
      )}
    </section>
  )
}
