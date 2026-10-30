import { useStore } from '@tanstack/react-store'
import { sendParty } from '../net/socket'
import { net, updateNet } from '../net/status'

export function PartyInviteControls() {
  const { invite, connection } = useStore(net, (state) => state)
  if (!invite || invite.expiresAt <= Date.now()) return null
  const respond = (accept: boolean) => {
    if (sendParty({ type: 'party-respond', inviteId: invite.inviteId, accept }))
      updateNet({ invite: null })
  }
  return (
    <section
      className="party-invite"
      aria-label="Party invitation"
      aria-live="polite"
    >
      <p>
        <strong>{invite.fromName}</strong> invited you to explore together.
      </p>
      <div>
        <button
          type="button"
          className="primary-button"
          disabled={connection !== 'connected'}
          onClick={() => respond(true)}
        >
          Accept invite
        </button>
        <button
          type="button"
          className="text-button"
          disabled={connection !== 'connected'}
          onClick={() => respond(false)}
        >
          Decline invite
        </button>
      </div>
    </section>
  )
}
