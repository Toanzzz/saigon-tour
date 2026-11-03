/**
 * Create gratitude illustrations using each NPC's existing portrait as reference.
 * bun scripts/generate-npc-gratitude.ts hoa ba alex
 * bun scripts/generate-npc-gratitude.ts
 * FORCE=1 regenerates selected files; IMAGE_CONCURRENCY defaults to 1.
 */
import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { NPC_REGISTRY } from '../packages/shared/src/npcs/registry'

const root = resolve(import.meta.dirname, '..')
const model = process.env.IMAGE_MODEL ?? 'gemini-3.1-flash-image'
const gestures: Record<string, string> = {
  hoa: 'a hand over her heart and the other palm warmly open',
  tam: 'a cheerful thumbs-up and a broad, relieved smile',
  linh: 'an appreciative hand over her heart and a welcoming open palm',
  ba: 'a gentle hand over his heart and a fond, slightly misty-eyed smile',
  mai: 'a small grateful smile, one hand over her heart',
  alex: 'a cheerful thumbs-up while the camera hangs safely from its strap',
  vy: 'a delighted smile and an open hand presenting a small warm lantern',
  son: 'a heartfelt smile while holding a blank postcard near his heart',
  thao: 'a shy, grateful smile and one hand gently over her heart',
  'bread-vendor':
    'a delighted smile, one hand over the heart, baguette tucked safely beside the torso',
  'fruit-vendor': 'a warm grateful smile and an open, welcoming palm',
  'market-browse': 'a bright thankful smile and one hand over the heart',
  'market-walk': 'a relaxed, grateful thumbs-up',
  'market-family': 'a warm thankful smile with a hand over the heart',
  'coffee-friend': 'a friendly appreciative smile and a casual thumbs-up',
  'coffee-reader': 'a quiet grateful smile with a hand over the heart',
  commuter: 'a relieved smile and a warm thumbs-up',
  student: 'an excited thankful smile and a cheerful thumbs-up',
  'park-reader': 'a gentle thankful smile and a small open-handed gesture',
  'park-stretch': 'an energetic grateful thumbs-up and an encouraging smile',
  'plaza-friends':
    'a sunny thankful smile, her right hand still holding her shoulder-bag strap, and her only other hand resting over her heart. Exactly two arms and two hands total; do not add a third hand or a wave',
  'plaza-stroll':
    'a theatrical but sincere hand over the heart and a warm smile',
  'opera-visitor': 'a small approving smile and an elegant hand over the heart',
  'postcard-reader':
    'a dreamy grateful smile holding a blank postcard near the heart',
  'square-tourist':
    'a delighted thankful thumbs-up while a folded map rests at the side',
  'riverside-friends': 'a relaxed grateful smile and a hand over the heart',
  'river-jogger': 'a breathless happy smile and an encouraging thumbs-up',
  'alley-vendor': 'a warm relieved smile with an open, thankful palm',
  'alley-diner': 'a delighted approving smile and a cheerful thumbs-up',
}

const requested = process.argv.slice(2)
const ids = requested.length ? requested : Object.keys(NPC_REGISTRY)
for (const id of ids)
  if (!(id in NPC_REGISTRY)) throw new Error(`Unknown NPC: ${id}`)
const concurrency = Math.min(
  4,
  Math.max(1, Number(process.env.IMAGE_CONCURRENCY) || 1)
)
const force = process.env.FORCE === '1'
const failed: string[] = []
let cursor = 0
let done = 0
let skipped = 0

async function generate(id: string) {
  const npc = NPC_REGISTRY[id as keyof typeof NPC_REGISTRY]
  const directory = `packages/npc-${id}/assets/avatar`
  const files = await readdir(resolve(root, directory))
  if (
    !force &&
    files.some((file) => /^gratitude\.(png|jpe?g|webp)$/i.test(file))
  ) {
    skipped++
    console.log(`skip ${id} (gratitude exists)`)
    return
  }
  const portrait = files.find((file) =>
    /^portrait\.(png|jpe?g|webp)$/i.test(file)
  )
  if (!portrait) throw new Error(`Portrait missing: ${id}`)
  const prompt = [
    'Edit the supplied character portrait into a quest-completion thank-you illustration for the same friendly Saigon mobile game.',
    `This is ${npc.profile.names.en} (${npc.profile.names.vi}). Preserve the exact character identity from the reference: face, age, gender, skin tone, hairstyle, headwear, outfit, accessories, and proportions.`,
    'Preserve the exact illustrated art direction: bold confident black ink outlines, clean 2D cartoon shapes, flat cel-shaded vibrant colors, simple soft shading, and the same solid background color.',
    `Express sincere gratitude directly to the viewer with ${gestures[id]}.`,
    'Redraw a complete continuous upper body down to the waist at the bottom edge, not the cut-out circular bust of the source. Both arms must connect naturally from shoulders through sleeves and elbows to wrists and hands; no detached or floating arms or cut-off sleeves.',
    'Show a centered waist-up character, with the face, top of headwear, forearms, and hands fully inside the square frame. Leave a little clear margin above the head and around the hands. The torso extends naturally through the bottom edge. Keep the face large and readable.',
    'Natural hands with five fingers, no extra limbs or duplicate objects. Do not invent new clothing, change the gender, or replace signature props.',
    'One character only. No lettering, captions, logos, watermark, border, speech bubble, decorative interface, photorealism, or 3D rendering. Any postcard, map, or book has no readable text.',
    'The result must feel like another expression drawn by the same artist for the reference portrait, with a clear, warm thank-you gesture.',
  ].join(' ')
  console.log(`generate ${id}`)
  const process = Bun.spawn(
    [
      'bun',
      'scripts/generate-image.ts',
      '--model',
      model,
      '--size',
      '1024x1024',
      '--input-image',
      `${directory}/${portrait}`,
      '--json-edits',
      '--out',
      `${directory}/gratitude.jpg`,
      '--prompt',
      prompt,
    ],
    { cwd: root, stdout: 'inherit', stderr: 'inherit' }
  )
  if ((await process.exited) !== 0) failed.push(id)
  else done++
}

await Promise.all(
  Array.from({ length: concurrency }, async () => {
    while (cursor < ids.length) {
      const id = ids[cursor++]
      try {
        await generate(id)
      } catch (error) {
        failed.push(id)
        console.error(
          `${id}: ${error instanceof Error ? error.message : error}`
        )
      }
    }
  })
)
console.log(`Generated ${done}, skipped ${skipped}, failed ${failed.length}`)
if (failed.length) {
  console.error(`Failed NPCs: ${failed.join(', ')}`)
  process.exit(1)
}
