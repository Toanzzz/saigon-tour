# Game progress

## Current scope

Stylized District 1 exploration with NPC-authored errands, a shared-room City Director, persistent player progress, and anonymous-first co-op presence.

- Player promise: meet neighbors, help with small errands, and discover a compact Sài Gòn neighborhood.
- Core loop: talk → ask for an errand → follow 1–3 validated steps → return to the giver → receive a persistent reward. Walking is free; transport and market purchases spend coins.
- Spatial plan: Bến Thành anchors Lê Lợi; Nguyễn Huệ links City Hall and the river; Đồng Khởi links the Opera House and cathedral/Post Office square. The food alley and park provide quieter destinations.
- World: licensed character/prop assets, authored streets and landmark façades, supplied landmark statues, Draco-compressed models, day/evening lighting, ambient crowds, transport, market, and river viewpoint. A coin collectible model (`models/collectibles/coin.glb`, built by `scripts/blender/build-collectibles.py`) renders as a spinning 3D `CoinEmblem` everywhere the currency appears — HUD header, journal, hub wallet and story card, and the reward popup — plus ambient world pickups along the District 1 walkways. The flat 2D glyph is the SSR/test and error fallback.

## Systems

- **NPC response latency:** a model-authored errand returns its validated description and localized first step as soon as `proposeQuest` accepts it. No follow-up model request is needed. Rejected proposals can be corrected within the three-step limit; hidden riddle steps stay hidden. Ordinary chat and milestone dialogue retain their normal generation.

- **Quests:** NPCs author errands of one to three `GO_TO`, `TALK_TO`, `DELIVER`, or `BUY` steps, validated against shared persona domains. Players hold at most three. The server owns ids, rewards, progress, and once-only completion through `quest_completions`. Any interaction with the giver completes ready quests. Active errands expire after twenty minutes; abandonment, expiry, and declining reclaim supplied items. The journal tracks and abandons errands; minimap pins follow live NPC targets. The offline mirror uses the same shared engine.
- **Party errands:** a shared quest id and original recipient list, independent progress, atomic group assignment, and once-only rewards pushed to every member. Leave/disconnect keeps participation; abandon/reset removes the player’s copy.
- **Collectible coins:** ambient `collectibles/coin` pickups spin along the Lê Lợi / Nguyễn Huệ / park / river walkways (authored in `packages/shared/src/collectibles.ts`). Walking into one grants coins once per player through `POST /me/pickups/:coinId` and the `coin_pickups` ledger, and plays a short collect effect (pop + rise + gold `Sparkles` burst, ~0.5 s, transform-only so the shared coin material is untouched); reduced motion collapses it to an instant vanish. On any coin gain the HUD header wallet pulses and floats a "+N" (reduced motion fades without the bounce). The client never mutates currency directly, offline guests still see the coin vanish with a pickup ping, and reset clears the ledger and any in-flight effect. Decorative-plus-grant only — amounts, fares, and the HUD glyph are unchanged.
- **Fragile parcel carry:** a client `features/carry/` slice wobbles a fragile deliverable (`FRAGILE_ITEM_IDS`, currently `cake`) while an active quest will deliver it and the item is held. A pure spring-damper (`wobble.ts`) takes impulses from sprint toggles and sharp on-foot turns, and from xe ôm path corners; cyclo, bus, and metro rides stay smooth. The peak wobble maps to a sticky care level (pristine → wobbly → landscape) in `carryStore`; it never un-squashes until `resetCarry()` on a new carry or restart. A procedural 3-tier cake on a tray (THREE primitives, no asset) tilts with the wobble at the avatar's hands and on the rider, gated out of XR and pinned level under reduced motion. Narrator asides (≤1 per 8 s) and the recipient's per-care reaction are authored EN/VI lines; delivery sends `carry_prompt_deliver_care` so a live NPC reacts to the care, and the reaction toast shows immediately offline. Reward and quest behavior are unchanged by care level — no failure state. `carry()` test hook exposes the snapshot for QA.
- **NPCs, friendship, memory:** 29 agents, nine neighbors and twenty residents. Friendship (−5 to +5) lives on the player row with normal locks, revisions, socket saves, and reset. Rules and memory: `docs/agent-harness.md`. Opening a conversation shows a cached greeting stored in the NPC/player thread; reopening shows earlier messages. Resident walkers pause near the player.
- **Conversation UI:** an errands strip (ready, needs you, in progress, available) from the shared `dialogueQuests`; NPC speech bubbles; a `role · location` eyebrow; a portrait rendered from the character model with a five-tier affinity crest and `affinity-info` popover; mini-avatars per NPC message. World quest diamonds render only with a `!`/`?` glyph; Pause has a symbols guide.
- **City Director:** the world room’s events, weather, NPC placements and needs, and headlines, with deterministic validation, authored anchors, a two-event cap, one news-informed day plan drafted per UTC day, and daily count/spend guards. News sets the day's mood and may lightly theme an event, reframed rather than copied. `DIRECTOR_MODE` is `live`, `scripted`, or `off`; the news feed defaults in code to VnExpress `thoi-su`, overridable by `DIRECTOR_NEWS_URL`. Colyseus patches synchronize state; headlines produce toasts; rain uses tint/fog; event markers and the hub City pulse reflect room state.
- **Unlocks and wardrobe:** 27 signature unlocks (nine neighbors × neutral 0 / warm 2 / close 4 friendship tiers) in `packages/shared/src/unlocks`. A reward carries the giver’s first not-owned, tier-allowed unlock; grants are idempotent inside the completion guard; reset clears them. `POST /me/equip` validates ownership and slot, then pushes the look to presence. The wardrobe (`I`) is a 3D fitting room under one shared drei `View` canvas, usable while walking, riding, paused, or in the hub; the reward popup offers “Wear now”. Bicycle unlocks render the procedural `Bike`.
- **Avatar:** plain `player-man` and `player-woman` bodies built by `scripts/blender/build-player-bases.py`, with recolourable `outfit-top`/`outfit-bottom` materials. `players.body` defaults to `man` and travels on `GuestPlayer`, `PresencePlayer`, and the Colyseus `PresenceState`. Remote tints recolour clothing only.
- **Shared room:** one `world` room of twenty with a waiting notice and `GET /realtime/status`. Details: `docs/multiplayer.md`.
- **Title and journey:** a fresh player sees the name field with gender toggle and dice, Start exploring (plus Enter VR where supported), and the guest/Meta account line. A returning player sees Welcome back, a summary chip (favors · tracked quest · location), `Continue journey as {name}`, and Start a new journey. Renaming and body choice during a journey live in Pause. Start a new journey is a two-tap confirm on the title, Pause, and reward screens; the confirm reverts after 4 seconds; it erases progress only and returns to the fresh title with the name prefilled. Escape toggles pause; the game store owns modal close.
- **Identity:** anonymous Better Auth guests get a generated editable name; the dice draws a random body and a matching first name. Facebook login links progress, and an existing account save wins. Reset preserves identity; clear saved data drops the persisted query cache.
- **i18n:** English and Vietnamese through Paraglide JS 2. The title `EN | VI` toggle and the Pause language select switch live. The server adds a per-turn language rule, caches greetings per locale, and has Vietnamese fallbacks and seed quests. Room-wide barks, headlines, and Director events stay English; saved quests keep their original language.
- **Client state:** TanStack Stores with explicit resets (`docs/architecture.md` §4). Position-only changes do not re-render `GameUI`; `?debug` exposes `state.gameUiRenders`, and `scripts/qa-store-perf.mjs` checks it while walking.
- **City solids:** one registry (`shared/world/solids.ts`) feeds the colliders (`shared/world/collision.tsx`), the layout lint (`test/city-layout.spec.ts`) and the `?debug` physics overlay, so visuals and collision cannot drift apart. Building and market colliders come from measured model bounds in `shared/world/footprints.generated.ts` (written by `scripts/prepare-assets.ts`), including the bbox centre offset. Shared prop placements live in `shared/world/placements.ts`. The lint checks building/road/plaza/landmark/park overlap, collider coverage, that spawn/NPC/stop/map points sit outside solids, and flood-fill reachability from spawn.

## Runtime and deploy

- Bun 1.4.4, React Three Fiber/Three.js, Rapier, TanStack Query/Store, WebXR; Node/Hono, Mastra, Better Auth, Colyseus, Postgres 18; shared Zod contracts.
- Ports: client 58000, API 58001, Postgres 58002. Ask the user to start/restart local development servers. `bun dev` exits the API on SIGINT/SIGTERM and force-kills it after 3 seconds.
- Model: `muse-spark-1.3-contributor` at `https://api.meta.ai/v1/chat/completions` by default; `META_MODEL`/`META_API_URL` select another OpenAI-compatible provider. `META_MUSE_API_KEY` stays server-side.
- `.github/workflows/deploy.yml`: a push to `main` runs verify → arm64 API image to GHCR → SSH recreate on t-oracle via `scripts/deploy-remote.sh` and `compose.prod.yml` → client `wrangler deploy` with `VITE_API_BASE_URL=${API_URL}`. Pull requests run verify only. `bun run credentials` sets the secrets, vars, deploy key, and host `.env`.
- Deployed: the last successful Deploy run is for `d9a2bc1`; later commits are not deployed. `https://saigon-tour-api.toan.io/health` reports `live` with the Muse model.

## NPC packages

Each of the 29 NPCs owns a `packages/npc-<id>/` package (profile, story, unlocks,
look, place, and a server-only persona), aggregated by
`packages/shared/src/npcs/registry.ts`. The legacy shared exports and a new
`NPC_LOOKS` derive from the registry; prompts load through the server-only
`@saigon/shared/personas` subpath, so no prompt text reaches the client bundle.
Resident portraits now use each resident's own body and colour. Scaffold with
`bun scripts/new-npc.ts <id> [neighbor|resident]`.

Eight featured residents (`bread-vendor`, `park-stretch`, `square-tourist`,
`plaza-stroll`, `river-jogger`, `opera-visitor`, `postcard-reader`,
`alley-diner`) now use `defineNpc` with their own profile/story/persona/look/
place files, a bespoke comedic voice, a per-resident quest domain, and a gag
seed (composed first in `story.ts`) whose single step lands a payoff. Residents
address the player as "bạn"; personas.ts prefers a non-empty package persona
over the shared resident template.

## Kishotenketsu twist arcs

Each of the eight neighbors has a first seed (`packages/npc-<id>/src/seeds/arc.ts`,
imported first in `story.ts`) that is a Ki -> Sho -> Final arc. A `twist` rewrites
the final step once every earlier step is done, keeping the step type (a DELIVER
twist keeps its item) and staying inside the giver's domain. The twist `line` is
the in-world reason, spoken by the Sho TALK_TO target: on greet the harness
speaks it over the cached greeting, and on a chat turn `buildContext` adds
`Twist just happened: <line>. React in character.`

The client announces a twist through `shared/state/twists.ts`: it watches `game`
quests and, when a quest gains `twist.replaced`, shows `m.twist_toast` and plays
the pickup sound once per quest id (reset by `resetTwists()` in `restart()` and
test setup). The journal strikes through the replaced step and shows the new
step with a twist mark and line; the objective shows a "Plot twist" eyebrow for
six seconds. Deterministic seed rotation (`domain/quests/auto.ts` and the client
`offline()`) offers the first valid seed whose title, in either locale, is not
among the giver's last three completed quests.

## Verification

- Required gates: `bun run check` → `bun run check:types` → `bun run build` → `bun run test`.
- UI proof: headless Playwright driving actual controls at 1440×900 and 390×844, with deterministic and live model runs.
- Evidence: `docs/final-evidence.md`; ignored captures/reports in `artifacts/` and live usage JSON under `/tmp/saigon-quest-evidence/`.
- Server Vitest uses two workers; this avoids reproduced PGlite initialization timeouts under concurrent browser load without increasing timeouts.

## Open checks

- Physical Quest 3 hardware, production Facebook OAuth, zone-specific audio mixing, and the deployed workers.dev client under Playwright are unverified.
- Dense mobile views exceed the initial 300k triangle target.
- QA scripts out of date: `qa-avatar` (looks for the old “Young woman” title button), `qa-ride` (Vietnamese option label under an en-US context), `qa-journal` (waits on an un-offered quest), and `qa-audio` (imports the old `apps/client/src/audio/index.ts` path).
- Open tasks in `docs/tasks.md`: demo seed, desktop perf pass, VR perf pass, voice, AI-generated art, open-weight path, demo video, and submission.

## Phase 3 — Clues, spends, and rides

Every step has an automatic core clue. People steps (`TALK_TO`/`DELIVER`/`BRING`)
append `· now at {place}` through `stepCopy` when a neighbor's live placement in
the `city` store differs from home. A BUY step the player cannot afford is
fronted on credit: `buyMarketItem` and the market panel use `creditEligible`
(shared engine) so an unaffordable active-quest BUY sends `{ purchase, credit }`
and shows `m.market_on_credit`; the engine grants the item without charging.
The server's `incomplete` fallback names the next step and its place through the
shared `stepText(step, locale)` (`packages/shared/src/quest/step-text.ts`).

Six givers (`thao`, `alex`, `son`, `opera-visitor`, `square-tourist`,
`postcard-reader`) carry an additional riddle seed (`src/seeds/riddle.ts`) whose
step 0 is hidden. While `!isRevealed(quest, now)` the answer is hidden at the
source: `stepCopy`/`questHint`/`stepLine` return the riddle text for step 0,
`questTarget` and `hub` `objectiveLocation` and `map` `questPin` return null, and
the world-label marker (`npcMarker`) skips a hidden step 0. The objective and
journal show the riddle with a `?` and the options
`Ask a neighbor · Ride a cyclo · Clear in m:ss`. `shared/state/riddles.ts`
watches quests plus the shared UI clock (reference-counted with the waiting
notice), toasts `riddle_revealed_{talk,cyclo,time}` or `riddle_sharp_eye`, and is
reset in `restart()` and test setup. A greet that reveals the riddle replies with
the authored `That riddle? {stepText(answer)}` on the server and in `offline()`.
`turn.ts` adds `Riddle unrevealed: …. Hint, never answer.` for the giver while
hidden and `You just told the player the riddle answer: …` on the turn it
reveals.

Each ride mode states its trade-off in `mode_*_description`. `board()` sends
`{ spend, amount, mode }` and advances quests locally, so `spent` and a cyclo
riddle reveal show before the next NPC turn. `features/transport/gossip.ts`
chooses deterministic driver lines from `(mode, destination, city event, tracked
quest)`; the cyclo talks at progress 0.2/0.5/0.8 and its last line reveals a
hidden riddle. `widgets/hud/ride-line.tsx` renders the current line (XR toasts).
`features/transport/asides.ts` narrates arrivals at most once per 20 s.

Completion bonuses show on the reward card: `reward_thrifty` and `reward_sharp`
read `reward.bonus`. The hub `cheapestRide` suggests walking when the next leg is
under 70 units.

## Phase 4 — District milestone: the evening concert

Three parallel errands each earn one component; bringing all three to Vy at City
Hall starts a room-wide concert. The 0C contract (`packages/shared/src/milestones.ts`)
holds the host, locations, components, and bilingual event text; `COMPONENT_ITEM_IDS`
keeps components out of DELIVER/BUY, and BRING validates against `MILESTONES`.

Seeds live in `packages/npc-{mai,thao,ba,vy}/src/seeds/milestone.ts`, each carrying
`milestone: 'evening-concert'`. The base seeds (mai GO_TO alley → TALK_TO hoa,
thao riddle → GO_TO cathedral → TALK_TO son, ba GO_TO opera → TALK_TO alex) carry
`gift: <component>`; each component is appended to the giver's domain `gifts` at
the end so `gifts[0]` and LLM rewards are unchanged. Vy's apex BRINGs lanterns,
sheet music, and beans, each to Vy. `seedsFor` excludes milestone seeds;
`milestoneSeeds` returns them.

`apps/server/src/domain/quests/milestones.ts`: `offerMilestone` proposes the
giver's seed when the NPC gives a component the player lacks, no milestone quest
from that NPC is active, and the milestone is not completed; `offerApex` runs on
every host interaction once all three are held. `harness.ts` calls both, feeds
the LLM `You just offered <title>; set it up in your voice.`, and falls back to
the seed description. `QuestService.milestone?(playerId, milestoneId)` fires once
in `checkQuests` after a granted apex, outside the transaction.

`app/realtime.ts` wires the hook to `manager.room(playerId)?.city`: end the
soonest-ending event if two are active, `start-event` street-music at cityhall
for 180 s, `move-npc` Thảo to the cityhall `gathering` anchor, and `post-headline`
naming the player (safety-checked, neutral "A neighbor" fallback). At most one
milestone event per room every 10 minutes (`allowMilestoneEvent`); later
completers still get the reward and a personal toast, with no model call.

Client: `widgets/hub/milestone.tsx` + `milestoneBoard` in `view.ts` derive the
board from inventory + `completed[].milestone` (no DB column). The errands strip
shows "Ask about the concert" (`canAskMilestone`) which calls
`converse('', 'milestone')`; `converse` allows an empty message for this intent.
`offline()` mirrors the milestone intent and the apex auto-offer; the reward card
gets a `milestone_reward_banner`, and a `milestone_begins_toast` fires on
completion. `milestone_*` message keys added in EN + southern VI.

## On-demand greetings prepared by the Director

Greetings are prepared when the city changes, not assembled on every greet. When
a Director turn starts a new event (`CityDirector.turn` diffs the pre/post city
snapshot for new event ids), it calls `onEvents(snapshot, started)`; `realtime.ts`
wires that to `harness.prepareGreetings`. `relevantNpcsForEvent`
(`packages/shared/src/city/anchors.ts`) picks NPCs placed at the event location
(or whose home is there) plus any NPC the event hands a need. Each is passed to
`ShortLines.prepare`, which precomputes greetings across every affinity tier and
time bucket per locale into the existing `npc_greetings` cache, so a player's
greet hits a warm, state-aware line.

Affinity tiers live in `packages/shared/src/quest/friendship.ts`:
`AFFINITY_TIERS` (hostile/guarded/neutral/warm/close), `affinityTier(level)`, and
`TIER_LEVEL` (representative level per tier used when precomputing). The player's
live level maps to a tier whose cached greeting is served.

Player name: a persona opts in with `greetsByName: true` (npc-kit `NpcProfile`,
surfaced on `NPCS[*].greetsByName`); Hoa and Mai opt in. When live, `greetingPrompt`
tells the model to address the visitor as the literal `{name}` token
(`NAME_PLACEHOLDER`). The cached line keeps `{name}`; `fillGreetingName` fills it
on first interact from `InteractRequest.playerName` (client sends `guestName`),
and drops the token cleanly when no name is available.

Greetings no longer enter the conversation thread. The greet path stores the
shown opener in `NpcHarness.lastGreeting` (`npc:player`) instead of `recordTurn`.
A later chat turn injects it as context only when `refersToGreeting(message)`
matches (e.g. "what did you say", "the gathering", VI "sự kiện"); `buildContext`
takes `referredGreeting` and frames it as something the NPC already said.

## Errand offers describe the task; accept/finish celebrate

When a player asks how to help and no model is live, the deterministic offer no
longer answers with the generic "it is in the journal" line. `offeredErrandLine`
(`apps/server/src/features/npc/fallbacks.ts`) voices the errand: the authored
quest `description` plus the concrete first step (`stepText`), skipping a hidden
riddle's step until the city reveals it. `NpcHarness` prefers this line for a
just-offered quest; the journal entry is a side effect. A live model path is
unchanged and still speaks in the NPC's own voice.

Accepting or finishing an errand plays the celebratory jingle and shows a burst.
`converse.ts` fires `audio.play('accept')` (the longer `reward` sound) and
`celebrate('accepted')` on an offer, and `audio.play('reward')` plus
`celebrate('completed')` on completion. `celebrate(kind)` (game store) drives a
transient `<Celebration/>` overlay (`apps/client/src/widgets/hud/celebration.tsx`)
with a badge, ring, and label; it respects reduced motion.

The conversation header portrait is enlarged (88px desktop, 76px mobile; ~1.7x)
in `friendship.css`/`conversation.css`, with header text clearance widened to
match.

## Comic papercraft look (map Phase 0)

The world renders in a comic papercraft look by default. `shared/world/toon.ts`
converts lit materials to a shared 3-step `MeshToonMaterial` ramp (0.45/0.75/1.0,
`NearestFilter`), cached per source in a `WeakMap`; it passes through materials
already toon or marked `userData.unlit`. `primitives.tsx` `material()` returns a
toon material under `comic` and `MeshStandardMaterial` under `classic`, cached per
colour and look. `<Blocks unlit>`/`<Block unlit>` use a cached `MeshBasicMaterial`
with `toneMapped={false}` (marked unlit) for glow, neon, and window dots; the
evening glow strips use it. `assets.tsx` `prepareMeshMaterial` toons every mesh
under `comic`, and `prepareScene` is idempotent (`WeakSet`) so a remount of the
shared drei-cached scene no longer re-lerps `CITY_TINTS` and compounds the tint.
Characters toon after the remote-player colour tint and before `applyOutfitPalette`,
so outfits stay toon; the coin emblem opts out (`<Model classic>`) to keep its lit
gold look.

Colour tokens live in `shared/world/palette.ts`. Sky colour, fog, and the
hemisphere light moved out of `app/scene.tsx` into `features/city/atmosphere.tsx`
(`<Atmosphere rain evening />`); the fog colour tracks the current horizon colour.
`?look=classic` restores the original Standard-material render byte-for-byte for
A/B and rollback; the flag is frozen at boot in `shared/world/look-flag.ts`. A
read-only `camera()` test hook (fov, position, yaw) and `scripts/qa-map-perf.mjs`
record draw calls and triangles at fixed poses for per-phase perf gating.

## Landmarks and zones (map Phase 2)

District 1 carries the missing icons as scenery; no `LocationId`, `PLACES`,
`CITY_ANCHORS`, NPC, or coin changes. New world objects are procedural and
instanced, materials come from the palette, and glow (helipad mark, string
bulbs) uses `<Blocks unlit>`.

`shared/world/district.ts` exports `ICON_FOOTPRINTS` (Bitexco at (57,29), the
42 Nguyễn Huệ café-apartments at (57,−8)). Each icon replaces one
`buildingRows` slot in `layout.ts`, adds a rect solid in `solids.ts`, and the
minimap (`features/map/map.tsx`) draws the two rects in a landmark fill with
`map_bitexco` / `map_cafe_apartments` labels. `test/city-layout.spec.ts` lints
`ICON_FOOTPRINTS` alongside the other landmark footprints.

`shared/world/icons-nguyen-hue.tsx` builds Bitexco (tapered lotus-bud stack,
glass band, cantilever helipad with a generic comic "H" and one burst ring; the
upper section casts no shadow) and the café-apartments (9-storey block, instanced
balcony-frame grid coloured per panel). It exports `CAFE_NEON_STRIPS` for Phase 4.
`shared/world/icons-market.tsx` adds the exaggerated Bến Thành clock tower on the
market's south gate — procedural, because the `landmarks/cho-ben-thanh` GLB has
no grouped tower node; its clock parts are flat sibling meshes — plus the market
spill-over stalls. The clock hands tick and freeze under reduced motion.
`shared/world/icons-postoffice.tsx` floats instanced postcards on ink wires above
the post office entrance (gentle bob, canvas stamp texture, diegetic "SÀI GÒN"
postmark). `shared/world/icons-park.tsx` plants four oversized Tao Đàn-style trees
at the PARK edges, trunks carrying solids, canopy swaying as one group.
`shared/world/icons-bui-vien.tsx` dresses the Bùi Viện alley plaza with stools,
tables, string bulbs, shop signs, and empty neon frames exported as
`BUI_VIEN_NEON_FRAMES` for Phase 4. Local dressing is culled with
`shared/world/nearby.tsx`.

Cathedral wire clouds (item 5) wait on Phase 3's `PaperClouds`; there is a TODO
in `shared/world/city.tsx` and no cloud geometry yet.

## Diorama depth (map Phase 3)

The comic view reads as a shadowbox. `features/city/atmosphere.tsx` adds a
gradient paper `SkyDome`: a radius-200 `BackSide` sphere recentred on the camera
each frame, a shader that blends the palette top/horizon tokens on direction.y,
`fog:false`/`depthWrite:false`, rendered first. Classic keeps the flat
background. `shared/world/paper-clouds.tsx` instances 3-lobe cream clouds with an
ink shadow card on a ring outside the walls (10 desktop, 6 mobile), drifting and
Y-axis billboarded, static under reduced motion; the same component hangs 3
clouds behind the cathedral spires (Phase 2's deferred item). `shared/world/
skyline-cards.tsx` adds vertex-coloured `ExtrudeGeometry` rooftop strips outside
the north/west walls (desktop only) with unlit window dots for Phase 4, keeping
the Thủ Thiêm Kenney towers in front. A `paperEdge` base skirt under the ground
rects completes the diorama. The title screen frames the district through a long
lens (fov 22) and play restores fov 49 (`features/player/camera.tsx`).

## Light and weather (map Phase 4)

Evening lights heritage windows (one unlit `window3000k` InstancedMesh from
`shared/world/windows.ts` for the cathedral, post office, opera, and City Hall —
windows only, lanterns stay with the milestone), switches the Phase-2 neon on
(emissive cyan/magenta/yellow tubes, one café strip flickers ≤3 Hz, static under
reduced motion), merges the 16 `STREET_LIGHT_PLACEMENTS` heads with the existing
glow boxes into one lamp-glow mesh, and warms the Phase-3 skyline window dots to
`window3000k`. The alley point light is retinted toward magenta; the total stays
two point lights. Rain (`features/city/rain.tsx`) runs ~600 camera-following
streaks animated entirely in a vertex shader (300 mobile, half in XR, sparse
under reduced motion); `features/city/puddles.tsx` tints roads toward `wetRoad`
and scatters low-opacity puddle ellipses that glint under the evening lights.
`features/npcs/umbrellas.tsx` opens paper umbrellas on the nearest ≤16 NPCs
within 40 units (plus the on-foot player) with a spring pop/fold, picked by the
pure `umbrella-picker.ts`. Routes never close; rain is visual only.

## Street comedy (map Phase 5)

The street level reads like a comic strip. Comic speech bubbles are CSS only
(`shared/ui/people.css`, `shared/ui/world.css`): `.presence-bubble` and the
`NpcLabel` `.name-tag` get a white fill, a 2px `ink` border, an offset shadow,
a pointed tail with a thin wire, and a pop-in. All of it gates behind a single
`data-look` attribute set once on the document root from `LOOK`, so
`?look=classic` keeps today's pill unchanged, and `prefers-reduced-motion`
drops the pop. Vendor cries (`features/city/cries.tsx`, scheduled by the pure
`cry-scheduler.ts`) shout from authored anchors at the market stalls, the Bùi
Viện alley, the Nguyễn Huệ kiosks and the river vendors: within 18 units an
anchor shows one `Html` bubble every 6–10 s for 3.5 s, at most two at once, and
it backs off while an NPC bubble sits within 5 units. The Vietnamese cry shows
in both locales; English adds a gloss line (`cry_*` / `cry_*_gloss`). A scooter
swarm (`features/city/traffic.tsx`) loops 22 instanced scooters (10 below
700 px) on Lê Lợi, Lê Thánh Tôn and Đồng Khởi, two opposite lanes per road
split around the ±6-unit bus-stop gaps (pure `traffic-lanes.ts`); matrices
update only within 60 units and freeze otherwise, and reduced motion parks them.
Each scooter carries one of four caricature cargo shapes and an oversized
headlight that glows warm in the evening through the unlit path. The honk gag
(pure `traffic-brake.ts`) brakes, wobbles and pops a "Bíp bíp!" bubble when the
player — or the ride vehicle — enters a scooter's 3.5-unit forward cone, with an
8 s per-scooter cooldown; it never adds a collider or displaces the player, so
Rapier is untouched and the swarm never blocks a ride. Parked motorbikes and
low corner planters at the Lê Lợi junction (`shared/world/street-life.tsx`)
frame the fragile-parcel wobble corner; the planters sit below knee height with
no collider, off the auto-piloted ride path. Bubbles are hidden in XR.

## Minimap labels + tracked-quest pulse (2026-11-02)

Place labels on the neighborhood map lost their translucent pill. `MapLabel`
now draws transparent text with a matching `#fff6d6` stroke under the fill
(`paint-order: stroke`) so names stay legible over roads and blocks without an
opaque background, and every label is centered on its place marker (x/y 0,
`dominant-baseline: middle`) instead of the old per-place offsets. The tracked
quest pin (`state.trackedQuestId`) now animates: the diamond `.quest-pin-mark`
scale-pulses and an expanding `.quest-pin-ring` radiates from it
(`shared/ui/hud.css`). Reduced motion (state flag and `prefers-reduced-motion`)
drops the ring and freezes the mark.

## Hub, coin sound, wardrobe, quick-ride (2026-11-03)

Hub grid: `milestone-card` and the City Pulse card (`pulse-card`) had no
`grid-column` span and collapsed to a single 1/12 column. Every hub card now
carries an explicit span: story 7 / milestone 5, neighbor 5 / ride 4, places 7 /
sound 4, pulse 4 (`shared/ui/cards.css`, `hub-city.css`). Breakpoints collapse
to two-up then one-up (`hub-responsive.css`). Measured card widths at 1440 /
1000 / 390 px show no squished cards.

Coin pickup sound: the `pickup` event no longer reuses the flat `confirm.mp3`.
`GameAudio.playCoin` synthesizes a bright two-note chime (B5 → F#6) with a quiet
octave sparkle through the sfx group, tracked as one effect for the 8-voice cap
and cleanup (`shared/audio/index.ts`). Verified the context runs, the chime
fires with no errors, and the 0.12 s debounce still throttles repeats.

Wardrobe: gender/body selection removed from the panel (body stays chosen on the
title screen); locked items are hidden instead of shown as lock cards; a slot
with nothing owned shows `wardrobe_slot_empty`. Removed the dead `LockedCard`,
`wardrobe_body`, and `wardrobe_locked_hint`. Verified: locked cards 0, body
toggle 0, item thumbnails render at 149×110 across all five tabs.

Quick-ride: `B` (and a HUD pill `.ride-toggle`, touch-friendly) mounts or
dismounts the earned personal ride without opening the wardrobe, via
`toggleVehicle`/`ownedVehicle` (`shared/api/wardrobe.ts`). The pill only renders
once a vehicle is owned. Mounting applies `UNLOCKS[vehicle].speed` in the Player
loop. Verified the key/button fire the equip with the right slot/id.

## Wardrobe render + reward popup fixes (2026-11-03)

Wardrobe 3D was blank (empty stage, blank item thumbnails) because the shared
`<Canvas>` + drei `<View>` pattern painted nothing. Replaced it with a
self-contained `<Canvas>` per preview box in `ViewSlot` (the reliable approach
the coin emblem already uses), each with an explicit camera. Element-screenshot
pixel spread confirms the avatar stage and the accessory thumbnails now render.
The dialog also overflowed horizontally at narrow/zoomed widths: the wardrobe
dialog is now `min(620px, 100vw-32px)`, the body layout is single-column by
default (two-column only ≥760px), and the slot tabs wrap instead of scrolling
off the edge. Verified no horizontal overflow at 1440 / 970 / 390 px.

Reward popup: the coin emblem was `size={88}` and overlapped the "+N coins"
amount; it is now `size={44}` with the row keeping the emblem's symmetric bleed
(measured: no overlap). "Wear now" used `close()`, which opened the first-reward
hub; it now equips and drops straight back into the city
(`screen: 'playing'`).

## NPC empty-message turn fix (2026-11-03)

`npc_turn_failed … Google proxy requires at least one non-system message`
(status 400) happened on `milestone`/`greet` turns: the schema lets `message`
be empty for those intents, and `agent.generate(request.message, …)` then sent
only the system context. `turnMessage(request)` now returns a short,
intent-appropriate, localized player line when no text was typed, so every model
call carries a non-system message (`features/npc/turn.ts`,
`test/turn-message.spec.ts`). The separate `MastraTimeoutError … 15000ms` is
provider latency, not a bug: the turn is caught, logged, and the authored
fallback line is served; the timeout budget is intentionally left unchanged.
