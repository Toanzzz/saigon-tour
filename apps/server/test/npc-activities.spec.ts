import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  CityDayPlanSchema,
  initialCitySnapshot,
  NPC_ACTIVITIES,
  NPC_LOOKS,
  npcActivity,
} from '@saigon/shared'
import { describe, expect, it } from 'vitest'
import { CityWorld } from '@/domain/city'
import { scriptedDayPlan } from '@/features/director/scripted'

const root = resolve(import.meta.dirname, '../../..')

describe('NPC activities', () => {
  it('uses only shipped animation clips and props across all NPC catalogs', () => {
    expect(Object.keys(NPC_ACTIVITIES)).toHaveLength(29)
    for (const [npcId, catalog] of Object.entries(NPC_ACTIVITIES)) {
      const model = readFileSync(
        resolve(root, `apps/client/public/models/npcs/${npcId}.glb`)
      )
      const gltf = JSON.parse(
        model.subarray(20, 20 + model.readUInt32LE(12)).toString()
      )
      const clips = gltf.animations.map((clip: { name: string }) => clip.name)
      expect(catalog.default).toBeDefined()
      expect(Object.keys(catalog).length).toBeGreaterThanOrEqual(2)
      for (const activity of Object.values(catalog)) {
        expect(clips).toContain(activity.animation)
        expect(activity.text.en).toContain('{name}')
        expect(activity.text.vi).toContain('{name}')
        if (activity.prop)
          expect(
            existsSync(
              resolve(root, `apps/client/public/models/${activity.prop}.glb`)
            )
          ).toBe(true)
        if (activity.movement)
          expect(NPC_LOOKS[npcId as keyof typeof NPC_LOOKS].walk).toBeDefined()
      }
    }
  })

  it('validates activity IDs and expiration, with isolated room state', () => {
    let now = 100000
    const city = new CityWorld(() => now)
    const other = new CityWorld(() => now)
    const action = {
      type: 'set-npc-activity',
      npcId: 'hoa',
      activityId: 'busy',
      durationMs: 30000,
    }
    for (const activityId of ['missing', 'constructor', '__proto__'])
      expect(city.apply({ ...action, activityId }).accepted).toBe(false)
    expect(city.validate([action]).accepted).toBe(true)
    expect(city.snapshot().npcActivities).toEqual({})
    expect(city.apply(action).accepted).toBe(true)
    expect(npcActivity('hoa', city.snapshot(), now).id).toBe('busy')
    expect(npcActivity('hoa', other.snapshot(), now).id).toBe('default')
    now += 30000
    expect(npcActivity('hoa', city.snapshot(), now).id).toBe('default')
    const revision = city.snapshot().revision
    city.expire()
    expect(city.snapshot().npcActivities).toEqual({})
    expect(city.snapshot().revision).toBe(revision + 1)
  })

  it('supplies defaults without a room and rejects invalid catalog entries in snapshots', () => {
    expect(npcActivity('park-reader').animation).toBe('sit')
    const snapshot = initialCitySnapshot()
    snapshot.npcActivities.hoa = {
      activityId: '__proto__',
      startedAt: 0,
      endsAt: 999999,
    }
    expect(npcActivity('hoa', snapshot, 1).id).toBe('default')
  })

  it('keeps scripted Director beats valid and assigns supported activities', () => {
    const plan = CityDayPlanSchema.parse(scriptedDayPlan())
    const actions = plan.beats
      .flatMap((beat) => beat.actions)
      .filter((action) => action.type === 'set-npc-activity')
    expect(actions).toHaveLength(3)
    for (const action of actions)
      expect(
        Object.hasOwn(NPC_ACTIVITIES[action.npcId], action.activityId)
      ).toBe(true)
  })
})
