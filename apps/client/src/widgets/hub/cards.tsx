import { NPCS } from '@saigon/shared'
import { closeHub, talk } from '@/app/actions'
import { game } from '@/shared/state/game'
import { Icon } from '@/shared/ui/icons'
import { distance, PEOPLE } from '@/shared/world/places'
import type { HubView } from './view'

export function StoryCard({ view }: { view: HubView }) {
  const { story } = view
  return (
    <section className="hub-card story-card roofed">
      <div className="card-header">
        <div>
          <p className="card-kicker">
            {story.done ? 'Story complete' : 'Active story'}
          </p>
          <h2 className="card-title">{story.title}</h2>
        </div>
      </div>
      <ol className="story-road">
        {story.steps.map((step, index) => (
          <li key={step.title} className={`stop ${step.state}`}>
            <span className="stop-marker" aria-hidden="true">
              {step.state === 'done' ? (
                <Icon name="check" size={18} />
              ) : (
                index + 1
              )}
            </span>
            <strong>{step.title}</strong>
            <small>{step.detail}</small>
            <span className="sr-only">
              {step.state === 'done'
                ? 'Done'
                : step.state === 'now'
                  ? 'Current step'
                  : 'Later'}
            </span>
          </li>
        ))}
      </ol>
      <div className="secret-quests">
        <div className="secret-heading">
          <span className="card-kicker">Neighborhood errands</span>
          <small>Small kindnesses from the neighbors you meet.</small>
        </div>
        <ul>
          {story.secrets.map((secret) => (
            <li key={secret.id} className={`secret-quest ${secret.state}`}>
              <span className="secret-dot" aria-hidden="true">
                {secret.state === 'done' ? (
                  <Icon name="check" size={14} />
                ) : (
                  '!'
                )}
              </span>
              <span>
                <strong>{secret.title}</strong>
                <small>{secret.detail}</small>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="story-footer">
        <span className="chip bus">
          <Icon name="coin" size={15} /> {story.coins} coins
        </span>
        <span className="chip leaf">
          <Icon name="stamp" size={15} /> A neighbor’s thank-you
        </span>
        <button
          type="button"
          className="block-button small"
          onClick={() => closeHub('journal')}
        >
          Open journal
        </button>
      </div>
    </section>
  )
}

export function NeighborCard({ view }: { view: HubView }) {
  const neighbor = view.neighbor
  if (!neighbor)
    return (
      <section className="hub-card neighbor-card">
        <div className="card-header">
          <div className="neighbor-id">
            <span className="portrait" aria-hidden="true">
              <Icon name="users" size={26} />
            </span>
            <div>
              <h2 className="card-title">Neighbors</h2>
              <small>No one met yet</small>
            </div>
          </div>
        </div>
        <p className="bubble">
          {NPCS.hoa.name} is waiting at the market stall. Say hello!
        </p>
        <button
          type="button"
          className="primary-button wide"
          onClick={() => closeHub('map')}
        >
          Find {NPCS.hoa.name}
        </button>
      </section>
    )
  const near = distance(game.state.position, PEOPLE[neighbor.id].at) < 4
  return (
    <section className="hub-card neighbor-card">
      <div className="card-header">
        <div className="neighbor-id">
          <span className="portrait" aria-hidden="true">
            {neighbor.name.split(' ').at(-1)?.[0]}
          </span>
          <div>
            <h2 className="card-title">{neighbor.name}</h2>
            <small>{neighbor.role}</small>
          </div>
        </div>
        <span className={`status ${neighbor.source ?? 'fallback'}`}>
          {neighbor.source === 'live' ? 'Live guide' : 'Offline guide'}
        </span>
      </div>
      <blockquote className="bubble">{neighbor.line}</blockquote>
      <button
        type="button"
        className="primary-button wide"
        onClick={() => {
          closeHub(near ? 'none' : 'map')
          if (near) void talk(neighbor.id)
        }}
      >
        {near ? `Talk to ${neighbor.name}` : `Find ${neighbor.name}`}
      </button>
    </section>
  )
}
