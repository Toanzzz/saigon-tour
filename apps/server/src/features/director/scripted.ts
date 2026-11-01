import type { CityAction, LocationId } from '@saigon/shared'

const anchor = (_location: LocationId) => 'gathering'
/** A deterministic offline/demo rhythm using the same validator as the agent. */
export function scriptedBeat(index: number): CityAction[] {
  if (index % 3 === 0)
    return [
      {
        type: 'start-event',
        kind: 'festival',
        locationId: 'cityhall',
        title: 'An evening gathering',
        description: 'Neighbors are bringing color to the City Hall walk.',
        durationMs: 180000,
      },
      {
        type: 'move-npc',
        npcId: 'vy',
        locationId: 'cityhall',
        anchorId: anchor('cityhall'),
      },
      {
        type: 'set-npc-need',
        npcId: 'vy',
        need: 'Help the evening gathering with a welcoming route through the food alley.',
      },
      {
        type: 'post-headline',
        text: 'City Hall is gathering for a little neighborhood festival. Vy could use a hand.',
      },
    ]
  if (index % 3 === 1)
    return [
      {
        type: 'start-event',
        kind: 'market-rush',
        locationId: 'market',
        title: 'Market lunch rush',
        description: 'The market stalls are preparing lunch for neighbors.',
        durationMs: 90000,
      },
      {
        type: 'move-npc',
        npcId: 'mai',
        locationId: 'park',
        anchorId: anchor('park'),
      },
      {
        type: 'set-npc-need',
        npcId: 'hoa',
        need: 'Fresh herbs need to reach Linh while the market is busy.',
      },
      { type: 'set-weather', weather: 'rain' },
      {
        type: 'post-headline',
        text: 'A little rain cools the market lunch rush. Mai is visiting the park.',
      },
    ]
  return [
    {
      type: 'start-event',
      kind: 'street-music',
      locationId: 'opera',
      title: 'A melody in the square',
      description: 'A few neighbors pause for music near the Opera House.',
      durationMs: 180000,
    },
    {
      type: 'move-npc',
      npcId: 'thao',
      locationId: 'cathedral',
      anchorId: anchor('cathedral'),
    },
    {
      type: 'set-npc-need',
      npcId: 'thao',
      need: 'Listen for the cathedral echo and share a hello with Linh.',
    },
    { type: 'set-weather', weather: 'clear' },
    {
      type: 'post-headline',
      text: 'The sky clears and a melody travels toward the cathedral square.',
    },
  ]
}
