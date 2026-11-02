import {
  type InteractResponse,
  InteractResponseSchema,
  NpcStreamEventSchema,
} from '@saigon/shared'

/** Apply transient text only; the final result validates all game state. */
export async function readNpcResponse(
  response: Response,
  onText?: (text: string) => void
): Promise<InteractResponse> {
  if (!response.headers.get('content-type')?.includes('application/x-ndjson'))
    return InteractResponseSchema.parse(await response.json())
  const reader = response.body?.getReader()
  if (!reader) throw new Error('missing_npc_stream')
  const decoder = new TextDecoder()
  let pending = ''
  let result: InteractResponse | undefined
  const readLine = (line: string) => {
    if (!line.trim()) return
    if (result) throw new Error('npc_stream_after_result')
    const event = NpcStreamEventSchema.parse(JSON.parse(line))
    if (event.type === 'error') throw new Error('npc_stream_failed')
    if (event.type === 'text') onText?.(event.text)
    else result = event.response
  }
  try {
    while (true) {
      const chunk = await reader.read()
      if (chunk.done) break
      pending += decoder.decode(chunk.value, { stream: true })
      let index = pending.indexOf('\n')
      while (index >= 0) {
        readLine(pending.slice(0, index))
        pending = pending.slice(index + 1)
        index = pending.indexOf('\n')
      }
      if (pending.length > 256_000) throw new Error('npc_stream_too_large')
    }
    pending += decoder.decode()
    readLine(pending)
    if (!result) throw new Error('npc_stream_missing_result')
    return result
  } finally {
    await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
}
