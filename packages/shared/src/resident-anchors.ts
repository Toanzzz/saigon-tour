import type { RESIDENTS } from './residents'
export const RESIDENT_ANCHORS = {
  'bread-vendor': { at: [-34, 2] },
  'fruit-vendor': { at: [-11, 2] },
  'market-browse': { at: [-30, 5.5] },
  'market-walk': { at: [-17, 5.5], walk: [5, 0] },
  'market-family': { at: [-40, 3] },
  'coffee-friend': { at: [-32, 18.5] },
  'coffee-reader': { at: [-22, 18.8] },
  commuter: { at: [1, 17.5], walk: [5, 0] },
  student: { at: [20, -1], walk: [6, 0] },
  'park-reader': { at: [20, -12] },
  'park-stretch': { at: [34, -5.8] },
  'plaza-friends': { at: [67, 3] },
  'plaza-stroll': { at: [71, 23], walk: [0, 5] },
  'opera-visitor': { at: [97, -28] },
  'postcard-reader': { at: [98, -80] },
  'square-tourist': { at: [84, -68], walk: [5, 0] },
  'riverside-friends': { at: [42, 35] },
  'river-jogger': { at: [61, 34.8], walk: [6, 0] },
  'alley-vendor': { at: [-29, 33] },
  'alley-diner': { at: [-23, 31] },
} satisfies Record<
  keyof typeof RESIDENTS,
  { at: [number, number]; walk?: [number, number] }
>
