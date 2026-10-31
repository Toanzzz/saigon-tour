/** Reject model text that could inject markup, links, or control characters. */
export function safeLine(line: string): boolean {
  if (/https?:\/\/|www\.|<\/?[a-z][^>]*>/i.test(line)) return false
  return [...line].every((character) => {
    const code = character.charCodeAt(0)
    return code >= 32 || code === 9 || code === 10 || code === 13
  })
}

export function cleanReply(text: string | undefined): string | null {
  const reply = (text ?? '').replace(/\s+/g, ' ').trim()
  if (!reply || reply.length > 700 || !safeLine(reply)) return null
  return reply
}
