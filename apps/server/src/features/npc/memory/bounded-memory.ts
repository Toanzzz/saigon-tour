import { Memory } from '@mastra/memory'

/** OM loads all unobserved turns; bound the raw context given to the NPC. */
export class BoundedNpcMemory extends Memory {
  override async getContext(args: Parameters<Memory['getContext']>[0]) {
    const result = await super.getContext(args)
    const requested = args.memoryConfig?.lastMessages
    const limit = typeof requested === 'number' ? Math.min(requested, 40) : 40
    return { ...result, messages: result.messages.slice(-limit) }
  }
}
