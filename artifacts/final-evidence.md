# Final evidence

## Current city completion (October 31, 2026)

- Commits: `5925fd9` (NPC labels and live-guide layout), `b3b65c4` (wandering NPCs, secret quests, city-wide story trail), `872fd06` (landmark plaza and river promenade density), `8ca2b10` (hub completion edge case), `0c07a41` (clock-side cathedral entrance orientation), `f95e0a9` (destination story beats and offline quest parity), `31f8f32` (second density and transport-sign pass), `70927ac` (delivery marker target correction), `6032a76` (marker/name spacing), and `6b3f734` (hub portrait scoping).
- Required gates passed after the final pass: `bun run check`, `bun run check:types`, `bun run build`, and `bun run test`.
- Server tests: 65 passing and one skipped. Client tests: 40 passing.
- Headless Playwright on the reused dev server (`58000`/`58001`) passed at `1440×900` and `390×844`:
  - `scripts/qa-city-complete.mjs`: evening toggle, coffee purchase, Metro ride, river postcard, no page or console errors, and no failed requests after the final cathedral transform.
  - `scripts/qa-city-expansion.mjs --pass=complete`: movement, map, bus fare and arrival, landmark GLB requests, Opera/Post Office/alley views, and filled plaza captures.
  - Focused secret-NPC flow: Vy remained visible while inactive labels stayed hidden, the City Hall lantern quest offered and completed after a real destination visit, the active label moved to Vy, the hub showed all eight city stops plus the secret quest, and the layout had no horizontal overflow.
- The corrected cathedral captures show the clock-side entrance and front doors facing the Công xã Paris square; the apse is behind the building.
- The second density pass was exercised at six zones—City Hall, park, Opera, Post Office, riverfront, and food alley—in both viewports with no page errors or failed requests. The hub trail assertion found all eight destination names and their named story beats (`Cô Hoa`, `Chị Linh`, `Vy`, `Thảo`, `Sơn`) at both widths.
- Marker geometry checks passed at `1440×900` and `390×844`: the marker’s rendered bottom stayed above the active NPC name’s top edge.
- Hub live-guide captures now show the portrait, NPC name, role, and Live/Offline guide badge in separate readable header columns at both target widths.
- Renderer observations from the complete city flow: desktop active view `212 calls / 351,713 triangles`; mobile active view `158 calls / 344,438 triangles`. The mobile triangle count remains above the starting budget because the market landmark and expanded city life are visible together.
- Evidence: [city-expansion-2026-10-31](city-expansion-2026-10-31/), including desktop/mobile JSON reports and captures for the city density, secret quest, hub trail, cathedral, Opera House, Post Office, riverfront, and food alley.

## City expansion validation

- Target: the running dev client `http://127.0.0.1:58000` and API `58001`, with Postgres available.
- Headless Playwright: `scripts/qa-city-expansion.mjs --pass=landmarks`; desktop `1440×900` and mobile `390×844`.
- Observed: keyboard and touch movement, map open/close, real transport controls, five-coin bus fare, cathedral stop arrival in 16.8 seconds, statue requests returning 200, no page/console errors or failed requests.
- Runtime statue copies: cathedral 38,196 bytes / 1,121 triangles; City Hall 25,824 bytes / 2,126 triangles. Draco decoding and glTF headers verified; sources retained.
- Representative active view: desktop 173 calls / 329,340 triangles; mobile 128 calls / 324,591 triangles. Mobile is above the 300k triangle starting budget; more culling/LOD is pending with city-life integration.
- Root types, production build, 58 server tests, and 38 client tests pass. Lint passes for the integrated landmark changes.
- Evidence: `artifacts/city-expansion-landmarks/`. Baseline artifacts interrupted by HMR are incomplete and are not used as performance proof.

### City life and named conversations

- Headless Playwright: `scripts/qa-city-expansion.mjs --pass=life`; desktop `1440×900` and mobile `390×844`.
- Observed: movement/map/bus flow still passed; 20 ambient residents reported in diagnostics. Active crowd counts were market 10, plaza 3, river 2, and food alley 10 with a 32-unit animation radius.
- Mai and Alex were opened with real keyboard/touch interaction, each completed a two-reply conversation, showed “Live NPC conversation”, and left the wallet unchanged with no quest controls.
- No page/console errors or failed requests. Active-life renderer: desktop 208 calls / 348,737 triangles; mobile 154 calls / 341,462 triangles. Mobile remains above the 300k starting triangle budget; the large market landmark dominates the count.
- Runtime assets: 40 prepared models / 1.48 MiB total prepared collection; fishing boat 237 triangles, rowboat 168 triangles, coffee 108 triangles, banana 104 triangles.
- Evidence: `artifacts/city-expansion-life/`.

### Time of day, purchases, transport, and postcard view

- Headless Playwright: `scripts/qa-city-complete.mjs`; desktop `1440×900` and mobile `390×844`.
- Real controls passed at both widths: pause → “Evening city lights”, market → coffee purchase, Metro selection → Opera House arrival, river → postcard view → return.
- Coffee purchase changed the wallet by 3 coins, added `Cà phê sữa ×1`, and the shared event reducer test verifies the catalog price and insufficient-wallet guard.
- Metro used the express cultural route and charged 6 coins. Bus/branch route coverage remained green.
- The river postcard view centered the camera on the waterfront/skyline composition; the dialog and return control restored the normal camera.
- No page/console errors, failed requests, or mobile horizontal overflow. Active-day metrics: desktop 238 calls / 355,033 triangles; mobile 158 calls / 344,438 triangles. Postcard view: desktop 336 calls / 361k triangles / 128 textures; mobile 176 calls / 189k triangles.
- Evidence: `artifacts/city-expansion-complete/`.

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
- Renderer, mobile 390×844: active play 123 calls / 379k triangles / 41 textures; City Hall 89 calls / 205k; cathedral 79 calls / 253k. Mobile active play is over the 300k triangle starting budget; the Bến Thành market is the main cost.
- Agent harness: `artifacts/pass-7-harness/`, against a production preview and the live model. The real quest flow passed on desktop and 390 px mobile with no page or console errors. Live tool calls seen in the server log: `offer-quest`, `check-quest`, `remember-player-fact`, `get-world-context`. Handing the herbs to Chị Linh granted nothing; Cô Hoa's server-side `check-quest` granted 50 coins and the postcard. With the API stopped, the same flow still reached the reward and hub through the offline path (`artifacts/pass-7-harness/offline/`); the browser logged 502s from the dead proxy, as expected.
- Landmark sources from `assets/landmarks/` (`artifacts/pass-8-assets/`): Draco decoding fixed by registering `draco3d` with gltf-transform. Runtime copies now ship without Draco. Nhà thờ Đức Bà 3.9k triangles / 300 KB, Tòa Thị Chính 2.4k / 236 KB, Bến Thành 189k / 8.1 MB. Desktop City Hall view went from 221k to 188k triangles, cathedral view from 253k to 172k. Desktop and mobile quest flows and the cathedral bus ride passed with the live model and no page or console errors.
- Simplified Chợ Bến Thành (`artifacts/pass-9-market/`): source 188,834 → 141,572 triangles, runtime copy `models/landmarks/cho-ben-thanh.glb` 8.1 → 7.2 MB; the outdated `models/ben-thanh-market.glb` is removed. Active play: desktop 383k → 336k triangles, mobile 379k → 331k (171 / 123 calls). Side-by-side render shows the clock tower, roofs, and arches intact. Desktop and mobile quest flows passed with the live model and no page or console errors.
- Mesh compression (`artifacts/pass-10-compress/`): all 34 runtime models are Draco-compressed. Same models compared: uncompressed 9.73 MiB, meshopt 3.16 MiB (1.31 MiB gzip), Draco 1.37 MiB (0.90 MiB gzip). Draco was smaller for every file; the market dropped from 7.2 MB to 392 KB. The self-hosted decoder adds 251 KB (≈75 KB gzip). Browser load fetched 36 files, 1.65 MB in total, with no off-origin requests. Triangle counts, animation clips, and renderer metrics were unchanged; the desktop and mobile quest flows and the cathedral bus ride passed with the live model and no page or console errors.
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

## Postgres saves and NPC harness validation

- `bun run check`, `bun run check:types`, `bun run build`, `bun run test`: passed. Server 30 tests, client 14 tests; real-Postgres test runs separately.
- `bun run test:integration`: passed against Compose Postgres 18 on 58002. Fresh app instances retain saves; concurrent completion checks yield one 50-coin reward and one completion row.
- Docker API image build passed, including generated migrations. Postgres Mastra storage initialized successfully against the shared pool.
- `prewarm` passed; unit proof covers all 16 greeting keys and zero model requests on rerun.
- Production headless Playwright: desktop quest, bus, herb delivery, reward, city hub, and restart passed; 390px joystick, hub, audio, and overflow checks passed. Evidence: `artifacts/pass-persistence/` and `artifacts/pass-persistence-mobile/`.
- `scripts/qa-persistence.mjs`: 1440px and 390px guest reload/reset passed. Reload shows the same guest name and 80 coins; actual pause/reset buttons retain the name and restore 30 coins. `session-flow.json` records observed values.


## Shared-world validation

- 13 real Node WebSocket tests passed: origin/token rejection, hello deadline, player broadcast, snapshots, emotes, bounds, payload/rate limits, room capacity, replacement sockets, NPC bark cooldown/cap, reconnect event dedupe, and room expiry.
- Browser QA with one desktop and one 390px context passed People panel presence, fixed Wave propagation, connection diagnostics, and mobile width checks with no page or console errors. Evidence: `artifacts/pass-multiplayer/flow.json`.


## Co-op and final verification

- Required gate order completed: `bun run check` → `bun run check:types` → `bun run build` → `bun run test`. Server: 58 passed, one integration case skipped in the unit run. Client: 38 passed. `bun run test:integration` separately passed the real-Postgres case.
- Docker image `saigon-tour-api` built with Node 24, both generated Drizzle migrations, and Mastra Postgres memory. Compose health returned `{ok:true,db:"up",mode:"fallback",model:null}`. API restart retained guest identity, 80 solo coins, and the completed quest (`artifacts/pass-persistence/server-restart.json`).
- Thirteen party tests cover connected/same-room/eight-unit rules, exact distance boundary, invitation recipient/expiry/decline, capacity recheck, join-order assignments, invalid deliveries, four-member concurrent one-time payouts, canonical tool outcomes with an active solo quest, leave/cancel, reset, reconnect retention/expiry, and real WebSocket party routing.
- Controlled tests first failed for HTTP solo-save loss during a team completion and stale HTTP party restoration. Save revisions and party ordering fences resolve both. Budget storage failure first returned 200 in a controlled test; it now returns 503.
- Two headless production contexts (1440px desktop and 390px touch) used People/Invite/Accept, Team errand, assigned delivery, and Check team errand controls. Both saved wallets increased 30→70; both gained one photo and +2 reputation. Reload kept the same names and balances. Existing debug teleports position guests at NPCs; no state injection grants progress/rewards. Results and reward captures: `artifacts/pass-coop/flow.json`, `reward-0.png`, `reward-1.png`.
- Final solo production regression covers walking, City bus, herbs, Chị Linh, Cô Hoa verification, reward, hub, and restart. Final mobile regression covers joystick, hub, sound, and width. No page/console errors in passing runs.
- Existing Vite large-chunk and Three.js test CJS-deprecation warnings remain; all gates pass. No public deployment or physical XR hardware test is claimed.


## Refactor pass 1 validation

- `bun run check`: Biome 2.6.4 clean across 191 files (no deprecated-import or import-cycle errors).
- `bun run check:types`: native `tsc -b` (typescript 7.0.2) built all three composite projects cleanly after removing @typescript/native-preview.
- `bun run build`: client and server bundles produced; only the pre-existing large-chunk advisory remains.
- `bun run test`: server 65 passed + 1 skipped (66); client 45 passed (45). Totals match the pre-refactor baseline. The THREE_CJS_DEPRECATED DeprecationWarning no longer prints from the client suite.
- Installed versions verified from node_modules: Biome 2.6.4, @types/three 0.187.0, @electric-sql/pglite 0.5.13, @ai-sdk/openai-compatible 3.0.82, @mastra/core 1.81.0, @mastra/memory 1.40.0, @mastra/pg 1.34.0.
