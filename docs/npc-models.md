# NPC world models

Each NPC in `packages/npc-<id>/` can ship its own world model at
`assets/model/<id>.glb` (plus an editable `assets/model/<id>.blend`). When a
package's `look.body` is `'own'`, the client loads `models/npcs/<id>.glb` for
that NPC instead of a shared Kenney body.

## Approach: dress the Kenney base (preserve rig + animations)

The world uses Kenney "mini-characters" skinned to a 7-bone armature
(`root, leg-left, leg-right, torso, arm-left, arm-right, head`) that carries the
named animation clips the client plays by name: `idle`, `walk`, `sit`,
`emote-yes`, `holding-both`, `interact-right`, and the rest of the Kenney set.

A bespoke NPC must keep that exact skeleton and those clip names or it loses its
animations (the client falls back to `idle`). So we do not generate a fresh
character; we start from a Kenney base GLB and dress it:

1. Import the runtime base `apps/client/public/models/people/character-<body>.glb`
   (rig + all actions + the shared 512px `colormap` palette texture).
2. Delete the stray unskinned `Icosphere`.
3. Graft props (hats/bags) onto a bone, preserving world transform:
   - Hats → bone-parent to `head`; nudge down so the brim meets the crown
     (`head` crown is at world z ≈ 0.72).
   - Bags/accessories → bone-parent to `torso`.
     Give props their own material so the player tint (which only recolours
     `outfit-top` / `outfit-bottom`) never touches them.
4. Add authored clothing (e.g. an apron) as a small panel in front of the torso
   (front is `-y`), weighted 1.0 to the `torso` bone via an `ARMATURE` modifier
   and a matching vertex group, so it deforms with the body.
5. Export GLB with `export_animations=True, export_animation_mode='ACTIONS',
   export_skins=True, export_yup=True`. Save the `.blend` as the editable source.

## Headless Blender

Blender is driven headless: `Blender --background --python build.py -- <args>`.
- Engine ids: `BLENDER_EEVEE`, `BLENDER_WORKBENCH`, `CYCLES`.
- No `bpy.context.screen` in background; use the data API, not UI operators.
- `Material.use_nodes` is set, then edit `node_tree` directly.
- Blender is killed inside the sandbox; run it escalated (native).

## Measure, then place

Read exact coordinates before placing props (bone head/tail world positions,
head-mesh crown height, prop native bbox) so hats sit on the crown and panels
sit just in front of the torso. Re-render after every change.

## Pipeline + wiring

- `scripts/prepare-assets.ts` Draco-compresses `model/<id>.glb` →
  `apps/client/public/models/npcs/<id>.glb` and records it in `manifest.json`.
  Verify the runtime GLB still lists the animation clips after compression.
- Set `look.body = 'own'`. The client resolves `ownModelPath(id)` to
  `npcs/<id>` and loads it in `neighbors.tsx` / `residents.tsx`.
- Reusable props live in `assets/cosmetics/*.glb` (nón lá, bucket-hat, helmet,
  volunteer-cap, beret, scarf, sunglasses, camera-strap, headphones, satchel,
  lantern-backpack/hat) and in the Kenney pack.

## Verify

- Blender renders of `idle`, `walk`, and `sit` (props follow the rig).
- `bunx @gltf-transform/cli inspect` confirms clips survive Draco.
- Headless Playwright: the model loads 200 with no page errors; the NPC renders.
- Gates: `bun run check:types` → `bun run build` → `bun run test`.
