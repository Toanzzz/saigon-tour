import { Model, type Vec3 } from './assets'
import { Block, Blocks, Sign } from './primitives'

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
