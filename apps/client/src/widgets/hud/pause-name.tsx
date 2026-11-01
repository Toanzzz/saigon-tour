import { PlayerNameSchema } from '@saigon/shared'
import { useSelector } from '@tanstack/react-store'
import { useState } from 'react'
import { commitPlayerName, TitleName } from '@/app/title-identity'
import { game, notify } from '@/shared/state/game'

/** Rename during play; Save appears once the name differs from the saved one. */
export function PauseName() {
  const guestName = useSelector(game, (s) => s.guestName)
  const [name, setName] = useState(guestName ?? '')
  const [saving, setSaving] = useState(false)
  const changed = name.trim() !== (guestName ?? '')
  const valid = PlayerNameSchema.safeParse(name).success
  const save = async () => {
    setSaving(true)
    const saved = await commitPlayerName(name)
    setSaving(false)
    if (saved) notify(`You're now ${name.trim()}.`)
  }
  return (
    <div className="pause-name">
      <TitleName name={name} onName={setName} />
      {changed && (
        <button
          type="button"
          className="primary-button pause-name-save"
          disabled={!valid || saving}
          onClick={save}
        >
          {saving ? 'Saving…' : 'Save name'}
        </button>
      )}
    </div>
  )
}
