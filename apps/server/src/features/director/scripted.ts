import type { CityDayPlan, LocationId } from '@saigon/shared'

const anchor = (_location: LocationId) => 'gathering'

/**
 * A deterministic offline/demo day: a sequence of beats spread across the day,
 * validated by the same `CityActionSchema` the live plan uses. Times are in
 * minutes from the daily draft. Used when the model is unavailable or disabled.
 */
export function scriptedDayPlan(): CityDayPlan {
  return {
    beats: [
      {
        atMinutes: 0,
        actions: [
          {
            type: 'start-event',
            kind: 'market-rush',
            locationId: 'market',
            title: 'Morning market',
            description:
              'The market stalls open and neighbors gather for breakfast.',
            durationMs: 180000,
          },
          {
            type: 'move-npc',
            npcId: 'mai',
            locationId: 'market',
            anchorId: anchor('market'),
          },
          {
            type: 'set-npc-need',
            npcId: 'hoa',
            need: 'Fresh herbs need to reach Linh while the morning market is busy.',
          },
          { type: 'set-weather', weather: 'clear' },
          {
            type: 'set-npc-activity',
            npcId: 'hoa',
            activityId: 'busy',
            durationMs: 180000,
          },
          {
            type: 'post-headline',
            text: 'The morning market is open. Hoa could use a hand with the herbs.',
          },
        ],
      },
      {
        atMinutes: 10,
        actions: [
          {
            type: 'start-rare-sale',
            npcId: 'mai',
            unlockId: 'silk-scarf',
          },
        ],
      },
      {
        atMinutes: 240,
        actions: [
          {
            type: 'start-event',
            kind: 'festival',
            locationId: 'cityhall',
            title: 'An afternoon gathering',
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
            need: 'Help the afternoon gathering with a welcoming route through the food alley.',
          },
          {
            type: 'post-headline',
            text: 'City Hall is gathering for a little neighborhood festival. Vy could use a hand.',
          },
          {
            type: 'set-npc-activity',
            npcId: 'vy',
            activityId: 'busy',
            durationMs: 180000,
          },
        ],
      },
      {
        atMinutes: 540,
        actions: [
          {
            type: 'start-event',
            kind: 'street-music',
            locationId: 'opera',
            title: 'An evening melody',
            description:
              'A few neighbors pause for music near the Opera House.',
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
          { type: 'set-weather', weather: 'rain' },
          {
            type: 'set-npc-activity',
            npcId: 'thao',
            activityId: 'busy',
            durationMs: 180000,
          },
          {
            type: 'post-headline',
            text: 'A little evening rain and a melody travel toward the cathedral square.',
          },
        ],
      },
    ],
  }
}
