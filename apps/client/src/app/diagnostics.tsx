import { useFrame, useThree } from '@react-three/fiber'
import { useRapier } from '@react-three/rapier'
import { useEffect } from 'react'
import { crowdStats } from '@/features/npcs/residents'
import { city } from '@/shared/api/city'
import { eventDiagnostics } from '@/shared/api/events'
import { npcSpeech, presence, speech } from '@/shared/api/presence'
import { net } from '@/shared/api/status'
import { audio } from '@/shared/audio'
import { motion } from '@/shared/runtime/motion'
import { game } from '@/shared/state/game'

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
        quests: state.quests,
        trackedQuestId: state.trackedQuestId,
        completed: state.completed.length,
        ride: state.ride,
        timeOfDay: state.timeOfDay,
        viewpoint: state.viewpoint,
        source: state.source,
        animation: motion.moving
          ? motion.sprinting
            ? 'sprint'
            : 'walk'
          : 'idle',
      },
      world: crowdStats(),
      city: city.state,
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
        serverRevision: state.serverRevision,
        partyVersion: net.state.partyVersion,
        remotePlayers: presence.size,
        npcLines: [...npcSpeech.entries()].filter(
          ([, value]) => value.until > performance.now()
        ),
        emotes: [...speech.entries()].filter(
          ([, value]) => value.until > performance.now()
        ),
        events: eventDiagnostics(),
        party: net.state.party,
        invite: net.state.invite,
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
