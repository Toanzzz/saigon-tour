import { Store } from '@tanstack/store'

/** Session-only recordings, keyed by stable user-message id; never persisted. */
export const voiceClips = new Store<ReadonlyMap<string, string>>(
  new Map<string, string>()
)
const MAX_CLIPS = 20
export function rememberVoice(messageId: string, recording: Blob) {
  const url = URL.createObjectURL(recording)
  voiceClips.setState((clips) => {
    const next = new Map(clips)
    const old = next.get(messageId)
    if (old) URL.revokeObjectURL(old)
    next.delete(messageId)
    next.set(messageId, url)
    while (next.size > MAX_CLIPS) {
      const oldest = next.entries().next().value
      if (!oldest) break
      URL.revokeObjectURL(oldest[1])
      next.delete(oldest[0])
    }
    return next
  })
}
export function confirmVoiceMessage(messageId: string, confirmedId?: string) {
  if (!confirmedId || confirmedId === messageId) return
  const url = voiceClips.state.get(messageId)
  if (!url) return
  voiceClips.setState((clips) => {
    const next = new Map(clips)
    const old = next.get(confirmedId)
    if (old && old !== url) URL.revokeObjectURL(old)
    next.delete(messageId)
    next.set(confirmedId, url)
    return next
  })
}
export function resetVoiceClips() {
  for (const url of voiceClips.state.values()) URL.revokeObjectURL(url)
  voiceClips.setState(() => new Map<string, string>())
}
