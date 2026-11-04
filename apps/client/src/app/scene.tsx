import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { useSelector } from '@tanstack/react-store'
import { Suspense } from 'react'
import { ACESFilmicToneMapping } from 'three'
import { Diagnostics } from '@/app/diagnostics'
import { Atmosphere } from '@/features/city/atmosphere'
import { Cries } from '@/features/city/cries'
import { CityEvents } from '@/features/city/events'
import { WetPavement } from '@/features/city/puddles'
import { Rain } from '@/features/city/rain'
import { Sun } from '@/features/city/sun'
import { Traffic } from '@/features/city/traffic'
import { Coins } from '@/features/collectibles'
import { Neighbors } from '@/features/npcs/neighbors'
import { RemotePlayers } from '@/features/npcs/remote-players'
import { Umbrellas } from '@/features/npcs/umbrellas'
import { MouseControls, NavigationMarker } from '@/features/player'
import { CameraRig } from '@/features/player/camera'
import { Player } from '@/features/player/player'
import { Transport } from '@/features/transport/transport'
import { city } from '@/shared/api/city'
import { game } from '@/shared/state/game'
import { LoadingSignal, SuspensePanel } from '@/shared/ui/loading-panel'
import { CityWorld } from '@/shared/world'
import { LOOK } from '@/shared/world/look-flag'
import { XRRuntime, xrStore } from '@/shared/xr'
import { XRGameHud } from '@/widgets/xr-hud'

export function Scene() {
  const rain = useSelector(city, (state) => state.weather === 'rain')
  const paused = useSelector(game, (s) => s.screen === 'paused')
  const generation = useSelector(game, (s) => s.generation)
  const evening = useSelector(game, (s) => s.timeOfDay === 'evening')
  const debug = new URLSearchParams(location.search).has('debug')
  return (
    <>
      <Canvas
        shadows="percentage"
        camera={{ position: [14, 32, 39], fov: 49, near: 0.1, far: 220 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.toneMapping = ACESFilmicToneMapping
          gl.toneMappingExposure = LOOK === 'comic' ? 1.2 : 1.12
        }}
      >
        <Atmosphere rain={rain} evening={evening} />
        <Sun evening={evening} />
        <Suspense fallback={<LoadingSignal scope="scene" />}>
          <XRRuntime store={xrStore} hud={<XRGameHud />}>
            <Physics
              gravity={[0, -20, 0]}
              timeStep={1 / 60}
              paused={paused}
              debug={debug}
            >
              <CityWorld evening={evening} />
              <WetPavement />
              <Coins />
              <Player key={generation} />
              <Transport />
              <Neighbors />
              <Umbrellas />
              <CityEvents />
              <Cries />
              <Traffic />
              <RemotePlayers />
              <Diagnostics />
            </Physics>
            <Rain />
            <CameraRig />
            <MouseControls />
            <NavigationMarker />
          </XRRuntime>
        </Suspense>
      </Canvas>
      <SuspensePanel scope="scene" />
    </>
  )
}
