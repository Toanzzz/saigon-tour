import { PlayerNameSchema } from '@saigon/shared'
import { useSelector } from '@tanstack/react-store'
import { useState } from 'react'
import { commitProfile, TitleName } from '@/app/title-identity'
import { m } from '@/shared/i18n'
import { game, notify, update } from '@/shared/state/game'

/** Rename during play; Save appears once the name differs from the saved one. */
export function PauseName() {
  const guestName = useSelector(game, (s) => s.guestName)
  const body = useSelector(game, (s) => s.body)
  const [name, setName] = useState(guestName ?? '')
  const [saving, setSaving] = useState(false)
  const changed = name.trim() !== (guestName ?? '')
  const valid = PlayerNameSchema.safeParse(name).success
  const save = async () => {
    setSaving(true)
    const saved = await commitProfile(name, game.state.body)
    setSaving(false)
    if (saved) notify(m.toast_renamed({ name: name.trim() }))
  }
  return (
    <div className="pause-name">
      <TitleName
        name={name}
        onName={setName}
        body={body}
        onBody={(next) => update({ body: next })}
      />
      {changed && (
        <button
          type="button"
          className="primary-button pause-name-save"
          disabled={!valid || saving}
          onClick={save}
        >
          {saving ? m.pause_saving() : m.pause_save_name()}
        </button>
      )}
    </div>
  )
}
