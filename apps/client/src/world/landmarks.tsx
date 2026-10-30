import { useMemo } from 'react'
import { ExtrudeGeometry, Shape } from 'three'
import { Model, type Placement, type Vec3 } from './assets'
import { Block, Blocks, Sign } from './primitives'

function Arch({
  position,
  width = 1.3,
  height = 2.8,
  color = '#244c4a',
}: {
  position: Vec3
  width?: number
  height?: number
  color?: string
}) {
  const geometry = useMemo(() => {
    const shape = new Shape()
    const r = width / 2
    shape.moveTo(-r, 0)
    shape.lineTo(r, 0)
    shape.lineTo(r, height - r)
    shape.absarc(0, height - r, r, 0, Math.PI, false)
    shape.lineTo(-r, 0)
    return new ExtrudeGeometry(shape, {
      depth: 0.12,
      bevelEnabled: true,
      bevelSegments: 1,
      steps: 1,
      bevelSize: 0.05,
      bevelThickness: 0.04,
      curveSegments: 10,
    })
  }, [width, height])
  return (
    <mesh geometry={geometry} position={position} receiveShadow>
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  )
}

export function Cathedral() {
  const ledges: Placement[] = []
  const accents: Placement[] = []
  for (const x of [-4, 4]) {
    for (const y of [0.4, 3.5, 6.8, 10.1])
      ledges.push({ position: [x, y, 0], scale: [3.5, 0.22, 3.8] })
    for (const edge of [-1.4, 1.4])
      accents.push({ position: [x + edge, 5.2, 1.78], scale: [0.2, 9.8, 0.15] })
  }
  return (
    <group position={[27, 0, -30]}>
      <Block
        position={[0, 0.18, -1.3]}
        scale={[15, 0.36, 11]}
        color="#d1b993"
      />
      <Block
        position={[0, 3.4, -2]}
        scale={[8, 6.5, 8]}
        color="#b76a50"
        shadow
      />
      <Block position={[0, 6.9, -2]} scale={[9, 0.4, 9]} color="#f0d8a8" />
      <mesh position={[0, 8.3, -2]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[6.2, 3, 4]} />
        <meshStandardMaterial color="#713f35" roughness={0.9} />
      </mesh>
      {[-4, 4].map((x) => (
        <group key={x}>
          <Block
            position={[x, 5.2, 0]}
            scale={[3.2, 10, 3.5]}
            color="#c87959"
            shadow
          />
          <Block
            position={[x, 11, 0]}
            scale={[2.7, 1.6, 3]}
            color="#e9d4b0"
            shadow
          />
          <Arch position={[x, 7.7, 1.83]} width={1.1} height={2.1} />
          <Arch position={[x, 4.2, 1.83]} width={1.1} height={1.9} />
          <mesh
            position={[x, 13.1, 0]}
            rotation={[0, Math.PI / 4, 0]}
            castShadow
          >
            <coneGeometry args={[2.3, 3.2, 4]} />
            <meshStandardMaterial color="#718981" roughness={0.8} />
          </mesh>
          <Block
            position={[x, 15.1, 0]}
            scale={[0.1, 1.2, 0.12]}
            color="#f4e3bb"
          />
          <Block
            position={[x, 15.25, 0]}
            scale={[0.7, 0.1, 0.12]}
            color="#f4e3bb"
          />
        </group>
      ))}
      <Blocks placements={ledges} color="#f0d8b0" />
      <Blocks placements={accents} color="#f0d8b0" />
      <Arch
        position={[0, 0.36, 2.07]}
        width={2.4}
        height={3.7}
        color="#493b36"
      />
      <Arch
        position={[-2.8, 0.36, 2.07]}
        width={1.3}
        height={2.7}
        color="#493b36"
      />
      <Arch
        position={[2.8, 0.36, 2.07]}
        width={1.3}
        height={2.7}
        color="#493b36"
      />
      <mesh position={[0, 5.4, 2.09]}>
        <torusGeometry args={[0.9, 0.16, 5, 18]} />
        <meshStandardMaterial color="#f2d69e" />
      </mesh>
      <Sign
        text="NHÀ THỜ ĐỨC BÀ"
        position={[0, 0.9, 4.3]}
        width={4.7}
        height={0.9}
        color="#774b40"
      />
    </group>
  )
}

export function MarketStall() {
  return (
    <group position={[-23, 0, 2]}>
      <Block
        position={[0, 0.52, -0.65]}
        scale={[3.7, 1.04, 1.1]}
        color="#b77544"
        shadow
      />
      <Block position={[0, 1.1, -0.6]} scale={[4, 0.17, 1.3]} color="#f3d7a5" />
      <Blocks
        color="#3f6a61"
        placements={[-1.8, 1.8].map((x) => ({
          position: [x, 1.6, -0.8],
          scale: [0.12, 3.2, 0.12],
        }))}
      />
      <Block
        position={[0, 3.1, -0.6]}
        scale={[4.1, 0.14, 1.9]}
        rotation={[0.1, 0, 0]}
        color="#e5d7a8"
      />
      <Blocks
        color="#b95642"
        placements={[-1.6, -0.8, 0, 0.8, 1.6].map((x) => ({
          position: [x, 3.18, -0.6],
          scale: [0.4, 0.04, 1.9],
          rotation: [0.1, 0, 0],
        }))}
      />
      <Sign
        text="PHỞ CÔ HOA"
        subtitle="NẤU BẰNG CẢ TẤM LÒNG"
        position={[0, 2.53, 0.15]}
        width={3.6}
        height={0.8}
      />
      <Model path="food/pot" position={[-1.1, 1.2, -0.6]} scale={0.7} />
      <Model path="food/bowl-broth" position={[0, 1.2, -0.6]} scale={0.8} />
      <Model
        path="food/loaf-baguette"
        position={[0.9, 1.2, -0.6]}
        scale={0.6}
      />
      <Sign
        text="PHỞ BÒ  /  CÀ PHÊ SỮA"
        position={[0, 0.65, -0.08]}
        width={3}
        height={0.55}
        color="#e4c38b"
        ink="#304d44"
      />
    </group>
  )
}

export function ParkFeatures() {
  return (
    <group>
      <Block position={[27, 0.1, -9]} scale={[22, 0.2, 16]} color="#8fba75" />
      <Block
        position={[24, 0.23, -6]}
        scale={[2.5, 0.08, 20]}
        color="#e1cfa9"
      />
      <Block
        position={[27, 0.24, -5]}
        scale={[22, 0.08, 2.3]}
        color="#e1cfa9"
      />
      <mesh position={[30, 0.45, -11]} receiveShadow>
        <cylinderGeometry args={[2.65, 2.8, 0.5, 24]} />
        <meshStandardMaterial color="#d1bfa0" roughness={0.8} />
      </mesh>
      <mesh position={[30, 0.72, -11]}>
        <cylinderGeometry args={[2.32, 2.32, 0.06, 24]} />
        <meshStandardMaterial
          color="#5dada3"
          roughness={0.25}
          metalness={0.2}
        />
      </mesh>
      <mesh position={[30, 1.3, -11]} castShadow>
        <cylinderGeometry args={[0.25, 0.6, 1.4, 10]} />
        <meshStandardMaterial color="#e2d2b0" />
      </mesh>
      <mesh position={[30, 2.02, -11]}>
        <cylinderGeometry args={[1.05, 0.4, 0.2, 16]} />
        <meshStandardMaterial color="#e2d2b0" />
      </mesh>
      <Sign
        text="CÔNG VIÊN"
        subtitle="A LITTLE ROOM TO BREATHE"
        position={[18, 1.5, 4.5]}
        width={3}
        height={0.8}
      />
      {[
        [-1, 0],
        [1, 0],
      ].map(([x], index) => (
        <Bench
          key={x}
          position={[index ? 34 : 19, 0, -12]}
          rotation={[0, index ? -Math.PI / 2 : Math.PI / 2, 0]}
        />
      ))}
    </group>
  )
}

export function Bench({
  position,
  rotation,
}: {
  position: Vec3
  rotation?: Vec3
}) {
  return (
    <group position={position} rotation={rotation}>
      <Blocks
        color="#7e5c3d"
        placements={[0, 0.3, 0.6].map((z) => ({
          position: [0, 0.65, z],
          scale: [2.8, 0.12, 0.23],
        }))}
      />
      <Block
        position={[0, 1.15, -0.08]}
        scale={[2.8, 0.65, 0.12]}
        color="#9a7148"
      />
      <Blocks
        color="#3b5750"
        placements={[-1, 1].map((x) => ({
          position: [x, 0.35, 0.25],
          scale: [0.12, 0.6, 0.8],
        }))}
      />
    </group>
  )
}
