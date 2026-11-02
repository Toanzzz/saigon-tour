import { useThree } from '@react-three/fiber'
import { Model, ModelInstances, type Placement } from './assets'
import { CivicDistrict, Skyline } from './civic'
import { Collision } from './collision'
import { CulturalLandmarks } from './cultural'
import { GROUND, MARKET } from './district'
import { DistrictLife } from './district-life'
import { DistrictLifeTwo } from './district-life-2'
import { EveningLighting } from './evening'
import { BuiVienDressing } from './icons-bui-vien'
import { MarketSpillover } from './icons-market'
import { Bitexco, CafeApartments } from './icons-nguyen-hue'
import { GiantParkTrees } from './icons-park'
import { PostOfficePostcards } from './icons-postoffice'
import { MarketStall, ParkFeatures } from './landmarks'
import { LOOK } from './look-flag'
import { PALETTE } from './palette'
import { PaperClouds } from './paper-clouds'
import {
  PALM_PLACEMENTS,
  STREET_LIGHT_PLACEMENTS,
  TREE_PLACEMENTS,
} from './placements'
import { Block, Blocks, Sign } from './primitives'
import { Roads } from './roads'
import { SkylineCards } from './skyline-cards'
import { StreetLife } from './street-life'
import { Planting, Promenade, Shophouses, StopSign } from './streets'
import { WaterfrontLife } from './waterfront'

export function CityWorld({ evening = false }: { evening?: boolean }) {
  return (
    <group>
      {GROUND.map((rect) => (
        <Block
          key={`${rect.x}/${rect.z}`}
          position={[rect.x, -0.3, rect.z]}
          scale={[rect.w, 0.6, rect.d]}
          color="#d7c7a3"
        />
      ))}
      <Roads />
      <Block
        position={[MARKET.x, 0.06, MARKET.z]}
        scale={[MARKET.w + 3, 0.12, MARKET.d + 4]}
        color="#c3b292"
      />
      <Block position={[-23, 0.07, 3]} scale={[27, 0.14, 8]} color="#dfccaa" />
      <Model
        path="landmarks/cho-ben-thanh"
        position={[-23, 0.12, -12]}
        scale={0.7}
        shadow={false}
      />
      <MarketStall />
      <MarketSpillover />
      <Shophouses />
      <ParkFeatures />
      <GiantParkTrees />
      <CivicDistrict />
      <Bitexco />
      <CafeApartments />
      <CulturalLandmarks />
      {LOOK === 'comic' && (
        <PaperClouds
          placements={[
            { position: [80, 34, -108], scale: 0.9, phase: 0.2 },
            { position: [94, 38, -112], scale: 1.05, phase: 1.9 },
            { position: [88, 30, -116], scale: 0.8, phase: 3.4 },
          ]}
        />
      )}
      <PostOfficePostcards />
      <DistrictLife />
      <DistrictLifeTwo />
      <StreetLife />
      <BuiVienDressing />
      <WaterfrontLife />
      <EveningLighting active={evening} />
      <Skyline />
      {LOOK === 'comic' && <DioramaDepth evening={evening} />}
      <ModelInstances
        path="nature/tree_palmDetailedTall"
        placements={PALM_PLACEMENTS}
      />
      <ModelInstances path="nature/tree_fat" placements={TREE_PLACEMENTS} />
      <ModelInstances
        path="roads/light-curved"
        placements={STREET_LIGHT_PLACEMENTS}
      />
      <Planting />
      <Promenade />
      <StopSign position={[-10, 0, 6.4]} name="BẾN THÀNH" />
      <StopSign position={[18.4, 0, 2.8]} name="CÔNG VIÊN" />
      <StopSign position={[60, 0, 6.4]} name="TÒA THỊ CHÍNH" />
      <StopSign
        position={[84, 0, -58]}
        rotation={[0, Math.PI / 2, 0]}
        name="NHÀ THỜ ĐỨC BÀ"
      />
      <StopSign position={[16, 0, 31]} name="BẾN SÔNG" />
      <StopSign
        position={[88, 0, -35]}
        rotation={[0, Math.PI / 2, 0]}
        name="NHÀ HÁT THÀNH PHỐ"
      />
      <StopSign
        position={[100, 0, -74]}
        rotation={[0, Math.PI / 2, 0]}
        name="BƯU ĐIỆN TRUNG TÂM"
      />
      <StopSign
        position={[-5, 0, 29]}
        rotation={[0, -Math.PI / 2, 0]}
        name="HẺM ẨM THỰC"
      />
      <Sign
        text="SÀI GÒN"
        subtitle="MỘT CHUYẾN ĐI, NHIỀU CÂU CHUYỆN"
        position={[-17, 4.1, 0.5]}
        width={4.6}
        height={1.15}
        color="#b45940"
      />
      <Collision />
    </group>
  )
}

/**
 * Phase-3 diorama depth, comic-only: the default cloud ring, the cutout
 * skyline cards (desktop only, < 700 px cuts them), and the paper diorama base
 * skirt. The sky dome lives in `atmosphere.tsx`.
 */
function DioramaDepth({ evening }: { evening: boolean }) {
  const mobile = useThree((state) => state.size.width) < 700
  // One Blocks call: a paperEdge skirt 2 units deep under each GROUND rect,
  // its top meeting the ground underside (−0.6) and dropping to −2.6, so the
  // diorama reads as a solid slab at the walls. The ink top edge comes from
  // the Phase-1 silhouette pass.
  const skirt: Placement[] = GROUND.map((rect) => ({
    position: [rect.x, -1.6, rect.z],
    scale: [rect.w, 2, rect.d],
  }))
  return (
    <group>
      <PaperClouds />
      {!mobile && <SkylineCards evening={evening} />}
      <Blocks placements={skirt} color={PALETTE.paperEdge} />
    </group>
  )
}
