import { useSelector } from '@tanstack/react-store'
import { sendParty } from '@/shared/api/socket'
import { net, updateNet } from '@/shared/api/status'
import { m } from '@/shared/i18n'

export function PartyInviteControls() {
  const { invite, connection } = useSelector(net, (state) => state)
  if (!invite || invite.expiresAt <= Date.now()) return null
  const respond = (accept: boolean) => {
    if (sendParty({ type: 'party-respond', inviteId: invite.inviteId, accept }))
      updateNet({ invite: null })
  }
  return (
    <section
      className="party-invite"
      aria-label={m.party_invitation()}
      aria-live="polite"
    >
      <p>
        <strong>{invite.fromName}</strong>
        {m.party_invited()}
      </p>
      <div>
        <button
          type="button"
          className="primary-button"
          disabled={connection !== 'connected'}
          onClick={() => respond(true)}
        >
          {m.party_accept()}
        </button>
        <button
          type="button"
          className="text-button"
          disabled={connection !== 'connected'}
          onClick={() => respond(false)}
        >
          {m.party_decline()}
        </button>
      </div>
    </section>
  )
}
