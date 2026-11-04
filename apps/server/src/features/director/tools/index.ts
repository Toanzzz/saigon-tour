import { createTool } from '@mastra/core/tools'
import {
  type CityAction,
  type CityPlanBeat,
  CityPlanBeatSchema,
} from '@saigon/shared'
import { z } from 'zod'
import type { CityWorld } from '@/domain/city'

/**
 * Planning tools for the once-a-day director. `planBeat` collects validated
 * beats to apply later in the day; the model drafts a schedule rather than
 * mutating the city immediately. Each action is dry-validated against the same
 * `CityActionSchema` the live world uses so the plan can only hold real moves.
 */
export function directorPlanTools(
  city: CityWorld,
  plan: CityPlanBeat[],
  active: () => boolean = () => true
) {
  return {
    planBeat: createTool({
      id: 'plan-beat',
      description:
        'Schedule one beat of the day: a batch of city actions to apply at ' +
        '`atMinutes` minutes from now. Server validates each action and returns ' +
        'a correction reason if any is rejected. Call once per beat, in time ' +
        'order, to compose the whole day.',
      inputSchema: CityPlanBeatSchema,
      outputSchema: z.object({
        accepted: z.boolean(),
        reason: z.string().optional(),
        beats: z.number().optional(),
      }),
      execute: async (input) => {
        if (!active()) return { accepted: false, reason: 'room_not_occupied' }
        const parsed = CityPlanBeatSchema.safeParse(input)
        if (!parsed.success)
          return {
            accepted: false,
            reason: `invalid_beat:${parsed.error.issues[0]?.message}`,
          }
        if (plan.length >= 24)
          return { accepted: false, reason: 'day_plan_full:24' }
        // Dry-run each action through the world validator (no mutation) so the
        // plan can only carry beats the live apply step will accept.
        const dry = city.validate(parsed.data.actions as CityAction[])
        if (!dry.accepted) return dry
        const scheduled = city.validatePlan([...plan, parsed.data])
        if (!scheduled.accepted) return scheduled
        plan.push(parsed.data)
        return { accepted: true, beats: plan.length }
      },
    }),
  }
}
