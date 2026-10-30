# Final evidence

Validated on October 30, 2026 from the local production previews.

## Playable loop

- Desktop production flow: `artifacts/pass-3-design/`
- States covered: title, active play, live quest dialogue, stop arrival, transport menu, riding, reward, and restart.
- Live quest completion reached `completed: 1` and reward state.
- No page errors, console errors, or failed requests were recorded in the final flow checkpoint.

## Mobile and XR

- Mobile viewport: `390×844`; canvas capture: `390×664`. Mobile flow: `artifacts/pass-3-design-mobile/`.
- Real touch joystick moved the player and reset on pointer release.
- Touch interaction target was present.
- `navigator.xr` was present, while `immersive-vr` reported unsupported in the test browser; the XR entry control stayed hidden.
- Physical Quest 3 hardware was not tested.

## Visual and performance evidence

- Canvas inspector manifest: `artifacts/evidence.json`
- Captures: `artifacts/pass-2-inspector/`
- Desktop active play: entropy `4.58`, edge density `0.308`, contrast `171.5`.
- Desktop quest: entropy `4.52`, edge density `0.237`, contrast `108`.
- Desktop reward: entropy `4.75`, edge density `0.291`, contrast `132.5`.
- Mobile active play: entropy `4.36`, edge density `0.231`, contrast `171.2`.
- Final desktop capture: `181` draw calls, `307,578` triangles, `75` geometries, `47` textures.
- Final mobile capture: `129` draw calls, `300,612` triangles, `64` geometries, `40` textures.
- Hardware GPU was active in the browser capture: Apple M1 Pro via ANGLE Metal.

## Audio evidence

- Harness report: `artifacts/audio-check.json`
- Loaded assets: `confirm`, `bell`, `reward`, and `city`.
- Real controls exercised unlock, five gameplay/UI events, pause/resume, mute, and restart.
- Hidden-tab lifecycle was exercised with synthetic `visibilitychange`.
- Missing `city.mp3` produced the expected graceful fallback without page errors.

## Design hub

- Source: `apps/design/`
- Desktop and mobile evidence: `artifacts/design-hub/`
- `bun run check` covers `apps/design`; `tsgo -b` and `vite build` in `apps/design` passed.
- `node scripts/qa-hub.mjs` passed at `1440×900` and `390×844`: navigation, diorama pin selection, conversation action, sound toggle, Vietnamese fonts loaded, zero horizontal overflow, no page or console errors.

## Release checks

- `bun run check` passed.
- `bun run check:types` passed.
- `bun run build` passed.
- `bun run test` passed.
- Docker image build passed with `docker build -f apps/server/Dockerfile -t saigon-tour-api:pass-2 .`.
- Required client assets exist in `apps/client/dist/`.
- Client secret scan found no Meta key, endpoint, bearer credential, or model identifier in client source/build output.
- No deployment or public hosting verification was performed.

## City hub, player, and District 1 (October 31, 2026)

- Hub: `artifacts/pass-4-hub/`. Desktop flow opened the hub after the reward, matched wallet to game coins, showed three done story steps, opened Journal from the hub, toggled with `H`, closed with `Esc`. Mobile at 390 px: hub opened from the header, zero horizontal overflow, sound toggle muted the game.
- Tourist player: `artifacts/pass-5-player/`; desktop and mobile flows passed with walk, sprint, and idle clips from the pack.
- District 1: `artifacts/pass-6-city/`. Desktop and mobile quest flows passed with no page or console errors. `scripts/qa-ride.mjs` boarded the bus from Bến Thành to Nhà thờ Đức Bà through the transport panel: 16.8 s ride, 5 coins charged, arrival at the cathedral stop, then walked north into Công xã Paris.
- Landmark runtime copies: Nhà thờ Đức Bà 36k triangles / 1.2 MB, Tòa Thị Chính 19k triangles / 0.87 MB (sources 90k and 42k triangles with 4K maps).
- Renderer, desktop 1440×900: active play 171 calls / 383k triangles / 42 textures; City Hall 101 calls / 221k; cathedral 79 calls / 253k.
- Renderer, mobile 390×844: active play 123 calls / 379k triangles / 41 textures; City Hall 89 calls / 205k; cathedral 79 calls / 253k. Mobile active play is over the 300k triangle starting budget; the Bến Thành market model (189k triangles) is the main cost and was already the largest asset.
- Agent harness: `artifacts/pass-7-harness/`, against a production preview and the live model. The real quest flow passed on desktop and 390 px mobile with no page or console errors. Live tool calls seen in the server log: `offer-quest`, `check-quest`, `remember-player-fact`, `get-world-context`. Handing the herbs to Chị Linh granted nothing; Cô Hoa's server-side `check-quest` granted 50 coins and the postcard. With the API stopped, the same flow still reached the reward and hub through the offline path (`artifacts/pass-7-harness/offline/`); the browser logged 502s from the dead proxy, as expected.
- API Docker image built and ran; `/health` served fallback mode without a key, the interact route offered the quest, and the image contains only `dist` (no `.env`).
- Third refinement pass: asset increased to 463 objects; side walls now have repeated lower/upper arched windows, pilasters, cornices, projecting bay rooflets, and warmer reference-matched materials/lighting.
- Fourth refinement pass: replaced the oversized front gable silhouette with compact sloped roof planes, added stepped gable bands, clock faces, rose tracery, and center pilasters; asset now contains 489 objects.
- Fifth refinement pass: added rear apse rose-window tracery, layered roof rings, radial buttresses, rear windows, and rear finial; asset now contains 528 objects.
- Recovery and front-view validation: loaded the detailed 528-object asset from `nhathoducba.blend1`, made `Cathedral_Recovery` the active scene, saved a corrected `nhathoducba.blend`, re-exported `nhathoducba.glb`, and rendered `nhathoducba-front-preview.png` from a straight-on camera.
- Presentation refinement: corrected the saved scene to a 528-object cathedral, warmed facade/slate materials, increased studio fill, and re-rendered the straight front view at 1000x780.
- Front composition refinement: pulled the camera back to include full twin spires and crosses in the primary front render; preview is now 1000x820.
- Front-detail pass: added tower window arch trim, window sills, warm gable accents, and inset door panels; asset now contains 560 objects and was re-exported.
- Spire detail pass: added repeated front dormer trim/glass accents and spire ridge accents; asset now contains 574 objects and was re-exported.

- 2026-10-31: Inspected three-quarter render; confirmed twin spires, layered roof, side aisle rhythm, facade clocks/rose, and warm terracotta/slate palette. Added bevel pass to soften blocky edges and refreshed deliverables/previews.

- 2026-10-31: Applied additional presentation refinement: neutral blue-gray world, brighter multi-light studio, and preserved editable/exportable asset state.

- 2026-10-31: Geometry refinement added warm terracotta Gothic arch framing around both tower window stacks; export and render validation passed.

- 2026-10-31: Rose-window fidelity pass validated in Blender and GLB export.

- 2026-10-31: Refreshed three-quarter render after rose tracery pass; asset remains 584+ editable objects with valid GLB export.

- 2026-10-31: Side elevation fidelity pass added repeated Gothic window framing on both sides and validated export.

- 2026-10-31: Material fidelity pass completed with warmer terracotta and lighter slate values; export/render validation passed.

- 2026-10-31: Added and rendered a dedicated rear validation camera to inspect the apse/rear silhouette; rear preview generated successfully.

- 2026-10-31: Rear apse fidelity pass validated with new repeated windows and arch trims.

- 2026-10-31: Rear silhouette refinement added vertical Gothic articulation matching the reference apse segmentation.

- 2026-10-31: Front facade clock fidelity pass validated in Blender/GLB/render.

- 2026-10-31: Side roof silhouette pass validated with new sloped canopy planes and GLB export.

- 2026-10-31: Side-buttress cap pass validated: 12 cap meshes present, `.blend` saved, `.glb` re-exported with `glTF` binary signature, and the three-quarter preview refreshed. Remaining visual gap: side elevations and apse still need substantial architectural refinement toward the reference sheet.

- 2026-10-31: Structural pass validated in Blender: transept and apse roof-curve meshes present, misleading railing-like extras hidden, `.blend` saved, `.glb` re-exported, and three-quarter preview refreshed. Significant mismatch remains in Gothic proportions and facade fidelity; objective not complete.
