import { Model, type Vec3 } from './assets'
import { Block, Blocks, Sign } from './primitives'

export function Vehicle({
  mode,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}: {
  mode: 'bus' | 'metro' | 'cyclo' | 'xeom'
  position?: Vec3
  rotation?: Vec3
}) {
  return (
    <group position={position} rotation={rotation}>
      {mode === 'bus' ? (
        <Bus />
      ) : mode === 'metro' ? (
        <Metro />
      ) : (
        <Bike cyclo={mode === 'cyclo'} />
      )}
    </group>
  )
}

function Bus() {
  return (
    <group>
      <Model path="cars/van" scale={[1.35, 1.35, 2]} />
      <Block
        position={[0, 0.85, 0]}
        scale={[2.04, 0.65, 5.2]}
        color="#257b70"
        shadow
      />
      <Block
        position={[0, 1.8, 0]}
        scale={[1.9, 0.16, 5.15]}
        color="#eee0bd"
        shadow
      />
      <Blocks
        color="#d9bd6b"
        placements={[-1.03, 1.03].map((x) => ({
          position: [x, 0.7, 0],
          scale: [0.025, 0.1, 4.9],
        }))}
      />
      <Blocks
        color="#9bc7c2"
        placements={[-1.04, 1.04].flatMap((x) =>
          [-1.8, -0.85, 0.1, 1.05].map((z) => ({
            position: [x, 1.37, z],
            scale: [0.025, 0.55, 0.82],
          }))
        )}
      />
      <Sign
        text="01 · BẾN THÀNH"
        position={[0, 1.84, 2.72]}
        width={1.85}
        height={0.32}
        color="#153d37"
        ink="#ffdb88"
      />
      <Sign
        text="SAIGON GREEN"
        position={[1.05, 0.92, 0]}
        rotation={[0, Math.PI / 2, 0]}
        width={3.2}
        height={0.42}
        color="#257b70"
      />
      <Sign
        text="SAIGON GREEN"
        position={[-1.05, 0.92, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        width={3.2}
        height={0.42}
        color="#257b70"
      />
    </group>
  )
}
function Metro() {
  return (
    <group>
      <Model path="trains/train-tram-modern" scale={[1.6, 1, 2.1]} />
      <Sign
        text="METRO 1"
        position={[0, 1.8, 2.82]}
        width={1.4}
        height={0.32}
        color="#155c84"
      />
    </group>
  )
}
function Wheel({
  position,
  radius = 0.42,
}: {
  position: Vec3
  radius?: number
}) {
  return (
    <group position={position} rotation={[0, Math.PI / 2, 0]}>
      <mesh castShadow>
        <torusGeometry args={[radius, 0.095, 6, 16]} />
        <meshStandardMaterial color="#2d3433" roughness={0.94} />
      </mesh>
      <mesh>
        <torusGeometry args={[radius - 0.1, 0.035, 5, 16]} />
        <meshStandardMaterial
          color="#d1ccba"
          metalness={0.55}
          roughness={0.5}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.25, 8]} />
        <meshStandardMaterial color="#a7aaa1" metalness={0.5} />
      </mesh>
      {[0, 1, 2, 3].map((angle) => (
        <Block
          key={angle}
          position={[0, 0, 0]}
          rotation={[0, 0, (angle * Math.PI) / 4]}
          scale={[radius * 1.6, 0.025, 0.03]}
          color="#b8b9a9"
        />
      ))}
    </group>
  )
}
function Bike({ cyclo }: { cyclo: boolean }) {
  return (
    <group>
      <Wheel position={[0, 0.5, -0.82]} />
      {cyclo ? (
        <>
          <Wheel position={[-0.75, 0.5, 0.9]} />
          <Wheel position={[0.75, 0.5, 0.9]} />
        </>
      ) : (
        <Wheel position={[0, 0.5, 0.85]} />
      )}
      <Block
        position={[0, 0.8, 0]}
        scale={[0.35, 0.32, 1.4]}
        color={cyclo ? '#997348' : '#a34b3c'}
        rotation={[0.12, 0, 0]}
        shadow
      />
      <Block
        position={[0, 1.08, -0.45]}
        scale={[0.55, 0.18, 0.9]}
        color="#33423e"
        shadow
      />
      <Block
        position={[0, 1.05, 0.62]}
        scale={[0.12, 1.05, 0.12]}
        rotation={[-0.2, 0, 0]}
        color="#b8b9a9"
      />
      <Block
        position={[0, 1.5, 0.5]}
        scale={[0.9, 0.08, 0.09]}
        color="#465c54"
      />
      <mesh position={[0, 1.28, 0.77]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.16, 0.16, 0.13, 12]} />
        <meshStandardMaterial
          color="#ffdd91"
          emissive="#85683c"
          emissiveIntensity={0.25}
        />
      </mesh>
      {cyclo && (
        <>
          <Block
            position={[0, 0.7, 0.75]}
            scale={[1.3, 0.22, 1.05]}
            color="#af4635"
            shadow
          />
          <Block
            position={[0, 1.15, 0.2]}
            scale={[1.3, 0.9, 0.18]}
            color="#b9503d"
            shadow
          />
          <Block
            position={[0, 2, 0.7]}
            scale={[1.55, 0.15, 1.4]}
            color="#d5b67d"
            shadow
          />
          <Blocks
            color="#594f3d"
            placements={[-0.68, 0.68].map((x) => ({
              position: [x, 1.4, 0.2],
              scale: [0.05, 1.25, 0.05],
            }))}
          />
        </>
      )}
    </group>
  )
}
