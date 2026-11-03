import assert from 'node:assert/strict'

export async function observeMicrophone(page) {
  await page.addInitScript(() => {
    const original = navigator.mediaDevices.getUserMedia.bind(
      navigator.mediaDevices
    )
    window.__VOICE_QA_STREAMS__ = []
    window.__VOICE_QA_CAPTURE_ERRORS__ = []
    navigator.mediaDevices.getUserMedia = async (...args) => {
      try {
        const stream = await original(...args)
        window.__VOICE_QA_STREAMS__.push(stream)
        return stream
      } catch (error) {
        window.__VOICE_QA_CAPTURE_ERRORS__.push(
          `${error.name}: ${error.message}`
        )
        throw error
      }
    }
  })
}

export async function inspectVoiceUpload(request) {
  const multipart = await new Request('http://voice-qa.test', {
    method: 'POST',
    headers: request.headers(),
    body: request.postDataBuffer(),
  }).formData()
  const audio = multipart.get('audio')
  assert(audio instanceof File)
  const bytes = await audio.arrayBuffer()
  const view = new DataView(bytes)
  assert.equal(new TextDecoder().decode(bytes.slice(0, 4)), 'RIFF')
  assert.equal(new TextDecoder().decode(bytes.slice(8, 12)), 'WAVE')
  assert.equal(view.getUint16(20, true), 1)
  assert.equal(view.getUint16(22, true), 1)
  assert.equal(view.getUint32(24, true), 24000)
  assert.equal(view.getUint16(34, true), 16)
  assert(bytes.byteLength > 44 && bytes.byteLength <= 44 + 15 * 48000)
  return { bytes: bytes.byteLength, locale: multipart.get('locale') }
}
