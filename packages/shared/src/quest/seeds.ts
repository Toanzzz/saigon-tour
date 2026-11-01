import type { NpcId } from '../entities'
import type { QuestSpec } from './schema'

export const QUEST_SEEDS: QuestSpec[] = [
  {
    giverNpcId: 'hoa',
    title: 'Fresh herbs for a neighbor',
    description: 'Bring these fresh herbs to Chị Linh in the park.',
    steps: [{ type: 'DELIVER', itemId: 'herbs', npcId: 'linh' }],
    scope: 'solo',
  },
  {
    giverNpcId: 'tam',
    title: 'A riverside hello',
    description: 'Check on Ông Ba by the river and say hello.',
    steps: [{ type: 'TALK_TO', npcId: 'ba' }],
    scope: 'solo',
  },
  {
    giverNpcId: 'linh',
    title: 'A community lunch invitation',
    description:
      'Visit the market and invite Cô Hoa to our neighborhood lunch.',
    steps: [
      { type: 'GO_TO', locationId: 'market' },
      { type: 'TALK_TO', npcId: 'hoa' },
    ],
    scope: 'solo',
  },
  {
    giverNpcId: 'ba',
    title: 'A view along the river',
    description: 'Visit the Opera House and find another side of our city.',
    steps: [{ type: 'GO_TO', locationId: 'opera' }],
    scope: 'solo',
  },
  {
    giverNpcId: 'mai',
    title: 'Coffee for Cô Hoa',
    description: 'Take this coffee across the market to Cô Hoa.',
    steps: [{ type: 'DELIVER', itemId: 'coffee', npcId: 'hoa' }],
    scope: 'solo',
  },
  {
    giverNpcId: 'alex',
    title: 'Light across the square',
    description: 'Visit the cathedral square and find the afternoon light.',
    steps: [{ type: 'GO_TO', locationId: 'cathedral' }],
    scope: 'solo',
  },
  {
    giverNpcId: 'vy',
    title: 'An evening walk',
    description:
      'Visit the food alley and look for a welcoming evening corner.',
    steps: [{ type: 'GO_TO', locationId: 'alley' }],
    scope: 'solo',
  },
  {
    giverNpcId: 'son',
    title: 'Room for a river view',
    description: 'Visit the riverside to bring back a little inspiration.',
    steps: [{ type: 'GO_TO', locationId: 'river' }],
    scope: 'solo',
  },
  {
    giverNpcId: 'thao',
    title: 'An echo across the square',
    description: 'Listen to the city at the cathedral square.',
    steps: [{ type: 'GO_TO', locationId: 'cathedral' }],
    scope: 'solo',
  },
]

export function seedsFor(npcId: NpcId): QuestSpec[] {
  return QUEST_SEEDS.filter((spec) => spec.giverNpcId === npcId).map(
    (spec) => ({ ...spec, steps: spec.steps.map((step) => ({ ...step })) })
  )
}
