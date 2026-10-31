import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { useStore } from '@tanstack/react-store'
import { Suspense } from 'react'
import { ACESFilmicToneMapping, PCFSoftShadowMap } from 'three'
import { CameraRig } from './core/camera'
import { Diagnostics } from './core/diagnostics'
import { Neighbors } from './core/neighbors'
import { Player } from './core/player'
import { RemotePlayers } from './core/remote-players'
import { Sun } from './core/sun'
import { Transport } from './core/transport'
import { XRGameHud, XRRuntime, xrStore } from './platform/xr'
import { game } from './state/game'
import { CityWorld } from './world'

export function Scene() {
  const paused = useStore(game, (s) => s.screen === 'paused')
  const generation = useStore(game, (s) => s.generation)
  const evening = useStore(game, (s) => s.timeOfDay === 'evening')
  return (
    <Canvas
      shadows
      camera={{ position: [14, 32, 39], fov: 49, near: 0.1, far: 220 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.toneMapping = ACESFilmicToneMapping
        gl.toneMappingExposure = 1.12
        gl.shadowMap.type = PCFSoftShadowMap
      }}
    >
      <color attach="background" args={[evening ? '#2d385f' : '#b1b8cb']} />
      <fog attach="fog" args={[evening ? '#2d385f' : '#b1b8cb', 75, 150]} />
      <hemisphereLight
        args={
          evening ? ['#a9b9ef', '#33465a', 1.45] : ['#fff3d5', '#7e8976', 2.1]
        }
      />
      <Sun evening={evening} />
      <Suspense fallback={null}>
        <XRRuntime store={xrStore} hud={<XRGameHud />}>
          <Physics gravity={[0, -20, 0]} timeStep={1 / 60} paused={paused}>
            <CityWorld evening={evening} />
            <Player key={generation} />
            <Transport />
            <Neighbors />
            <RemotePlayers />
            <Diagnostics />
          </Physics>
          <CameraRig />
        </XRRuntime>
      </Suspense>
    </Canvas>
  )
}
