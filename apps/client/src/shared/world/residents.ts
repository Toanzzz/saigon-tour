import { type NpcId, RESIDENT_ANCHORS } from '@saigon/shared'

type Resident = {
  at: [number, number]
  id: NpcId

  model: 'male-a' | 'male-b' | 'female-a' | 'female-b'
  animation: string
  yaw?: number
  walk?: [number, number]
  phase?: number
}

export const RESIDENT_VISUALS: Resident[] = [
  {
    id: 'bread-vendor',

    model: 'male-b',
    animation: 'interact-right',
  },
  {
    id: 'fruit-vendor',

    model: 'female-a',
    animation: 'holding-both',
  },
  {
    id: 'market-browse',

    model: 'female-b',
    animation: 'idle',
    yaw: Math.PI,
  },
  {
    id: 'market-walk',

    model: 'male-a',
    animation: 'walk',
  },
  {
    id: 'market-family',

    model: 'female-a',
    animation: 'emote-yes',
  },
  { id: 'coffee-friend', model: 'male-b', animation: 'idle' },
  { id: 'coffee-reader', model: 'female-b', animation: 'sit' },
  {
    id: 'commuter',

    model: 'male-a',
    animation: 'walk',

    phase: 2,
  },
  {
    id: 'student',

    model: 'female-a',
    animation: 'walk',
  },
  {
    id: 'park-reader',

    model: 'male-b',
    animation: 'sit',
    yaw: Math.PI / 2,
  },
  {
    id: 'park-stretch',

    model: 'female-b',
    animation: 'emote-yes',
  },
  {
    id: 'plaza-friends',

    model: 'female-a',
    animation: 'emote-yes',
  },
  {
    id: 'plaza-stroll',

    model: 'male-a',
    animation: 'walk',
  },
  {
    id: 'opera-visitor',

    model: 'female-b',
    animation: 'idle',
    yaw: Math.PI / 2,
  },
  {
    id: 'postcard-reader',

    model: 'male-b',
    animation: 'holding-both',
    yaw: Math.PI / 2,
  },
  {
    id: 'square-tourist',

    model: 'female-a',
    animation: 'walk',
  },
  {
    id: 'riverside-friends',

    model: 'female-b',
    animation: 'idle',
    yaw: Math.PI,
  },
  {
    id: 'river-jogger',

    model: 'male-a',
    animation: 'walk',

    phase: 1,
  },
  {
    id: 'alley-vendor',

    model: 'male-b',
    animation: 'interact-right',
    yaw: Math.PI,
  },
  { id: 'alley-diner', model: 'female-a', animation: 'sit' },
].map((resident) => ({
  ...resident,
  ...RESIDENT_ANCHORS[resident.id as keyof typeof RESIDENT_ANCHORS],
})) as Resident[]
