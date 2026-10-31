import { ArchedBays, Colonnade, FacadeClock, Pediment } from './cultural-parts'
import { Block, Blocks, Sign } from './primitives'

const CREAM = '#f3d9ad'
const BUTTER = '#dfb856'
const STONE = '#ead1a7'
const CLAY = '#a95943'
const ROOF = '#527c70'

export function CulturalLandmarks() {
  return (
    <group>
      <group position={[99, 0, -35]} rotation={[0, -Math.PI / 2, 0]}>
        <OperaHouse />
      </group>
      <group position={[110, 0, -84]} rotation={[0, -Math.PI / 2, 0]}>
        <CentralPostOffice />
      </group>
    </group>
  )
}

function OperaHouse() {
  return (
    <group>
      <Block position={[0, 0.08, 0]} scale={[12, 0.16, 13.8]} color="#d4c1a2" />
      <Block
        position={[0, 3.45, -0.1]}
        scale={[11.3, 6.1, 8.9]}
        color={CREAM}
        shadow
      />
      <Block position={[0, 0.46, 0]} scale={[11.8, 0.6, 9.4]} color={STONE} />
      <Blocks
        color={STONE}
        placements={[
          { position: [0, 0.15, 5.9], scale: [10.4, 0.3, 1.7] },
          { position: [0, 0.33, 5.6], scale: [9.8, 0.3, 1.5] },
          { position: [0, 0.51, 5.3], scale: [9.2, 0.3, 1.4] },
          { position: [0, 0.72, 5], scale: [8.8, 0.3, 1.3] },
          { position: [0, 5.12, 4.85], scale: [9.8, 0.5, 1.2] },
          { position: [0, 5.55, 4.85], scale: [10.2, 0.22, 1.3] },
          { position: [0, 6.36, 0], scale: [11.7, 0.3, 9.4] },
        ]}
      />
      <ArchedBays
        xs={[-2.55, 0, 2.55]}
        z={4.42}
        y={0.9}
        width={1.8}
        height={2.1}
        color="#4d625b"
      />
      <Colonnade xs={[-4.1, -1.27, 1.27, 4.1]} z={5.1} />
      <ArchedBays
        xs={[-4.95, 4.95]}
        z={4.44}
        y={3.6}
        width={0.75}
        height={0.85}
      />
      <Blocks
        color={CLAY}
        placements={[-1, 1].map((side) => ({
          position: [side * 2.78, 7.05, -0.1],
          scale: [5.9, 0.2, 9.5],
          rotation: [0, 0, -side * 0.28],
        }))}
      />
      <Block
        position={[0, 7.9, -0.1]}
        scale={[0.25, 0.26, 9.6]}
        color={STONE}
      />
      <Pediment width={8.4} height={1.9} y={6.05} z={4.9} />
      <Blocks
        color="#b9976f"
        placements={[-2, -1, 0, 1, 2].map((x) => ({
          position: [x * 0.6, 6.44 + (2 - Math.abs(x)) * 0.18, 5.12],
          rotation: [0, 0, x * 0.12],
          scale: [0.28, 0.75, 0.13],
        }))}
      />
      <Blocks
        color={CREAM}
        placements={[-1, 1].flatMap((side) => [
          { position: [side * 5.35, 6.82, 3.5], scale: [0.45, 0.68, 0.45] },
          { position: [side * 5.35, 7.18, 3.5], scale: [0.7, 0.16, 0.7] },
          { position: [side * 5.35, 7.48, 3.5], scale: [0.38, 0.45, 0.38] },
        ])}
      />
      <Sign
        text="NHÀ HÁT THÀNH PHỐ"
        position={[0, 5.22, 5.47]}
        width={6.7}
        height={0.45}
        color={STONE}
        ink="#624e3d"
      />
      <Sign
        text="OPERA HOUSE"
        subtitle="ÂM NHẠC · SÂN KHẤU · SÀI GÒN"
        position={[-4.8, 1.6, 6.45]}
        width={1.8}
        height={0.9}
        color="#744239"
      />
    </group>
  )
}

function CentralPostOffice() {
  return (
    <group>
      <Block
        position={[0, 0.08, 0]}
        scale={[11.9, 0.16, 16.7]}
        color="#d9c8a8"
      />
      <Block
        position={[0, 2.95, -0.25]}
        scale={[11.4, 5.5, 10.8]}
        color={BUTTER}
        shadow
      />
      <Blocks
        color={STONE}
        placements={[
          { position: [0, 0.36, -0.1], scale: [11.8, 0.5, 11.3] },
          { position: [0, 0.18, 6.9], scale: [7, 0.2, 2.4] },
          { position: [0, 0.34, 6.2], scale: [6.2, 0.2, 1.8] },
          { position: [0, 1.85, 5.23], scale: [11.6, 0.16, 0.22] },
          { position: [0, 5.55, -0.2], scale: [11.8, 0.3, 11.3] },
          { position: [0, 5.84, -0.2], scale: [12, 0.2, 11.4] },
        ]}
      />
      <ArchedBays
        xs={[-4.65, -2.72, 2.72, 4.65]}
        z={5.2}
        y={2.05}
        width={1.12}
        height={1.45}
      />
      <ArchedBays
        xs={[0]}
        z={5.28}
        y={0.6}
        width={2.2}
        height={2.1}
        color="#365d56"
      />
      <Blocks
        color={CREAM}
        placements={[-5.55, -3.7, -1.6, 1.6, 3.7, 5.55].flatMap((x) => [
          { position: [x, 3.16, 5.38], scale: [0.26, 4.25, 0.36] },
          { position: [x, 5.2, 5.42], scale: [0.52, 0.28, 0.5] },
          { position: [x, 1.12, 5.42], scale: [0.46, 0.3, 0.5] },
        ])}
      />
      <Blocks
        color={ROOF}
        placements={[-1, 1].map((side) => ({
          position: [side * 2.9, 6.4, -0.25],
          scale: [6.15, 0.25, 11.4],
          rotation: [0, 0, -side * 0.24],
        }))}
      />
      <Block
        position={[0, 7.13, -0.25]}
        scale={[0.22, 0.22, 11.5]}
        color="#3d655f"
      />
      <Pediment width={4.5} height={1.65} y={5.85} z={5.6} />
      <FacadeClock position={[0, 6.48, 5.83]} />
      <Sign
        text="BƯU ĐIỆN TRUNG TÂM"
        position={[0, 4.85, 5.5]}
        width={8.9}
        height={0.58}
        color={BUTTER}
        ink="#615137"
      />
      <Sign
        text="CENTRAL POST OFFICE"
        subtitle="MỘT TẤM BƯU THIẾP, MỘT LỜI THƯƠNG"
        position={[0, 1.3, 7.85]}
        width={3.5}
        height={0.83}
        color="#396f63"
      />
      <Block
        position={[0, 0.66, 7.78]}
        scale={[0.12, 1.3, 0.12]}
        color="#557160"
      />
      <Blocks
        color="#628871"
        placements={[-5.1, 5.1].map((x) => ({
          position: [x, 0.8, 6.5],
          scale: [0.65, 1.3, 0.65],
        }))}
      />
      <Blocks
        color="#ead7a9"
        placements={[-5.1, 5.1].map((x) => ({
          position: [x, 1.5, 6.5],
          scale: [0.85, 0.15, 0.85],
        }))}
      />
    </group>
  )
}
