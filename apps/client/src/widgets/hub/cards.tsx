import { closeHub, talk } from '@/app/actions'
import { npcPosition } from '@/shared/api/city'
import { m, npcLabel } from '@/shared/i18n'
import { game } from '@/shared/state/game'
import { Icon } from '@/shared/ui/icons'
import { distance } from '@/shared/world/places'
import type { HubView } from './view'

export function StoryCard({ view }: { view: HubView }) {
  const { story } = view
  return (
    <section className="hub-card story-card roofed">
      <div className="card-header">
        <div>
          <p className="card-kicker">
            {story.done ? m.hub_story_complete() : m.hub_story_active()}
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
                ? m.journal_done()
                : step.state === 'now'
                  ? m.hub_step_current()
                  : m.hub_step_later()}
            </span>
          </li>
        ))}
      </ol>
      <div className="secret-quests">
        <div className="secret-heading">
          <span className="card-kicker">{m.hub_errands()}</span>
          <small>{m.hub_errands_help()}</small>
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
          <Icon name="coin" size={15} /> {m.coins({ count: story.coins })}
        </span>
        <span className="chip leaf">
          <Icon name="stamp" size={15} /> {m.hub_neighbor_thanks()}
        </span>
        <button
          type="button"
          className="block-button small"
          onClick={() => closeHub('journal')}
        >
          {m.header_open_journal()}
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
              <h2 className="card-title">{m.hub_neighbors()}</h2>
              <small>{m.hub_no_one_met()}</small>
            </div>
          </div>
        </div>
        <p className="bubble">{m.hub_hoa_waiting({ name: npcLabel('hoa') })}</p>
        <button
          type="button"
          className="primary-button wide"
          onClick={() => closeHub('map')}
        >
          {m.hub_find({ name: npcLabel('hoa') })}
        </button>
      </section>
    )
  const near = distance(game.state.position, npcPosition(neighbor.id)) < 4
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
          {neighbor.source === 'live'
            ? m.hub_live_guide()
            : m.hub_offline_guide()}
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
        {near
          ? m.hud_talk_to({ name: neighbor.name })
          : m.hub_find({ name: neighbor.name })}
      </button>
    </section>
  )
}
