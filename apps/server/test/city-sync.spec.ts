import { Decoder, Encoder } from '@colyseus/schema'
import {
  CITY_ANCHORS,
  CityActionSchema,
  CitySnapshotSchema,
  cityFromRoomState,
  initialCitySnapshot,
  type NeighborId,
  NPC_POSITIONS,
  syncCity,
  WorldRoomState,
} from '@saigon/shared'
import { describe, expect, it } from 'vitest'

describe('city room schema sync', () => {
  it('starts every NPC at its authored home position', () => {
    const city = initialCitySnapshot()
    expect(CitySnapshotSchema.safeParse(city).success).toBe(true)
    for (const id of Object.keys(NPC_POSITIONS) as NeighborId[]) {
      const placement = city.npcPlacements[id]
      expect(placement.position).toEqual(NPC_POSITIONS[id])
      expect(CITY_ANCHORS[placement.locationId][placement.anchorId]).toEqual(
        placement.position
      )
    }
    city.npcPlacements.hoa.position[0] = 999
    expect(initialCitySnapshot().npcPlacements.hoa.position).toEqual(
      NPC_POSITIONS.hoa
    )
  })

  it('encodes the city snapshot and patches moves, weather and event expiry', () => {
    const authoritative = new WorldRoomState()
    authoritative.street = 'Test street'
    const encoder = new Encoder(authoritative)
    const client = new WorldRoomState()
    const decoder = new Decoder(client)
    const initial = initialCitySnapshot()
    syncCity(authoritative, initial)
    decoder.decode(encoder.encodeAll())
    encoder.discardChanges()
    expect(cityFromRoomState(client)).toEqual(initial)

    const updated = initialCitySnapshot()
    updated.revision = 1
    updated.weather = 'rain'
    updated.npcPlacements.vy = {
      locationId: 'park',
      anchorId: 'gathering',
      position: CITY_ANCHORS.park.gathering as [number, number, number],
    }
    updated.needs.vy = 'Bring a neighbor something warm.'
    updated.events.push({
      id: 'event_1',
      kind: 'rain',
      locationId: 'park',
      title: 'A quick shower',
      description: 'Find shelter with a neighbor.',
      startedAt: 1_800_000_000_000,
      endsAt: 1_800_000_090_000,
    })
    updated.headlines.push({
      id: 'headline_1',
      text: 'Rain crosses the park.',
      createdAt: 1_800_000_000_000,
    })
    syncCity(authoritative, updated)
    decoder.decode(encoder.encode())
    encoder.discardChanges()
    expect(cityFromRoomState(client)).toEqual(updated)
    expect(client.players.size).toBe(0)

    updated.revision = 2
    updated.weather = 'clear'
    updated.events = []
    updated.headlines = []
    updated.needs = {}
    syncCity(authoritative, updated)
    decoder.decode(encoder.encode())
    expect(cityFromRoomState(client)).toEqual(updated)
  })

  it('keeps snapshots bounded and agent positions constrained to anchor names', () => {
    expect(
      CityActionSchema.safeParse({
        type: 'move-npc',
        npcId: 'hoa',
        locationId: 'park',
        anchorId: 'gathering',
        position: [999, 0, 999],
      }).success
    ).toBe(false)
    const city = initialCitySnapshot()
    const event = {
      id: 'event',
      kind: 'festival' as const,
      locationId: 'market' as const,
      title: 'Festival',
      description: 'A friendly gathering.',
      startedAt: 1,
      endsAt: 100,
    }
    city.events = [event, event, event]
    expect(CitySnapshotSchema.safeParse(city).success).toBe(false)
    expect(
      CityActionSchema.safeParse({
        type: 'start-event',
        kind: 'festival',
        locationId: 'market',
        title: 'Festival',
        description: 'Gathering',
        durationMs: 0,
      }).success
    ).toBe(false)
  })
})
