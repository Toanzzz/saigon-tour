import { NPC_LOOKS, NPCS, type NpcId } from '@saigon/shared'
import { useEffect } from 'react'
import { PEOPLE } from '@/shared/world/places'
import { requestAvatar, useAvatar } from './avatar-render'

export function NpcAvatar({
  id,
  size = 'lg',
}: {
  id: NpcId
  size?: 'lg' | 'sm'
}) {
  const person = PEOPLE[id]
  const look = NPC_LOOKS[id]
  const key = requestAvatar(person.model, person.color)
  const url = useAvatar(key)
  useEffect(() => {
    requestAvatar(person.model, person.color)
  }, [person.model, person.color])
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
