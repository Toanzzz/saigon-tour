import type { Emote } from '@saigon/shared'
import { useStore } from '@tanstack/react-store'
import { close } from '../core/actions'
import { sendEmote, sendParty } from '../net/socket'
import { net, updateNet } from '../net/status'
import { useXRPresenting } from '../platform/xr'
import { update } from '../state/game'
import { Dialog } from './dialog'
import { Icon } from './icons'
import './people.css'

export function PeopleButton() {
  const state = useStore(net, (value) => value)
  const xr = useXRPresenting()
  if (xr) return null
  return (
    <button
      type="button"
      className="icon-button people-button"
      aria-label="People nearby"
      title={`${state.connection} · People nearby (P)`}
      onClick={() => update({ panel: 'people' })}
    >
      <Icon name="users" />
      <span>{state.players.length}</span>
      <i className={`connection-dot ${state.connection}`} aria-hidden="true" />
    </button>
  )
}
export function PeoplePanel() {
  const state = useStore(net, (value) => value)
  return (
    <Dialog title={`People on ${state.room ?? 'your street'}`} onClose={close}>
      <p role="status" className="connection-copy">
        {state.connection === 'connected'
          ? 'Sharing this little corner of Sài Gòn'
          : 'Reconnecting to the neighborhood…'}
      </p>
      {state.party && (
        <section className="party-roster" aria-label="Your party">
          <h3>Your party · {state.party.members.length}/4</h3>
          <ul>
            {state.party.members.map((member) => (
              <li key={member.id}>
                {member.name}
                {member.id === state.selfId ? ' (you)' : ''}
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="text-button"
            disabled={state.connection !== 'connected'}
            onClick={() => sendParty({ type: 'party-leave' })}
          >
            Leave party
          </button>
        </section>
      )}
      <ul className="people-list">
        {state.players.map((player) => (
          <li key={player.id}>
            <span
              className="player-color"
              style={{ background: player.color }}
            />
            <strong>{player.name}</strong>
            {player.id === state.selfId && <span>You</span>}
            {player.id !== state.selfId &&
              !state.party?.members.some(
                (member) => member.id === player.id
              ) && (
                <button
                  type="button"
                  className="text-button"
                  disabled={
                    state.connection !== 'connected' ||
                    (state.party?.members.length ?? 0) >= 4
                  }
                  aria-label={`Invite ${player.name}`}
                  onClick={() => {
                    if (
                      sendParty({ type: 'party-invite', targetId: player.id })
                    )
                      updateNet({ emotesOpen: false })
                  }}
                >
                  Invite
                </button>
              )}
          </li>
        ))}
      </ul>
      {!state.players.length && (
        <p>Your neighbors will appear when connected.</p>
      )}
      <p className="muted-copy">
        Invite a neighbor within a few steps. Parties hold up to four people.
      </p>
    </Dialog>
  )
}
const choices: { emote: Emote; label: string }[] = [
  { emote: 'wave', label: 'Wave' },
  { emote: 'hello', label: 'Hello!' },
  { emote: 'thanks', label: 'Thank you!' },
  { emote: 'follow-me', label: 'Follow me!' },
]
export function EmoteControls() {
  const state = useStore(net, (value) => value)
  const xr = useXRPresenting()
  if (xr) return null
  return (
    <div className="emote-controls">
      <button
        type="button"
        className="emote-opener"
        aria-label="Emotes and phrases"
        aria-expanded={state.emotesOpen}
        onClick={() => updateNet({ emotesOpen: !state.emotesOpen })}
      >
        <span aria-hidden="true">👋</span>
        <span>Say hello</span>
        <kbd>Q</kbd>
      </button>
      {state.emotesOpen && (
        <fieldset
          className="emote-popover"
          aria-label="Choose an emote or phrase"
        >
          {choices.map(({ emote, label }) => (
            <button
              key={emote}
              type="button"
              disabled={state.connection !== 'connected'}
              onClick={() => {
                if (sendEmote(emote)) updateNet({ emotesOpen: false })
              }}
            >
              {label}
            </button>
          ))}
          {state.connection !== 'connected' && (
            <span>Connecting to neighbors…</span>
          )}
        </fieldset>
      )}
    </div>
  )
}
