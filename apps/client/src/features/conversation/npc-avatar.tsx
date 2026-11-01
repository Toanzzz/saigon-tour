import { NPC_LOOKS, NPCS, type NpcId } from '@saigon/shared'
import { useEffect } from 'react'
import { PEOPLE } from '@/shared/world/places'
import { requestAvatar, useAvatar } from './avatar-render'

/** Package portrait URL for an NPC that ships one, else null. */
function packageAvatar(id: NpcId, size: 'lg' | 'sm'): string | null {
  return NPC_LOOKS[id]?.avatar
    ? `${import.meta.env.BASE_URL}npcs/${id}/avatar-${size}.webp`
    : null
}

export function NpcAvatar({
  id,
  size = 'lg',
}: {
  id: NpcId
  size?: 'lg' | 'sm'
}) {
  const person = PEOPLE[id]
  const look = NPC_LOOKS[id]
  const packaged = packageAvatar(id, size)
  const key = requestAvatar(person.model, person.color)
  const rendered = useAvatar(key)
  useEffect(() => {
    if (!packaged) requestAvatar(person.model, person.color)
  }, [packaged, person.model, person.color])
  // Fallback order: packaged portrait, then the runtime render, then the initial.
  const url = packaged ?? rendered
  const initial = NPCS[id].name.split(' ').at(-1)?.slice(0, 1) ?? '?'
  return (
    <span
      className={`npc-avatar npc-avatar-${size}`}
      style={{
        ['--avatar-color' as string]: person.color,
        background: look.portraitBg ?? 'var(--avatar-color)',
      }}
    >
      {url ? (
        <img src={url} alt="" draggable={false} />
      ) : (
        <span aria-hidden="true">{initial}</span>
      )}
    </span>
  )
}
