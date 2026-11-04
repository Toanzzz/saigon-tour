import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { NPCS, type NpcId, type PresencePlayer } from '@saigon/shared'
import { useSelector } from '@tanstack/react-store'
import { useEffect, useRef } from 'react'
import type { Group } from 'three'
import { Pet } from '@/features/pets'
import { npcPosition } from '@/shared/api/city'
import { interpolate, presence } from '@/shared/api/presence'
import {
  clearVisiblePlayers,
  presenceView,
  samplePresenceView,
} from '@/shared/api/presence-view'
import { motion } from '@/shared/runtime/motion'
import { Avatar, PersonalVehicle, Vehicle } from '@/shared/world'
import { riderPosition } from '@/shared/world/vehicles'
import { useXRPresenting } from '@/shared/xr'

/** Single ~5 Hz ticker that refreshes the React-visible presence slice. */
function PresenceTicker() {
  const elapsed = useRef(0)
  useEffect(() => clearVisiblePlayers, [])
  useFrame(({ camera }, delta) => {
    elapsed.current += delta
    if (elapsed.current < 0.2) return
    elapsed.current = 0
    samplePresenceView(
      matchMedia('(max-width: 700px), (pointer: coarse)').matches ? 6 : 8,
      camera
    )
  })
  return null
}

export function RemotePlayers() {
  const players = useSelector(presenceView, (view) => view.nearest)
  return (
    <>
      <PresenceTicker />
      {players.map((player) => (
        <RemotePlayer key={player.id} player={player} />
      ))}
      {(Object.keys(NPCS) as NpcId[]).map((npc) => (
        <NpcSpeech key={npc} npc={npc} />
      ))}
      <SelfSpeech />
    </>
  )
}

function NpcSpeech({ npc }: { npc: NpcId }) {
  const ref = useRef<Group>(null)
  useFrame((_, delta) => {
    if (!ref.current) return
    const target = npcPosition(npc)
    const alpha = 1 - Math.exp(-Math.min(delta, 0.05) * 6)
    ref.current.position.x += (target[0] - ref.current.position.x) * alpha
    ref.current.position.z += (target[2] - ref.current.position.z) * alpha
  })
  return (
    <group ref={ref} position={npcPosition(npc)}>
      <SpeechLabel npc={npc} />
    </group>
  )
}

function RemotePlayer({ player }: { player: PresencePlayer }) {
  const ref = useRef<Group>(null)
  const label = useRef<Group>(null)
  const view = useSelector(presenceView, (v) => v.remote[player.id])
  const ride = view?.ride ?? player.ride
  const moving = view?.moving ?? false
  const xr = useXRPresenting()
  // Html projects at priority 0. Apply the interpolated pose first so its
  // screen anchor and the rendered avatar use the same frame.
  useFrame(() => {
    const entry = presence.get(player.id)
    if (!entry || !ref.current) {
      if (ref.current) ref.current.visible = false
      return
    }
    const sample = interpolate(entry.samples, performance.now())
    if (!sample) return
    ref.current.visible = sample.ride !== 'loading'
    ref.current.position.set(...sample.position)
    ref.current.rotation.y = sample.heading
    if (label.current) label.current.rotation.y = -sample.heading
  }, -1)
  const mode =
    ride === 'bus' || ride === 'metro' || ride === 'xeom' || ride === 'cyclo'
      ? ride
      : null
  return (
    <>
      <group ref={ref} position={player.position}>
        {mode && (
          <group position={[0, -0.9, 0]}>
            <Vehicle mode={mode} />
          </group>
        )}
        <Avatar
          body={player.body}
          color={player.color}
          position={
            !mode && player.look?.vehicle
              ? (riderPosition(player.look.vehicle).map((value, index) =>
                  index === 1 ? value - 0.8 : value
                ) as [number, number, number])
              : [0, mode ? 0.3 : -0.8, 0]
          }
          animation={
            mode
              ? 'sit'
              : player.look?.vehicle
                ? 'drive'
                : moving
                  ? 'walk'
                  : 'idle'
          }
          look={player.look}
        />
        {!mode && player.look?.vehicle && (
          <group position={[0, -0.8, 0]}>
            <PersonalVehicle id={player.look.vehicle} />
          </group>
        )}
        {!xr && (
          <group ref={label}>
            <SpeechLabel playerId={player.id} name={player.name} />
          </group>
        )}
      </group>
      {!mode && player.look?.pet && (
        <Pet
          id={player.look.pet}
          target={() => {
            const sample = interpolate(
              presence.get(player.id)?.samples ?? [],
              performance.now()
            )
            return sample?.position ?? player.position
          }}
          heading={() =>
            interpolate(
              presence.get(player.id)?.samples ?? [],
              performance.now()
            )?.heading ?? 0
          }
        />
      )}
    </>
  )
}

function SelfSpeech() {
  const ref = useRef<Group>(null)
  useFrame(() => {
    ref.current?.position.copy(motion.position)
  })
  return (
    <group ref={ref}>
      <SpeechLabel self />
    </group>
  )
}

function SpeechLabel({
  playerId,
  name,
  npc,
  self,
}: {
  playerId?: string
  name?: string
  npc?: NpcId
  self?: boolean
}) {
  const text = useSelector(presenceView, (view) => {
    if (npc) return view.bubbles.npcs[npc] ?? ''
    if (self) return view.bubbles.self
    return (playerId && view.bubbles.players[playerId]) || ''
  })
  const xr = useXRPresenting()
  if (xr || (!name && !text)) return null
  return (
    <Html
      center
      position={[0, npc ? 3.4 : 3, 0]}
      distanceFactor={19}
      style={{ pointerEvents: 'none' }}
    >
      {text && (
        <div className="presence-bubble" role="status">
          {text}
        </div>
      )}
      {name && <span className="remote-tag">{name}</span>}
    </Html>
  )
}
