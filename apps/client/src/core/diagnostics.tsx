import { useFrame, useThree } from '@react-three/fiber'
import { useRapier } from '@react-three/rapier'
import { useEffect } from 'react'
import { audio } from '../audio'
import { eventDiagnostics } from '../net/events'
import { npcSpeech, presence, speech } from '../net/presence'
import { net } from '../net/status'
import { game } from '../state/game'
import { motion } from './motion'

declare global {
  interface Window {
    __THREE_GAME_DIAGNOSTICS__?: unknown
  }
}
export function Diagnostics() {
  const { gl } = useThree()
  const { world } = useRapier()
  const enabled = new URLSearchParams(location.search).has('debug')
  useFrame(() => {
    if (!enabled) return
    const state = game.state
    window.__THREE_GAME_DIAGNOSTICS__ = {
      renderer: {
        render: { ...gl.info.render },
        memory: { ...gl.info.memory },
      },
      state: {
        screen: state.screen,
        panel: state.panel,
        muted: state.muted,
        frame: motion.frames,
        position: state.position,
        currency: state.world.currency,
        quest: state.quest?.id,
        completed: state.completed.length,
        ride: state.ride,
        source: state.source,
        animation: motion.moving
          ? motion.sprinting
            ? 'sprint'
            : 'walk'
          : 'idle',
      },
      physics: {
        engine: 'rapier',
        timestep: 1 / 60,
        bodies: world.bodies.len(),
        colliders: world.colliders.len(),
        ccdBodies: 1,
      },
      audio: audio.stats(),
      network: {
        connection: net.state.connection,
        room: net.state.room,
        playerCount: net.state.players.length,
        selfId: net.state.selfId,
        guestName: state.guestName,
        remotePlayers: presence.size,
        npcLines: [...npcSpeech.entries()].filter(
          ([, value]) => value.until > performance.now()
        ),
        emotes: [...speech.entries()].filter(
          ([, value]) => value.until > performance.now()
        ),
        events: eventDiagnostics(),
      },
      fps: 1 / motion.dt,
      dpr: gl.getPixelRatio(),
    }
  })
  useEffect(
    () => () => {
      delete window.__THREE_GAME_DIAGNOSTICS__
    },
    []
  )
  return null
}
