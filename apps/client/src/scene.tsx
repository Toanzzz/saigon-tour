import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { useStore } from '@tanstack/react-store'
import { Suspense } from 'react'
import { ACESFilmicToneMapping, PCFSoftShadowMap } from 'three'
import { CameraRig } from './core/camera'
import { Diagnostics } from './core/diagnostics'
import { Neighbors } from './core/neighbors'
import { Player } from './core/player'
import { Transport } from './core/transport'
import { XRGameHud, XRRuntime, xrStore } from './platform/xr'
import { game } from './state/game'
import { CityWorld } from './world'

export function Scene() {
  const paused = useStore(game, (s) => s.screen === 'paused')
  const generation = useStore(game, (s) => s.generation)
  return (
    <Canvas
      shadows
      camera={{ position: [14, 32, 39], fov: 49, near: 0.1, far: 180 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.toneMapping = ACESFilmicToneMapping
        gl.toneMappingExposure = 1.12
        gl.shadowMap.type = PCFSoftShadowMap
      }}
    >
      <color attach="background" args={['#e5d4b1']} />
      <fog attach="fog" args={['#e5d4b1', 75, 150]} />
      <hemisphereLight args={['#fff3d5', '#7e8976', 2.1]} />
      <directionalLight
        position={[-22, 38, 23]}
        intensity={3.2}
        color="#ffdfaa"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-55}
        shadow-camera-right={55}
        shadow-camera-top={45}
        shadow-camera-bottom={-45}
        shadow-camera-far={110}
        shadow-normalBias={0.06}
      />
      <Suspense fallback={null}>
        <XRRuntime store={xrStore} hud={<XRGameHud />}>
          <Physics gravity={[0, -20, 0]} timeStep={1 / 60} paused={paused}>
            <CityWorld />
            <Player key={generation} />
            <Transport />
            <Neighbors />
            <Diagnostics />
          </Physics>
          <CameraRig />
        </XRRuntime>
      </Suspense>
    </Canvas>
  )
}
