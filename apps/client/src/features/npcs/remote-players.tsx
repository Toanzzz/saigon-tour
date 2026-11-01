import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { NPC_POSITIONS, type NpcId, type PresencePlayer } from '@saigon/shared'
import { useEffect, useRef, useState } from 'react'
import type { Group } from 'three'
import { npcPosition } from '@/shared/api/city'
import {
  interpolate,
  nearestPlayers,
  npcSpeech,
  presence,
  speech,
} from '@/shared/api/presence'
import { motion } from '@/shared/runtime/motion'
import { game } from '@/shared/state/game'
import { Character, Vehicle } from '@/shared/world'
import { useXRPresenting } from '@/shared/xr'

export function RemotePlayers() {
  const [players, setPlayers] = useState<PresencePlayer[]>([])
  const ids = useRef('')
  const elapsed = useRef(0)
  useFrame((_, delta) => {
    elapsed.current += delta
    if (elapsed.current < 0.2) return
    elapsed.current = 0
    const nearest = nearestPlayers(
      game.state.position,
      matchMedia('(max-width: 700px), (pointer: coarse)').matches ? 6 : 8
    )
    const key = nearest.map((player) => player.id).join(',')
    if (key !== ids.current) {
      ids.current = key
      setPlayers(nearest)
    }
  })
  return (
    <>
      {players.map((player) => (
        <RemotePlayer key={player.id} player={player} />
      ))}
      {(Object.keys(NPC_POSITIONS) as NpcId[]).map((npc) => (
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
  const [ride, setRide] = useState(player.ride)
  const [moving, setMoving] = useState(false)
  const previous = useRef(player.position)
  const elapsed = useRef(0)
  const xr = useXRPresenting()
  useFrame((_, delta) => {
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
    elapsed.current += delta
    if (elapsed.current > 0.2) {
      elapsed.current = 0
      setRide((value) => (value === sample.ride ? value : sample.ride))
      const speed = Math.hypot(
        previous.current[0] - sample.position[0],
        previous.current[2] - sample.position[2]
      )
      setMoving(speed > 0.05)
      previous.current = sample.position
    }
  })
  const mode =
    ride === 'bus' || ride === 'metro' || ride === 'xeom' || ride === 'cyclo'
      ? ride
      : null
  return (
    <group ref={ref} position={player.position}>
      {mode && (
        <group position={[0, -0.9, 0]}>
          <Vehicle mode={mode} />
        </group>
      )}
      <Character
        path="people/player-tourist"
        color={player.color}
        position={[0, mode ? 0.3 : -0.8, 0]}
        animation={mode ? 'sit' : moving ? 'walk' : 'idle'}
      />
      {!xr && (
        <group ref={label}>
          <SpeechLabel playerId={player.id} name={player.name} />
        </group>
      )}
    </group>
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
  const [text, setText] = useState('')
  const current = useRef('')
  const elapsed = useRef(0)
  const xr = useXRPresenting()
  useFrame((_, delta) => {
    elapsed.current += delta
    if (elapsed.current < 0.1) return
    elapsed.current = 0
    const bubble = npc
      ? npcSpeech.get(npc)
      : speech.get((self ? game.state.guestId : playerId) ?? '')
    const next = bubble && bubble.until > performance.now() ? bubble.text : ''
    if (next !== current.current) {
      current.current = next
      setText(next)
    }
  })
  useEffect(
    () => () => {
      current.current = ''
    },
    []
  )
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
