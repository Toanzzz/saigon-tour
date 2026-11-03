/** Validate the PCM16 mono 24 kHz WAV sent to Meta; retain no recording. */
export function wavDuration(bytes: ArrayBuffer): number | null {
  if (bytes.byteLength < 44) return null
  const view = new DataView(bytes)
  const tag = (at: number) =>
    String.fromCharCode(...new Uint8Array(bytes, at, 4))
  if (
    tag(0) !== 'RIFF' ||
    tag(8) !== 'WAVE' ||
    view.getUint32(4, true) + 8 !== bytes.byteLength
  )
    return null
  let validFormat = false
  let dataBytes = 0
  for (let at = 12; at + 8 <= bytes.byteLength; ) {
    const size = view.getUint32(at + 4, true)
    if (at + 8 + size > bytes.byteLength) return null
    if (tag(at) === 'fmt ') {
      if (size < 16 || validFormat) return null
      validFormat =
        view.getUint16(at + 8, true) === 1 &&
        view.getUint16(at + 10, true) === 1 &&
        view.getUint32(at + 12, true) === 24000 &&
        view.getUint32(at + 16, true) === 48000 &&
        view.getUint16(at + 20, true) === 2 &&
        view.getUint16(at + 22, true) === 16
      if (!validFormat) return null
    }
    if (tag(at) === 'data') {
      if (dataBytes || size % 2) return null
      dataBytes = size
    }
    at += 8 + size + (size % 2)
  }
  const duration = (dataBytes / 48000) * 1000
  return validFormat && duration > 0 && duration <= 15000 ? duration : null
}
