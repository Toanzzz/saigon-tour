import { OrbitControls, useProgress } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { useSelector } from '@tanstack/react-store'
import { type ComponentRef, Suspense, useEffect, useRef } from 'react'
import { ACESFilmicToneMapping } from 'three'
import { m } from '@/shared/i18n'
import { CityWorld } from '@/shared/world'
import { PLACES, placeName } from '@/shared/world/places'
import { inspectMap, mapInspector } from './store'
import './style.css'

function InspectionCamera() {
  const focus = useSelector(mapInspector, (s) => s.focus)
  const overhead = useSelector(mapInspector, (s) => s.overhead)
  const { camera, size } = useThree()
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null)
  useEffect(() => {
    const place = PLACES[focus as keyof typeof PLACES]
    const [x, , z] = place?.at ?? [36, 0, -28]
    const distance = place ? 42 : 195
    const fit = Math.max(1, size.height / size.width)
    camera.position.set(
      x + (overhead ? 0 : distance * 0.35),
      distance * fit,
      z + (overhead ? 0.01 : distance * 0.65)
    )
    controls.current?.target.set(x, 0, z)
    controls.current?.update()
  }, [camera, focus, overhead, size.width, size.height])
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      minDistance={5}
      maxDistance={600}
      maxPolarAngle={Math.PI / 2 - 0.03}
      enableDamping
      screenSpacePanning
    />
  )
}

export function MapInspector() {
  const state = useSelector(mapInspector, (s) => s)
  const loading = useProgress((s) => s.active)
  return (
    <main className="map-inspector" aria-label={m.map_debug_title()}>
      <Canvas
        camera={{ position: [100, 195, 100], fov: 49, near: 0.1, far: 1500 }}
        dpr={[1, 1.5]}
        onCreated={({ gl }) => {
          gl.toneMapping = ACESFilmicToneMapping
          gl.toneMappingExposure = 1.2
        }}
      >
        <color attach="background" args={['#b1c9d1']} />
        <hemisphereLight args={['#fff3d5', '#8e9686', 1.85]} />
        <directionalLight position={[-22, 80, 23]} intensity={2.9} />
        <Suspense fallback={null}>
          <Physics paused debug={state.colliders}>
            <CityWorld />
          </Physics>
        </Suspense>
        <InspectionCamera />
      </Canvas>
      <section className="map-inspector-controls">
        <strong>{m.map_debug_title()}</strong>
        {loading && <span role="status">{m.app_loading()}</span>}
        <label>
          {m.map_debug_focus()}
          <select
            value={state.focus}
            onChange={(event) => inspectMap({ focus: event.target.value })}
          >
            <option value="all">{m.map_debug_all()}</option>
            {Object.keys(PLACES).map((id) => (
              <option key={id} value={id}>
                {placeName(id as keyof typeof PLACES)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          aria-pressed={state.overhead}
          onClick={() => inspectMap({ overhead: !state.overhead })}
        >
          {m.map_debug_overhead()}
        </button>
        <label>
          <input
            type="checkbox"
            checked={state.colliders}
            onChange={(event) =>
              inspectMap({ colliders: event.target.checked })
            }
          />
          {m.map_debug_colliders()}
        </label>
        <p>{m.map_debug_help()}</p>
        <a href={import.meta.env.BASE_URL}>{m.map_debug_exit()}</a>
      </section>
    </main>
  )
}
