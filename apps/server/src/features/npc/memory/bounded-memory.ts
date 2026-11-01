import { Memory } from '@mastra/memory'

/** OM loads all unobserved turns; bound the raw context given to the NPC. */
export class BoundedNpcMemory extends Memory {
  override async getContext(args: Parameters<Memory['getContext']>[0]) {
    const result = await super.getContext(args)
    return { ...result, messages: result.messages.slice(-40) }
  }
}
