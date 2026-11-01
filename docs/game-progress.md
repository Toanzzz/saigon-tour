# Game progress

## Current scope

Stylized District 1 exploration with NPC-authored errands, a shared-room City Director, persistent player progress, and anonymous-first co-op presence.

- Player promise: meet neighbors, help with small errands, and discover a compact Sài Gòn neighborhood.
- Core loop: talk → ask for an errand → follow 1–3 validated steps → return to the giver → receive a persistent reward. Walking is free; transport and market purchases spend coins.
- Spatial plan: Bến Thành anchors Lê Lợi; Nguyễn Huệ links City Hall and the river; Đồng Khởi links the Opera House and cathedral/Post Office square. The food alley and park provide quieter destinations.
- World: licensed character/prop assets, authored streets and landmark façades, supplied landmark statues, Draco-compressed models, day/evening lighting, ambient crowds, transport, market, and river viewpoint. A coin collectible model (`models/collectibles/coin.glb`, built by `scripts/blender/build-collectibles.py`) spins beside the earned amount in the reward popup and as ambient world pickups along the District 1 walkways; the flat 2D glyph remains the SSR/test fallback.

## Systems

- **Quests:** NPCs author errands of one to three `GO_TO`, `TALK_TO`, `DELIVER`, or `BUY` steps, validated against shared persona domains. Players hold at most three. The server owns ids, rewards, progress, and once-only completion through `quest_completions`. Any interaction with the giver completes ready quests. Active errands expire after twenty minutes; abandonment, expiry, and declining reclaim supplied items. The journal tracks and abandons errands; minimap pins follow live NPC targets. The offline mirror uses the same shared engine.
- **Party errands:** a shared quest id and original recipient list, independent progress, atomic group assignment, and once-only rewards pushed to every member. Leave/disconnect keeps participation; abandon/reset removes the player’s copy.
- **Collectible coins:** ambient `collectibles/coin` pickups spin along the Lê Lợi / Nguyễn Huệ / park / river walkways (authored in `packages/shared/src/collectibles.ts`). Walking into one grants coins once per player through `POST /me/pickups/:coinId` and the `coin_pickups` ledger; the client never mutates currency directly, offline guests still see the coin vanish with a pickup ping, and reset clears the ledger. Decorative-plus-grant only — amounts, fares, and the HUD glyph are unchanged.
- **NPCs, friendship, memory:** 29 agents, nine neighbors and twenty residents. Friendship (−5 to +5) lives on the player row with normal locks, revisions, socket saves, and reset. Rules and memory: `docs/agent-harness.md`. Opening a conversation shows a cached greeting stored in the NPC/player thread; reopening shows earlier messages. Resident walkers pause near the player.
- **Conversation UI:** an errands strip (ready, needs you, in progress, available) from the shared `dialogueQuests`; NPC speech bubbles; a `role · location` eyebrow; a portrait rendered from the character model with a five-tier affinity crest and `affinity-info` popover; mini-avatars per NPC message. World quest diamonds render only with a `!`/`?` glyph; Pause has a symbols guide.
- **City Director:** the world room’s events, weather, NPC placements and needs, and headlines, with deterministic validation, authored anchors, a two-event cap, at most one turn per ninety seconds, and daily count/spend guards. `DIRECTOR_MODE` is `live`, `scripted`, or `off`. Colyseus patches synchronize state; headlines produce toasts; rain uses tint/fog; event markers and the hub City pulse reflect room state.
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
