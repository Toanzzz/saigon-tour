/**
 * Generate an image via the OpenAI-compatible image gateway and save it to a file.
 *
 * Usage:
 *   bun scripts/generate-image.ts --prompt "..." --out path/to/file.png \
 *     [--model gpt-image-2] [--size 1024x1024] [--input-image reference.jpg]
 * --json-edits sends inline image references to JSON-only image gateways.
 *
 * Env (from .env, auto-loaded by Bun):
 *   IMAGE_GENERATION_API_URL, IMAGE_GENERATION_API_KEY
 *
 * Models: gpt-image-2 (ChatGPT) · gemini-3.1-flash-image (Google) · grok-imagine-image (Grok)
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { generateImage } from 'ai'

const { IMAGE_GENERATION_API_URL, IMAGE_GENERATION_API_KEY } = process.env
if (!IMAGE_GENERATION_API_KEY || !IMAGE_GENERATION_API_URL)
  throw new Error(
    'Missing IMAGE_GENERATION_API_URL / IMAGE_GENERATION_API_KEY in env'
  )

function arg(name: string, fallback?: string): string | undefined {
  const flag = `--${name}`
  const i = process.argv.indexOf(flag)
  if (i !== -1 && i + 1 < process.argv.length) return process.argv[i + 1]
  const inline = process.argv.find((a) => a.startsWith(`${flag}=`))
  if (inline) return inline.slice(flag.length + 1)
  return fallback
}

const prompt = arg('prompt')
const out = arg('out')
const model = arg('model', 'gpt-image-2') as string
const size = arg('size', '1024x1024') as `${number}x${number}`
const inputImage = arg('input-image')
const jsonEdits = process.argv.includes('--json-edits')
if (!prompt || !out) {
  throw new Error(
    'Usage: bun scripts/generate-image.ts --prompt "..." --out file.png [--model] [--size] [--input-image reference.jpg] [--json-edits]'
  )
}

const provider = createOpenAICompatible({
  name: 'image-provider',
  baseURL: IMAGE_GENERATION_API_URL,
  apiKey: IMAGE_GENERATION_API_KEY,
  fetch: async (input, init) => {
    if (!jsonEdits || !(init?.body instanceof FormData))
      return fetch(input, init)
    // JSON-only image gateways accept the same references as inline data URLs.
    const body: Record<string, unknown> = {}
    const images: { image_url: string }[] = []
    for (const [key, value] of init.body.entries()) {
      if (value instanceof Blob && key.startsWith('image')) {
        const bytes = Buffer.from(await value.arrayBuffer())
        images.push({
          image_url: `data:${value.type};base64,${bytes.toString('base64')}`,
        })
      } else if (typeof value === 'string') {
        body[key] = key === 'n' ? Number(value) : value
      }
    }
    body.images = images
    const headers = new Headers(init.headers)
    headers.set('content-type', 'application/json')
    return fetch(input, { ...init, headers, body: JSON.stringify(body) })
  },
})

const { image } = await generateImage({
  model: provider.imageModel(model),
  prompt: inputImage
    ? { images: [await readFile(inputImage)], text: prompt }
    : prompt,
  size,
  maxRetries: 0,
  abortSignal: AbortSignal.timeout(240_000),
}).catch((error: unknown) => {
  const failure = error as {
    message?: string
    statusCode?: number
    responseBody?: string
  }
  console.error(
    `Image request failed: ${failure.statusCode ?? 'network'} ${failure.message ?? 'unknown error'}`
  )
  if (failure.responseBody) console.error(failure.responseBody.slice(0, 1500))
  process.exit(1)
})

// The gateway may return JPEG even for a .png request; honour the real type.
const extByType: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}
const wantExt = extByType[image.mediaType] ?? 'png'
const finalOut = out.replace(/\.(png|jpe?g|webp)$/i, `.${wantExt}`)
await mkdir(dirname(finalOut), { recursive: true })
await writeFile(finalOut, image.uint8Array)
process.stdout.write(
  `Wrote ${finalOut} (${image.uint8Array.length} bytes, ${image.mediaType}) with ${model} @ ${size}\n`
)
