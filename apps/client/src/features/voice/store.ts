import { Store } from '@tanstack/store'

export const voiceStore = new Store<{
  phase: 'idle' | 'requesting' | 'recording' | 'ready'
}>({
  phase: 'idle',
})
const silence = () => Array<number>(24).fill(0)
export const voiceMeter = new Store({ levels: silence(), seconds: 0 })
export function sampleVoice(levels: number[], seconds: number) {
  voiceMeter.setState((state) =>
    state.seconds === seconds &&
    levels.every(
      (level, index) => Math.abs(level - (state.levels[index] ?? 0)) < 0.02
    )
      ? state
      : { levels, seconds }
  )
}
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
  voiceMeter.setState(() => ({ levels: silence(), seconds: 0 }))
}
