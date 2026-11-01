import { Canvas } from '@react-three/fiber'
import {
  type AvatarBody,
  PlayerNameSchema,
  randomPlayerName,
} from '@saigon/shared'
import { useSelector } from '@tanstack/react-store'
import { Suspense, useEffect, useState } from 'react'
import { saveProfile, signInWithMeta, signOut } from '@/shared/api/session'
import { m } from '@/shared/i18n'
import { game, notify, update } from '@/shared/state/game'
import { Icon } from '@/shared/ui/icons'
import { AvatarLights, AvatarTurntable } from '@/shared/world'

/** Saves the chosen name and body before play; offline players keep them locally. */
export async function commitProfile(name: string, body: AvatarBody) {
  const parsed = PlayerNameSchema.safeParse(name)
  if (!parsed.success) return false
  const unchanged =
    parsed.data === game.state.guestName && body === game.state.body
  update({ guestName: parsed.data, body })
  if (unchanged || game.state.guestStatus !== 'online') return true
  try {
    await saveProfile(parsed.data, body)
    return true
  } catch {
    notify(m.toast_name_not_saved())
    return false
  }
}

/** A small turning preview of the chosen body and current look. */
export function AvatarPreview({ body }: { body: AvatarBody }) {
  const look = useSelector(game, (s) => s.unlocks.equipped)
  return (
    <div className="title-avatar" aria-hidden="true">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0.2, 3.1], fov: 32 }}
        gl={{ alpha: true }}
      >
        <AvatarLights />
        <Suspense fallback={null}>
          <AvatarTurntable body={body} look={look} />
        </Suspense>
      </Canvas>
    </div>
  )
}

/** Two-button body toggle shown above the name field for new journeys. */
export function TitleBody({
  body,
  onBody,
}: {
  body: AvatarBody
  onBody: (body: AvatarBody) => void
}) {
  const { guestStatus } = useSelector(game, (s) => s)
  const bodies: { id: AvatarBody; label: string }[] = [
    { id: 'man', label: m.body_man() },
    { id: 'woman', label: m.body_woman() },
  ]
  return (
    <div className="title-body">
      <span className="title-body-label">{m.title_body_label()}</span>
      <AvatarPreview body={body} />
      <div className="title-body-options">
        {bodies.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`title-body-option${body === option.id ? ' is-active' : ''}`}
            aria-pressed={body === option.id}
            disabled={guestStatus === 'loading'}
            onClick={() => onBody(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function TitleName({
  name,
  onName,
}: {
  name: string
  onName: (name: string) => void
}) {
  const { guestName, guestStatus } = useSelector(game, (s) => s)
  useEffect(() => {
    if (guestName) onName(guestName)
  }, [guestName, onName])
  const valid = PlayerNameSchema.safeParse(name).success
  return (
    <label className="title-name" htmlFor="player-name">
      <span>{m.title_your_name()}</span>
      <span className="title-name-row">
        <input
          id="player-name"
          value={name}
          maxLength={24}
          autoComplete="nickname"
          aria-invalid={!valid}
          disabled={guestStatus === 'loading'}
          onChange={(event) => onName(event.target.value)}
        />
        <button
          type="button"
          className="title-dice"
          aria-label={m.title_random_name()}
          title={m.title_random_name()}
          disabled={guestStatus === 'loading'}
          onClick={() => onName(randomPlayerName())}
        >
          <Icon name="dice" size={22} />
        </button>
      </span>
    </label>
  )
}

export function TitleAccount() {
  const { guestStatus, account, metaAvailable } = useSelector(game, (s) => s)
  const [signingIn, setSigningIn] = useState(false)
  const meta = async () => {
    setSigningIn(true)
    try {
      await signInWithMeta()
    } catch {
      setSigningIn(false)
      notify(m.toast_meta_unavailable())
    }
  }
  const leave = async () => {
    await signOut().catch(() => {})
    location.reload()
  }
  if (account === 'meta')
    return (
      <p className="title-account">
        <span>{m.title_meta_saved()}</span>
        <button type="button" className="text-button" onClick={leave}>
          {m.title_sign_out()}
        </button>
      </p>
    )
  return (
    <p className="title-account">
      <span>{m.title_guest_saved()}</span>
      {metaAvailable && guestStatus === 'online' && (
        <button
          type="button"
          className="meta-button"
          disabled={signingIn}
          onClick={meta}
        >
          {signingIn ? m.title_meta_opening() : m.title_meta_continue()}
        </button>
      )}
    </p>
  )
}
