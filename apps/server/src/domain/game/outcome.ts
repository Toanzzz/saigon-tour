import type { Quest, Reward } from '@saigon/shared'

/** What tools may touch, and a record of what they did during one request. */
export interface ToolOutcome {
  calls: string[]
  offered?: Quest
  completed?: { quest: Quest; reward: Reward }
  incomplete?: Quest
}
