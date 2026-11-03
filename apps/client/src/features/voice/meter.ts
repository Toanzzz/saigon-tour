/** Observe microphone samples without connecting them to the speakers. */
export function microphoneMeter(
  stream: MediaStream,
  sample: (levels: number[], seconds: number) => void,
  context: AudioContext
) {
  const source = context.createMediaStreamSource(stream)
  const analyser = context.createAnalyser()
  analyser.fftSize = 1024
  source.connect(analyser)
  const data = new Uint8Array(analyser.fftSize)
  const started = performance.now()
  const timer = setInterval(() => {
    analyser.getByteTimeDomainData(data)
    const bucket = Math.floor(data.length / 24)
    const levels = Array.from({ length: 24 }, (_, index) => {
      let energy = 0
      for (let at = index * bucket; at < (index + 1) * bucket; at++)
        energy += (((data[at] ?? 128) - 128) / 128) ** 2
      return Math.min(1, Math.sqrt(energy / bucket) * 4)
    })
    sample(
      levels,
      Math.min(15, Math.floor((performance.now() - started) / 1000))
    )
  }, 80)
  return () => {
    clearInterval(timer)
    source.disconnect()
    analyser.disconnect()
    void context.close().catch(() => {})
  }
}
