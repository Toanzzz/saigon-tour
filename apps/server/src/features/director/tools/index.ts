import { createTool } from '@mastra/core/tools'
import { CityActionSchema } from '@saigon/shared'
import { z } from 'zod'
import type { CityWorld } from '@/domain/city'

export function directorTools(
  city: CityWorld,
  calls: string[],
  active: () => boolean = () => true
) {
  const tools = Object.fromEntries(
    CityActionSchema.options.map((schema) => {
      const type = schema.shape.type.value
      return [
        type.replace(/-([a-z])/g, (_match, letter: string) =>
          letter.toUpperCase()
        ),
        createTool({
          id: type,
          description: `Propose ${type}. Server validates it and returns a correction reason if rejected.`,
          inputSchema: schema,
          outputSchema: z.object({
            accepted: z.boolean(),
            reason: z.string().optional(),
            revision: z.number().optional(),
          }),
          execute: async (input) => {
            if (!active())
              return { accepted: false, reason: 'room_not_occupied' }
            calls.push(type)
            return city.apply(input)
          },
        }),
      ]
    })
  )
  return tools
}
