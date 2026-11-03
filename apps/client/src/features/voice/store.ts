import { Store } from '@tanstack/store'

export const voiceStore = new Store<{ phase: 'idle' | 'recording' }>({
  phase: 'idle',
})
let generation = 0
const resources = new Set<() => void>()

export const voiceGeneration = () => generation
export function ownVoiceResource(cancel: () => void) {
  resources.add(cancel)
  return () => resources.delete(cancel)
}
export function resetVoice() {
  generation++
  for (const cancel of resources) cancel()
  resources.clear()
  if (voiceStore.state.phase !== 'idle')
    voiceStore.setState(() => ({ phase: 'idle' }))
}
