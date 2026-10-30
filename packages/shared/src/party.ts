import { z } from 'zod'
export const DishSchema = z.enum(['noodles', 'broth', 'baguette', 'coffee'])
export type Dish = z.infer<typeof DishSchema>
export const PartySnapshotSchema = z.object({
  id: z.uuid(),
  members: z
    .array(z.object({ id: z.uuid(), name: z.string(), color: z.string() }))
    .max(4),
  quest: z
    .object({
      id: z.literal('hoa-team-lunch'),
      assignments: z
        .array(
          z.object({
            playerId: z.uuid(),
            name: z.string(),
            dish: DishSchema,
            delivered: z.boolean(),
          })
        )
        .max(4),
      completed: z.boolean(),
    })
    .nullable(),
})
export type PartySnapshot = z.infer<typeof PartySnapshotSchema>
export const PartyInviteSchema = z.object({
  inviteId: z.uuid(),
  fromId: z.uuid(),
  fromName: z.string(),
  expiresAt: z.number(),
})
export type PartyInvite = z.infer<typeof PartyInviteSchema>
