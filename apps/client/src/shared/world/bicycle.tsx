import { Quaternion, Vector3 } from 'three'

type Point = [number, number, number]

function Tube({
  from,
  to,
  color = '#468779',
  radius = 0.04,
}: {
  from: Point
  to: Point
  color?: string
  radius?: number
}) {
  const a = new Vector3(...from)
  const b = new Vector3(...to)
  const length = a.distanceTo(b)
  const quaternion = new Vector3(0, 1, 0)
  const direction = b.clone().sub(a).normalize()
  return (
    <mesh
      position={a.add(b).multiplyScalar(0.5)}
      quaternion={new Quaternion().setFromUnitVectors(quaternion, direction)}
      castShadow
    >
      <cylinderGeometry args={[radius, radius, length, 8]} />
      <meshStandardMaterial color={color} roughness={0.75} />
    </mesh>
  )
}

/** Two-wheel city bicycle with a genuine optional front basket. */
export function Bicycle({ basket = false }: { basket?: boolean }) {
  const rear: Point = [0, 0.4, -0.66]
  const front: Point = [0, 0.4, 0.7]
  const crank: Point = [0, 0.36, -0.05]
  const saddle: Point = [0, 0.92, -0.2]
  const neck: Point = [0, 0.98, 0.42]
  const frame = basket ? '#ba7053' : '#468779'
  return (
    <group>
      {[rear, front].map((position) => (
        <group
          key={position[2]}
          position={position}
          rotation={[0, Math.PI / 2, 0]}
        >
          <mesh castShadow>
            <torusGeometry args={[0.35, 0.043, 8, 24]} />
            <meshStandardMaterial color="#29393a" roughness={0.9} />
          </mesh>
          <mesh>
            <torusGeometry args={[0.306, 0.013, 5, 24]} />
            <meshStandardMaterial color="#bfc3b9" metalness={0.45} />
          </mesh>
          {[0, 1, 2, 3, 4, 5].map((angle) => (
            <mesh key={angle} rotation={[0, 0, (angle * Math.PI) / 6]}>
              <boxGeometry args={[0.6, 0.009, 0.009]} />
              <meshStandardMaterial color="#bfc3b9" />
            </mesh>
          ))}
        </group>
      ))}
      {[
        [rear, saddle],
        [rear, crank],
        [crank, saddle],
        [crank, neck],
        [saddle, neck],
        [neck, front],
      ].map(([from, to]) => (
        <Tube
          key={`${from.join(',')}:${to.join(',')}`}
          from={from}
          to={to}
          color={frame}
        />
      ))}
      <Tube
        from={[0, 0.95, 0.44]}
        to={[0, 1.16, 0.5]}
        color="#bec5ba"
        radius={0.024}
      />
      <Tube
        from={[-0.32, 1.16, 0.5]}
        to={[0.32, 1.16, 0.5]}
        color="#364a45"
        radius={0.026}
      />
      <mesh position={[0, 0.95, -0.24]} castShadow>
        <boxGeometry args={[0.27, 0.08, 0.28]} />
        <meshStandardMaterial color="#453b34" />
      </mesh>
      <Tube
        from={[-0.2, 0.36, -0.05]}
        to={[0.2, 0.36, -0.05]}
        color="#afb6ac"
        radius={0.025}
      />
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.2, 0.36, -0.05]}>
          <boxGeometry args={[0.1, 0.035, 0.13]} />
          <meshStandardMaterial color="#34413d" />
        </mesh>
      ))}
      {basket && (
        <group position={[0, 1.02, 0.8]}>
          <mesh position={[0, -0.13, 0]}>
            <boxGeometry args={[0.45, 0.025, 0.3]} />
            <meshStandardMaterial color="#b59153" />
          </mesh>
          {[-1, 1].map((side) => (
            <group key={side}>
              <mesh position={[side * 0.225, 0, 0]}>
                <boxGeometry args={[0.025, 0.26, 0.32]} />
                <meshStandardMaterial color="#c7a56a" />
              </mesh>
              <mesh position={[0, 0, side * 0.15]}>
                <boxGeometry args={[0.45, 0.26, 0.025]} />
                <meshStandardMaterial color="#c7a56a" />
              </mesh>
            </group>
          ))}
        </group>
      )}
    </group>
  )
}
