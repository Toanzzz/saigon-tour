import { PlayerNameSchema } from '@saigon/shared'
import { useMutation } from '@tanstack/react-query'
import { useSelector } from '@tanstack/react-store'
import { commitProfile, TitleName } from '@/app/title-identity'
import { m } from '@/shared/i18n'
import { game, notify, update } from '@/shared/state/game'
import { nameDraft, setNameDraft } from '@/shared/state/ui'

/** Rename during play; Save appears once the name differs from the saved one. */
export function PauseName() {
  const guestName = useSelector(game, (s) => s.guestName)
  const body = useSelector(game, (s) => s.body)
  const name = useSelector(nameDraft, (s) => s.name)
  const changed = name.trim() !== (guestName ?? '')
  const valid = PlayerNameSchema.safeParse(name).success
  const save = useMutation({
    mutationFn: () => commitProfile(name, game.state.body),
    onSuccess: (saved) => {
      if (saved) notify(m.toast_renamed({ name: name.trim() }))
    },
  })
  return (
    <div className="pause-name">
      <TitleName
        name={name}
        onName={setNameDraft}
        body={body}
        onBody={(next) => update({ body: next })}
      />
      {changed && (
        <button
          type="button"
          className="primary-button pause-name-save"
          disabled={!valid || save.isPending}
          onClick={() => save.mutate()}
        >
          {save.isPending ? m.pause_saving() : m.pause_save_name()}
        </button>
      )}
    </div>
  )
}
