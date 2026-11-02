import { useFrame, useThree } from '@react-three/fiber'
import { useRapier } from '@react-three/rapier'
import { useEffect } from 'react'
import { gameUiRenders } from '@/app/game-ui'
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
  const { gl, scene } = useThree()
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
        body: state.body,
        muted: state.muted,
        frame: motion.frames,
        gameUiRenders,
        position: state.position,
        currency: state.world.currency,
        quests: state.quests,
        trackedQuestId: state.trackedQuestId,
        completed: state.completed.length,
        unlocks: state.unlocks,
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
        waiting: net.state.waiting,
        room: net.state.room,
        playerCount: net.state.players.length,
        selfId: net.state.selfId,
        guestName: state.guestName,
        serverRevision: state.serverRevision,
        partyVersion: net.state.partyVersion,
        remotePlayers: presence.size,
        remoteBodies: [...presence.values()]
          .map((entry) => entry.samples.at(-1)?.player.body)
          .filter(Boolean),
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
      weather: (() => {
        let rainStreaks = 0
        let puddles = 0
        let wetTint = 0
        let umbrellas = 0
        const umbrellaPositions: [number, number, number][] = []
        scene.traverse((object) => {
          const mesh = object as unknown as {
            name?: string
            count?: number
            isInstancedMesh?: boolean
            getMatrixAt?: (i: number, m: unknown) => void
          }
          if (mesh.name === 'rain-streaks') rainStreaks = mesh.count ?? 0
          if (mesh.name === 'puddles') puddles = mesh.count ?? 0
          if (mesh.name === 'wet-tint') wetTint = mesh.count ?? 0
        })
        // Count open umbrellas by walking the canopy mesh matrices.
        const canopy = scene.getObjectByName('umbrella-canopy') as unknown as {
          count?: number
          instanceMatrix?: { array: ArrayLike<number> }
        } | null
        if (canopy?.instanceMatrix) {
          const array = canopy.instanceMatrix.array
          for (let i = 0; i < (canopy.count ?? 0); i++) {
            const sx = array[i * 16]
            if (sx > 0.05) {
              umbrellas++
              umbrellaPositions.push([
                array[i * 16 + 12],
                array[i * 16 + 13],
                array[i * 16 + 14],
              ])
            }
          }
        }
        return {
          weather: city.state.weather,
          rainStreaks,
          puddles,
          wetTint,
          umbrellas,
          umbrellaPositions,
        }
      })(),
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
