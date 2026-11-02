# Final evidence

QA captures referenced below live in `artifacts/`, which is local-only and gitignored. Live model usage JSON lives under `/tmp/saigon-quest-evidence/`. All observations are from November 1, 2026.

## Current gates

- At `ee46866`: `bun run check:types` → `bun run build` → `bun run test` pass. Server 186 passed / 2 skipped; client 135 passed.
- On this docs tree: `bun run check` passes with one existing `cards.css` `!important` warning.

## City solids registry

- Gates on this tree: `bun run check` passes (one existing `cards.css` `!important` warning); `bun run check:types` → `bun run build` → `bun run test` pass. Server 186 passed / 2 skipped; client 140 passed, including `test/city-layout.spec.ts` (5).
- The layout lint was red first on the pre-fix layout, listing the plan's overlaps (the whole z=24 row inside the HẺM plaza, j↔e, f@42,-19 ↔ Lê Thánh Tôn, j@42,3 ↔ Lê Lợi and the park, c@97,-26 ↔ opera), then green after re-spacing `layout.ts` and moving the `market-family`, `coffee-friend`, `coffee-reader`, and `mai` anchors clear of the true footprints.
- Measured `fromModel` footprints match the plan's bounds: building-e@(-22,-34) hx 5.25 (old collider 2.8); wide building-j rotated −π/2 is hx 4.36 / hz 6.77 (old 2.8 / 2.7); the market centre shifts z −12 → −12.67 for the asymmetric bbox.
- Headless Playwright with `?debug` on desktop (1440×900) and mobile (390×844), 108 colliders present: driving into building-e@(-22,-34) from z −26 stops the player at z −30.43 (the visual façade); driving into the wide building-j@(44,24) from x 36 stops at x 39.30. Both confirm the walk-through is fixed in-game. Local evidence: `artifacts/city-solids/city-solids.json`, `debug-1440.png`, `debug-390.png`.
- `scripts/qa-city-complete.mjs` passes on desktop and mobile with the new colliders: evening toggle, coffee purchase, metro ride, and river postcard all complete (192 calls / 346,487 triangles desktop; 139 calls / 339,292 triangles mobile). The script had filtered for the Vietnamese "Cà phê sữa" under an en-US context; it now matches the English "iced milk coffee" label the app renders.

## Quests and party errands

- Live Muse Spark tool spike with the shared discriminated-union schema and validator: a self-delivery proposal returned `self_delivery`; Muse corrected the recipient within three steps. Model `muse-spark-1.3-contributor`; three metered requests, 4,078 input / 372 output tokens, estimated $0.002783. Local evidence: `/tmp/saigon-quest-evidence/model-spike.json`.
- Real Postgres group control: twelve concurrent completion checks through two independent `GameDb` / `QuestService` instances produce one reward per participant and exactly two ledger rows for the shared quest.
- Actual Muse party harness: authored “Morning coffee for Linh’s lunch”, a three-step `BUY coffee` / `GO_TO park` / `TALK_TO linh` quest shared by two members. Each bought coffee and completed independent steps. Both received fifty coins, a postcard, and two reputation; wallets 30 − 3 + 50 = 77. Both received `quest-completed`; repeated checks changed nothing. Four requests, 11,351 input / 903 output tokens, estimated $0.0074815. Local evidence: `/tmp/saigon-quest-evidence/party-live.json`.
- Live party browser Playwright with desktop/mobile contexts: real Invite/Accept and emote, a live three-step party errand “Path for evening gathering” (`GO_TO alley`, `GO_TO cityhall`, `TALK_TO vy`), independent progress, and a giver check pushing 61 coins/postcard/2 reputation to both clients (wallet 91, completed 1). No page errors. Local evidence: `artifacts/quest-multiplayer/flow.json`, `desktop.png`, `mobile.png`.
- Persistence Playwright at 1440×900 and 390×844: live completion wallets 79 / 70 with one completion; reload preserves wallet/completion/name; reset returns each to 30 coins, zero active/completed quests, and the same identity/name. Local evidence: `artifacts/quest-persistence/final/flow.json`. The script waits for delivery HTTP/thinking completion before moving to the next NPC.
- Journal Playwright at 1440×900 and 390×844 in live and offline flows: offer, visible minimap target, Track errand, Abandon errand, quest/pin removal, no completion granted, no page errors or horizontal overflow. Local evidence: `artifacts/quest-journal/live/flow.json`, `artifacts/quest-journal/offline/flow.json`, and captures.
- Regression coverage: migration of existing active/completed saves; concurrent offer cap and completion checks; repeated deliveries; full-inventory purchase rejection; pending-event progression through all four revision-fenced client apply paths; atomic party cap/inventory rejection; concurrent rewards; original ownership through leave/reconnect; service reconstruction; abandon/reset; authenticated abandonment; a captured-lock-set race with a new party offer; client abandonment failures and session/revision fences; offline shared-reward refusal; live map targets; summed multi-quest reward pushes.
- Presence ordering: a state snapshot arriving before welcome can temporarily include self in remote samples. A focused failing control proved the stale self entry; roster recording removes self when identity is known.
- PGlite fixture initialization timed out under unrestricted test workers during concurrent browser work. A one-variable run with two workers passed unchanged assertions and timeouts; server Vitest uses two workers.

## NPC friendship, memory, and greetings

- Migration `0005_npc_friendship.sql` adds player-row friendship. `bun run test:integration` passes both real Postgres cases; completion friendship persists at +2 and the completion ledger grants once under concurrency.
- Unit coverage: all 29 NPC seed loops, friendship clamps/presets/cooldown/chat cap/offer gate, once-per-turn adjustment, decline ownership/progress, expiry/reclamation, reset, history identity isolation, and explicit-model observational memory.
- `node scripts/qa-friendship.mjs`, unsandboxed headless Chromium at 1440×900 and 390×900: walker stops nearby; real conversation input requests an errand; talking to Linh advances it; the return greeting opens the reward and adds +1; reopening shows +1 and prior chat; abandonment subtracts one; history survives reload; authenticated journey reset clears history; reduced-motion feedback uses `friendship-fade`. No page exceptions or horizontal overflow. Local evidence: `artifacts/npc-friendship/results.json` and resident captures.
- Live quest script with `google/gemini-3.8-flash`: the model calls `propose-quest`, delivery advances, the giver greeting completes, the wallet reaches 55, and a repeated completion grants nothing. 4,284 input / 128 output tokens, estimated $0.002398.
- Live memory script: 25 turns with Postgres storage, an explicit metered compatible model, minimal reasoning, and asynchronous observation. Observations exist; prompt input falls from 4,181 at turn 19 to 2,871 at turn 20; the turn-two lotus tea preference is recalled on turn 26. Raw context is bounded to forty messages through `getContext`, since Mastra OM ignores `lastMessages`. Reset explicitly clears the OM record because the installed Postgres adapter's `deleteThread` removes only messages, vectors, and thread metadata.
- Verification commands using `.env` unset inherited `META_MUSE_API_KEY`: the inherited old key returned provider HTTP 401 while the file credential succeeded. No secret values are recorded.
- Opening a conversation sends `intent: greet` with an empty message. Headless Playwright at 1440×900 and 390×900 showed one NPC line, no player line, and no `What is happening in the neighborhood?` text. The next typed message included the greeting in the model context; asked what it had just said, the NPC repeated its greeting.
- That run exposed a provider greeting stopped by the output limit (`finish_reason: length`). Greeting generation allows 300 output tokens, skips caching truncated replies, and versions the cache key.

## Coin emblem everywhere the currency shows

- `shared/ui/coin-emblem.tsx` renders a reusable spinning 3D `collectibles/coin` in a small transparent, self-contained `<Canvas>` sized like an inline glyph, with the flat 2D `coin` `Icon` as the `typeof window === 'undefined'` SSR/test fallback and the error-boundary fallback. It replaces the flat glyph in the HUD header wallet, the journal bag, the hub wallet and story card, and the reward popup.
- `party.spec.tsx` (`renderToStaticMarkup(<RewardPanel/>)`) still passes: SSR renders the flat glyph, so no WebGL is needed in jsdom.
- `node scripts/qa-coin-emblem.mjs`, unsandboxed headless Chromium at 1280×800 and 390×844: a live 3D coin canvas is attached in `.game-header .wallet`, the journal bag, the hub topbar/story card, and the reward row across both viewports. Measured frame health with the always-on header emblem: desktop ~55 fps / 256 draw calls, mobile ~54 fps / 228 draw calls. Local evidence: `/private/tmp/saigon-tour-qa/coin-emblem-{desktop,mobile}-{header,journal,hub,reward}.png`.
- Pure presentation: amounts, fares, rewards, and persistence are unchanged.

## Coin collect effect

- `features/collectibles/coins.tsx` adds a `CollectingCoin`: on pickup the coin pops (scale 1 -> ~1.6 -> 0), lifts ~0.6 units, spins faster, and emits a one-shot gold drei `Sparkles` burst for ~0.5 s before unmounting. It is transform-only, so the shared cached `collectibles/coin` material (also used by the HUD `CoinEmblem`) is never mutated.
- `pickup.ts` keeps `collectedCoins` as the permanent source of truth and adds a short-lived `collectingCoins` map (frame-clock start time). The renderer clears an entry when its animation finishes; a `setTimeout(COLLECT_EFFECT_SECONDS + 0.25 s)` guarantees cleanup even if the frame loop is throttled (hidden tab). `resetCollectedCoins()` clears both sets. Reduced motion skips the effect entirely (instant vanish, ping retained).
- The grant path is unchanged: `collectCoin` still calls `POST /me/pickups/:coinId` once; the effect is purely cosmetic and runs for online and offline guests.
- The HUD header wallet reacts to any balance gain (pickups, quest rewards): `widgets/hud/header.tsx` tracks the currency delta in a ref/effect and, on an increase, pulses the `.wallet` pill and floats a `.wallet-gain` "+N" (hud.css, keyed by a bump counter so repeats restart). It is HUD-local off the store delta, with no world-to-screen projection; `reducedMotion` fades without the bounce, mirroring the friendship-pulse convention.
- `node scripts/qa-coin-collect.mjs`, unsandboxed headless Chromium at 1280x800 and 390x844: teleporting onto `coin_leloi_1` raised the wallet 30 -> 35 once, the `collectingCoins` effect set populated then cleared to 0 within the window, the `.wallet-gain` "+N" appeared, and re-entering the spot granted nothing. A reduced-motion run collected with the effect set never populated. Local evidence: `/private/tmp/saigon-tour-qa/coin-collect-{desktop,mobile}.png`.

## World coin pickups

- New `features/collectibles/` client slice renders ambient spinning `collectibles/coin` pickups at authored District 1 positions (`packages/shared/src/collectibles.ts`); walking within 1.4 units collects one. The client never mutates currency — it calls `POST /me/pickups/:coinId`, which grants `COIN_PICKUP_AMOUNT` (5) exactly once per player through a new `coin_pickups` ledger (migration `0009`), clamped to the wallet max, and cleared on reset.
- Server Vitest `coin-pickups.spec.ts` (4 cases): first pickup grants +5 and bumps the revision; a repeat is a no-op (`granted:false`, one ledger row); invalid id → 400, unknown id → 404, unauthenticated → 401; reset clears the ledger so the coin grants again.
- Client Vitest `collectibles.spec.ts` (3 cases): every authored coin sits clear of all non-wall solids (player capsule + clearance) and inside the walkable bounds, with unique ids and a positive amount.
- `node scripts/qa-coin-pickup.mjs`, unsandboxed headless Chromium at 1280×800 and 390×844 against the online guest: teleporting onto `coin_leloi_1` raised the wallet 30 → 35 once, marked the coin collected in `collectedCoins`, and a second teleport onto the same spot granted nothing (ledger once-only, end-to-end through the live server). Audio stays `locked` in headless, so the `pickup` cue assertion is skipped there. Local evidence: `/private/tmp/saigon-tour-qa/coin-pickup-desktop.png`, `coin-pickup-mobile.png`.
- Decorative-plus-grant only: fares, quest rewards, the market, and the flat HUD glyph are unchanged; no `applyPlayerEvents`/quest path was touched.

## Conversation UI

- The errands strip sits between the header and history; `dialogueQuests` returns `fromNpc`/`forNpc`/`ready`/`delivery`/`canHelp`/`full`, and the journal and dialog share it. Six unit cases cover none/from/for/ready/delivery/full.
- Headless Playwright at 1440×900 and 390×844 asserted an active quest shows “In progress” + “Track” and a full journal shows “Journal full (3/3)”. Evidence: `artifacts/npc-dialog-clarity/{active,full}-{1440,390}.png`.

## Shared city Director

- Live headless Playwright, desktop 1440×900 and mobile 390×844 in two contexts: same room, revision 4, matching market event, Linh moved to market/gathering `[-17,0,8]`, Hoa’s need, weather, and headline visible in each City pulse feed. No page errors or overflow. Local evidence: `artifacts/city-director/shared-city.json` and captures.
- Scripted headless Playwright in two desktop/mobile contexts: first City Hall festival, Vy at `cityhall/gathering [66,0,-12]`, shared food-alley need and headline rendered in both City pulse feeds. No page errors or overflow. Local evidence: `artifacts/city-director/scripted/shared-city.json` and captures.
- Actual Muse Director: `start-event`, `move-npc`, `set-npc-need`, `post-headline` accepted. Two metered calls; 5,602 input / 728 output tokens, estimated $0.004257. Empty-room and cooldown ticks made no extra requests.
- Actual NPC with that snapshot authored “Morning Rush Herbs for Linh” using `propose-quest`; its description names the event and Linh’s moved placement. `source: live` asserted. Two metered requests, 5,125 input / 364 output tokens, estimated $0.0032905. Local evidence: `/tmp/saigon-quest-evidence/director-live.json`.
- Shared schema tests verify full and incremental Colyseus encoding, event/need/headline deletion, and millisecond timestamps. Server tests cover event cap/expiry, authored anchors including prototype-name rejection, safe headlines/needs, isolated room worlds, occupied-room cooldown, atomic UTC daily counts, and a live turn losing occupancy.
- Client regressions reproduce and prevent incomplete/malformed snapshot crashes and old-room callbacks clearing or overwriting a replacement room.

## Single world room and waiting notice

- Server tests cover one-room capacity, `room_full` surfacing in Colyseus 0.18, same-player replacement at 20/20, retained-slot rejoin plus a waiting guest admitted when one leaves, two concurrent first joins in one room, and `joinedAt` preserved across replacement.
- `node scripts/qa-waiting.mjs`, unsandboxed headless Chromium at 1440×900 and 390×844: 20 SDK peers fill the room; `GET /realtime/status` reports `full: true` with a longest name. A fresh browser is refused with `room_full`, shows the waiting notice on the title screen and in the HUD (longest stroller name and duration), and auto-joins within the 10 s retry once a peer leaves. No page errors. Evidence: `artifacts/waiting/waiting-{title,hud}-{1440,390}.png`.

## Unlocks, bodies, and wardrobe

- Server tests prove the giver's tier-gated unlock selection, idempotent grant under 12 concurrent completions, equip ownership/slot validation, reset clearing, legacy rewards without `unlockId` still parsing, the `me-profile` body round-trip with reset persistence and invalid-body 400, the `presence-body` schema round-trip with `man` fallback, and avatar/outfit palettes.
- Blender: `scripts/blender/build-player-bases.py` builds `player-man`/`player-woman`. Re-importing each GLB confirmed three materials (`colormap`, `outfit-top`, `outfit-bottom`), shirt faces on `outfit-top`, trousers on `outfit-bottom`, skin/hair/shoes on `colormap`, and preserved `idle/walk/sprint/sit` animations. A high-contrast recolour render (top magenta, bottom green) measured 2,614 top and 4,474 bottom pixels.
- `node scripts/qa-unlocks.mjs`, unsandboxed headless Chromium at 1440×900 and 390px mobile: completing Hoa's errand grants `non-la`, the reward popup shows “unlocked”, and “Wear now” equips it; the wardrobe opens with a `<canvas>` inside the dialog; Unequip clears the slot and Equip re-applies it; switching the body to woman updates `state.body`. No page errors. Evidence: `artifacts/unlocks/results.json` and captures.
- `node scripts/qa-avatar.mjs` at 1440×900 and 390×844, before the gender toggle replaced the title body buttons: a new journey as a woman starts with `state.body === 'woman'`, the body persists across reload, and a second context receives `woman` through presence. Evidence: `artifacts/avatar/results.json`.

## Title screen, identity, and journey

- Headless Playwright at 1440×900, 1280×720, 390×844, and 844×390: form order is name → Start → account; the name row and Start share a width; legal links never overlap the content; no horizontal overflow or page errors. Event name tags render at z-index 3–4, below `.game-ui` (10). Local captures: `artifacts/title-layout/`.
- Headless Playwright at 1440×900 and 390×844 (touch), 3 passing two-viewport runs: a fresh context shows `Start exploring` with an editable name; after accepting Hoa's errand and reloading, the title shows `Welcome back, {name}`, a summary chip, and `Continue journey as {name}` with no name input; Continue keeps the quest. Pause → edit name → `Save name` updates the server name, which survives reload. `Start a new journey` on the title and in Pause arms `Tap again to erase progress`, reverts after 4 s, and the second tap returns to the fresh title with empty quests and the current name prefilled. No page errors.
- Reset keeps account and Meta availability: `Continue with Meta` shows after Pause → two-tap reset at 1440 and 390; the same script fails on code that rebuilt state from `initialState()`.
- Gender toggle, unsandboxed headless Chromium at 1440×900 and 390×844: `.title-gender` sits in `.title-name-row` between the name input and `.title-dice`, with `aria-label` “Switch character look”; it renders one SVG with viewBox `0 0 80 80` and the exact `@iconify-json/glyphs` `male`/`female` path data, swapping on click. Across 40 dice rolls both genders appeared and names varied.
- `scripts/qa-persistence.mjs` passes at both widths with the two-tap reset and fresh-title assertion.
- Intermittent: in a few runs, clicking Continue right after a reload left the screen on `title` before diagnostics were installed; the QA waits for diagnostics before clicking. Cause unproven.

## Escape and pause

- Bug: Escape during play briefly suspended the music and never showed the pause menu. Instrumented headless Chromium proved the global keydown handler opened the native modal `<dialog>`, then the same press fired the dialog's `cancel`, whose handler toggled back to `playing`.
- The game store (`screen`/`panel`) owns modal state; `Dialog` and `HubScreen` `onCancel` only `preventDefault()`. Unsandboxed headless Chromium at 1280×800 and 390×844: six consecutive Escape presses strictly alternate the pause menu open/closed (DOM `.pause-dialog[open]`), and Resume closes it. No page errors.
- The `__THREE_GAME_DIAGNOSTICS__` snapshot updates via R3F `useFrame`, which freezes while physics is paused, so `state.screen` from that global reads stale when paused; the DOM confirms the store.

## English + Vietnamese

- Unit coverage: tests pinned to `en`; `vi-VN` browser → `vi`; `LocaleSchema` equals Paraglide locales; catalogs share keys; `['session']`/`['settings']` gcTime is Infinity; the saved choice survives 10 fake minutes; `InteractRequestSchema` defaults `locale` to `en` and rejects others; greetings cache per locale with the Vietnamese rule in the prompt; live chat turns carry the rule; Vietnamese offline fallback and seed quest (`Rau thơm cho hàng xóm`) on server and client.
- `scripts/qa-i18n.mjs`, headless Playwright at 1440×900 and 390×844 (touch), browser `vi-VN`: title `Một chuyến đi nhỏ`, `html[lang=vi]`; `EN` toggle → `A little journey`, persisted across reload; Pause → `Tiếng Việt` → `Cứ thong thả.` with the pause menu still open; HUD `Chợ Bến Thành · Xu`; journal `Hành trình nhỏ của bạn … 30 xu`; NPC chat sends `locale: "vi"` and shows Vietnamese replies; `Clear saved data` → back to `vi`. No page errors or overflow.
- Live provider `google/gemini-3.8-flash` via the OpenAI-compatible endpoint in `apps/server/.env`: tool-enabled NPC turns exceeded an 8 s per-call limit (`MastraTimeoutError … stepMs`, proven with a real `NpcHarness` turn), and the same request with no limit returned a Vietnamese reply in 8.6 s. With the 15 s limit and 40 s client wait, direct `/npc/hoa/interact` returned `vi` → `source: live` in 11 s and `en` → live English in 7 s.
- Live headless Playwright at both widths: `qa-i18n` passed with a `replySource: live` Vietnamese chat; `qa-npc-dialog` passed using the app's own `game.ts?t=…` store instance; `qa-persistence` passed live quest completion to 55 coins, reload, and reset.

## Client state and render cost

- `scripts/qa-store-perf.mjs`, unsandboxed headless Chromium at 1440 and 390: a 2 s walk re-renders `GameUI` once while the minimap “you” marker `cy` moves (125.5 → 118.4). A whole-store selector would re-render about 20 times at the 10 Hz position rate (computed, not measured). No page errors.
- Flow QA, unsandboxed headless Chromium at 1440 and 390: `qa-npc-dialog` (chat draft), `qa-unlocks` (wardrobe tab store), `qa-waiting` (shared clock ticker), `qa-i18n` (locale remount keeps drafts and name), and `qa-game` (mobile touch stick → `touchView`) pass.
- Live probes on the running game: the title name draft seeds from `guestName`, the transport form seeds `destination: "park"` with a populated English `<select>`, and the header mute toggle flips `game.muted` and the audio engine `muted` together through `installAudioSync`.
- `test/ui-stores.spec.ts` covers store resets, `installUiResets` transitions, the `journeyConfirm` fake-timer auto-disarm, and `samplePresenceView` write-on-change.

## Dev server shutdown

- `onStop` releases once, exits on the first SIGINT/SIGTERM, and still exits when release stays pending. `closeHttpServer` finishes while a client holds the socket.
- `bun --watch` using that helper stayed up across a file reload, then exited on an external SIGTERM while a socket was connected. Port 58994 was free afterward.

## CI deploy

- From a clean export of `a5fd7b7` plus the deploy files: the four root gates passed; `actionlint .github/workflows/deploy.yml`, `shellcheck scripts/deploy-remote.sh`, and `POSTGRES_PASSWORD=x docker compose -f compose.prod.yml config -q` passed; `docker buildx build --platform linux/arm64 -f apps/server/Dockerfile .` passed.
- Host t-oracle (`oracle.toan.io`, aarch64): user `toan` is in `docker`, and the `edge` network exists.
- `gh run list`: Deploy runs 41286383894 (`679d8c7`) and 41295129706 (`d9a2bc1`) completed successfully on push to `main`.
- `GET https://saigon-tour-api.toan.io/health` returned `{"ok":true,"db":"up","mode":"live","model":"muse-spark-1.3-contributor"}`.
- Not observed: the deployed workers.dev client in a browser.

## Verification limits

- Incremental-state investigation: backend PID 26453 sent initial room snapshots without later patches through both direct and Vite-proxied connections; isolated Bun/Node controls passed. A user-managed restart to PID 42450 made the identical probes synchronize joins and movement, and the party browser flow then passed. The old process's cause remains unproven; no transport workaround was applied.
- QA scripts out of date: `qa-avatar` looks for the old “Young woman” title button; `qa-ride` looks for the Vietnamese “Nhà thờ Đức Bà” option under an en-US context; `qa-journal` times out waiting on an un-offered quest; `qa-audio` imports the old `apps/client/src/audio/index.ts` path and needs a scratch `PLAYWRIGHT_MODULE`.
- Physical Quest 3 hardware, production Facebook OAuth, and zone-specific audio mixing are unverified. Dense mobile views exceed the original 300k-triangle scene target.

## NPC packages

- `apps/server/test/npc-baseline.spec.ts` (canonicalized snapshot) and
  `npc-registry.spec.ts` pass: the 29 packages reconstruct the shared NPC tables
  and composed prompts byte-identically.
- `grep -r 'Calls the player "con"' apps/client/dist` finds nothing after `bun run build`.
- `bun run prepare:assets` on a clean tree leaves `git diff apps/client/public` empty;
  a temporary `npc-hoa` portrait fixture produced `avatar-lg.webp` and
  `avatar-sm.webp`, then was reverted.
- `docker build -f apps/server/Dockerfile .` succeeded with `COPY packages`.
- Gates: `bun run check:types`, `bun run build`, server Vitest (311 passed, 2
  skipped) and client Vitest (143 passed) all green.

## Phase 0A — payoff, twist, riddle, cake (2026-11-02)

- DoD green on this tree: `bun run check` → `bun run check:types` → `bun run build` → `bun run test`. Server 319 passed / 2 skipped; client 145 passed.
- New contracts: `cake`/`FRAGILE_ITEM_IDS` (npc-kit), `ItemIdSchema` + `cake`, `SeedQuest.{payoff,twist,riddle}`, `QuestSpecSchema.{payoff,twist,riddle}`, `QuestSchema.revealed`, new `ModelQuestSpecSchema`, engine `twist.ts`/`riddle.ts`, reward distance includes the twist step. Model tool now uses `ModelQuestSpecSchema`.
- Engine tests: `apps/server/test/quest-twist-riddle.spec.ts` (8). Offline parity: `apps/client/test/offline-quests.spec.ts` payoff reply + twist-applies-offline.
- Snapshot: `npc-baseline.spec.ts.snap` updated — diff is only the QUEST_RULES payoff/twist/riddle paragraph.
- Live spike: PASSED. Model `google/gemini-3.8-flash` via CoralHub. Run 1 self-corrected a self-delivery within 3 steps (`selfCorrected: true`). Run 2 authored a payoff + twist + riddle proposal accepted within 3 steps (`acceptedWithinThree: true`, `hasPayoff/hasTwist/hasRiddle: true`). **Decision 1 resolved: KEEP payoff, twist, and riddle in `ModelQuestSpecSchema`** — no fallback. Usage: 5 metered calls, 13,692 input / 357 output tokens, ~$0.00756. Evidence: `/tmp/saigon-quest-evidence/model-spike.json`.
  - Two spike-harness fixes were required and are not model problems: (1) `apps/server/.env` has a commented `# META_MUSE_API_KEY=LLM_...` on the line above the real `ch_live_...` key; `bun --env-file` mis-read the stale value, so the spike must receive the key via the environment (export the active line), and the real key works directly (curl → HTTP 200). (2) `google/gemini-3.8-flash` spends ~360 reasoning tokens before output, so `maxOutputTokens: 800` truncated the tool call (`finish_reason: length`, empty call); the spike now uses `maxOutputTokens: 4000`. Note the production harness still uses 800 (`harness.ts`), which may similarly starve tool calls under this model — worth verifying separately.

## Phase 0B — ride spend, bonuses, credit (2026-11-02)

- DoD green: `bun run check` → `check:types` → `build` → `test`. Server 327 passed / 2 skipped; client 146 passed.
- Contracts: shared `TravelModeSchema`/`TravelMode` (client `places.ts` re-exports it), `spend.mode?`, `purchase.credit?`, `QuestSchema.spent?`, `RewardSchema.bonus?`.
- Engine: `advance` accrues `spent` and reveals a riddle on a cyclo ride; `applyQuestEvents` fronts a BUY only when unaffordable and a quest's next step needs it; new `bonus.ts` (`completionBonus`, `parFare`, `bonusCurrency`). `grantQuest` and offline `offline()` fold the bonus into `reward.currency` (quest currency capped ≤100) and write it back onto the quest.
- Behavior change: completing a route with no ride spend now earns the thrifty +5 bonus, so several exact-currency assertions were updated to read the final completion reward.
- Tests: `apps/server/test/quest-spend-bonus.spec.ts` (8); offline thrifty parity in `offline-quests.spec.ts`.

## Phase 0C — BRING, component gifts, and milestone contracts (2026-11-02)

- DoD green: `bun run check` → `check:types` → `build` → `test`. Server 335 passed / 2 skipped; client 147 passed. No snapshot change.
- Contracts: items `coffee-beans`/`sheet-music`/`lanterns`, `MILESTONE_IDS`/`MilestoneIdSchema`, `QuestStep` BRING, `SeedQuest.gift`/`milestone`, `QuestSpecSchema.gift`/`milestone` (seed-only; `ModelQuestSpecSchema` unchanged), `CompletedQuestSchema.milestone`, `intent` gains `milestone` (empty message allowed), new `packages/shared/src/milestones.ts` (`MILESTONES`, `COMPONENT_ITEM_IDS`, `heldComponents`, `milestoneReady`, `milestoneForGiver`).
- Engine: BRING validates against `MILESTONES` (host + held item else `missing_item`), component guard blocks components in DELIVER/BUY, gift scope (component only on its giver's milestone seed else a domain gift), BRING advances on `deliver`, `rewardFor` uses `gift ?? gifts[0]`. `QuestPlayer.inventory` added; `proposeQuest` passes it.
- Seeds: `seedsFor` excludes milestone seeds; new `milestoneSeeds(npcId, locale)`.
- Client: `stepCopy`/`questTarget`/`dialogueQuests` handle BRING; the giver's active errand shows a Give button when the next step is BRING to this NPC and the item is held. Labels + `step_bring` in EN/VI and the QA item map.
- Tests: `apps/server/test/quest-bring-milestone.spec.ts` (8), client `quests.test.ts` BRING-to-giver case.

## Phase 1a commit 2 — featured resident personas and gag seeds (2026-11-02)

- DoD green: `bun run check` → `check:types` → `build` → `test`. Server 366 passed / 2 skipped; client 168 passed. `npc-baseline` snapshot updated; diff limited to the 8 residents (bread-vendor, park-stretch, square-tourist, plaza-stroll, river-jogger, opera-visitor, postcard-reader, alley-diner).
- Each residents package now uses `defineNpc` with its own `profile.ts`, `story.ts`, `persona.ts`, `look.ts`, `place.ts`, and `src/seeds/gag.ts`; look values, placement, and `opera-visitor` friendliness `-2` preserved from the former `defineResident` calls.
- Personas carry bespoke comedic voices (crunch decibels, reps for the gains, 1998 paper map, cải lương verse, gasping jog, opening-night reviews, stamp haiku, decimal food scores), address the player as "bạn", and close with `Motive`/`Running gag`/`Payoff habit` lines. `packages/shared/src/npcs/personas.ts` imports the 8 package personas and prefers a non-empty body over the resident template.
- Each `story.ts` lists the gag seed first, keeps a lightweight neighborly second seed, and defines a per-resident `domain`; every gag step and item stays inside its domain. No milestone component items or cake are used; BUY stays coffee/banana.
- Seeds validate via `apps/server/test/npc-seeds.spec.ts` (both locales, length limits). `npc-registry`, `npc-neighbors`, full server and client suites pass with no other fixture changes.

## Phase 3 — Clues, spends, and rides (2026-11-02)

- DoD green: `bun run check` (no warnings) → `check:types` → `build` → `test`. Server 379 passed / 2 skipped; client 224 passed. `npc-baseline` snapshot updated; diff limited to the six new riddle seeds (thao, alex, son, opera-visitor, square-tourist, postcard-reader).
- 3a: `shared/state/quests.ts` `stepCopy` appends `step_now_at` from `city` placements; `app/actions.ts` `buyMarketItem` + market panel use the now-exported `creditEligible` to front an unaffordable active-quest BUY (`market_on_credit`); new `packages/shared/src/quest/step-text.ts` `stepText`; `apps/server/.../fallbacks.ts` `incomplete` names the next step + place in EN/VI.
- 3b: six `src/seeds/riddle.ts` seeds added as extra seeds (arc stays first). Hide-at-source in `quests.ts`, `hub/view.ts`, `map/targets.ts`, `npc-label.ts`. New `shared/state/riddles.ts` reveal store (ref-counted clock), objective + journal riddle display, greet reveal reply (harness + `offline()`), `turn.ts` context lines.
- 3c: `mode_*_description` rewritten; `board()` sends `{spend,amount,mode}` and advances locally; new `features/transport/gossip.ts`, `widgets/hud/ride-line.tsx`, `features/transport/asides.ts`.
- 3d: `features/postcard/reward.tsx` shows `reward_thrifty`/`reward_sharp` from `reward.bonus`; hub `cheapestRide` suggests walking for legs under 70 units.
- Tests: `apps/server/test/clues-fallbacks.spec.ts` (5), `apps/server/test/clues-riddle-harness.spec.ts` (4), `apps/client/test/clues.spec.tsx` (13), `apps/client/test/clues-rides.spec.tsx` (11). `scripts/qa-clues.mjs` authored for A/B/C across EN/VI at 1440 and 390 — NOT run (Chromium is killed in the sandbox).

## Phase 4 — District milestone: the evening concert (2026-11-02)

- DoD green: `bun run check` (no warnings) → `check:types` → `build` → `test`. Server 392 passed / 2 skipped; client 233 passed. `npc-baseline` snapshot updated; diff limited to mai/thao/ba `gifts` (`coffee-beans`/`sheet-music`/`lanterns`), the four new milestone `QUEST_SEEDS` entries, and the prompt "allowed entities" lines reflecting those gifts.
- Content: `packages/npc-{mai,thao,ba,vy}/src/seeds/milestone.ts` added and registered in each `story.ts`; components appended to mai/thao/ba `gifts` at the end so `gifts[0]` and `rewardFor` are unchanged. Vy's `items` untouched; apex BRINGs validate against `MILESTONES`.
- Server: new `apps/server/src/domain/quests/milestones.ts` (`offerMilestone`, `offerApex`, `hostedMilestone`, `allowMilestoneEvent`, `MILESTONE_COOLDOWN_MS`); `QuestService.milestone?` hook fired once in `checkQuests` outside the transaction; `harness.ts` calls both offers with LLM context + seed-description fallback; `app/realtime.ts` runs end-soonest → start-event → move Thảo → headline on `city.apply`, throttled to one per room per 10 minutes.
- Client: `widgets/hub/milestone.tsx` + `milestoneBoard` in `view.ts`; errands "Ask about the concert" button (`canAskMilestone` → `converse('', 'milestone')`); `offline()` mirrors the milestone intent and apex auto-offer; reward-card banner + `milestone_begins_toast`; `milestone_*` keys in EN + southern VI.
- Tests: `apps/server/test/milestones.spec.ts` (10 — offer gating, apex gating, BRING consumption, hook fires once, event cap, 10-minute room limit, headline safety); `apps/client/test/milestone-board.spec.ts` (6 — board derivation, button visibility, offline apex). `npc-registry` and `npc-seeds` extended for the milestone seeds. `scripts/qa-milestone.mjs` authored (teleport; ask button for mai/thao/ba; finish 3 base; Vy auto-offers apex; give ×3; assert reward card + street-music event + headline + Thảo at City Hall; second context in the same room sees the event) at 1440 and 390 — NOT run (Chromium is killed in the sandbox).

## Phase 4 — evening-concert district milestone (2026-11-02)

- DoD green on a warm run: `bun run check` (zero warnings) → `check:types` → `build` → `test`. Server 392 passed / 2 skipped; client 233 passed. `npc-baseline` snapshot diff limited to mai/thao/ba component gifts (coffee-beans/sheet-music/lanterns) + the four milestone `QUEST_SEEDS` entries; no persona or reward-default change (`gifts[0]` unchanged, components appended at the end).
- Server: `domain/quests/milestones.ts` (offerMilestone/offerApex/hostedMilestone + `runConcertSequence` + `allowMilestoneEvent`/`MILESTONE_COOLDOWN_MS`); `QuestService.milestone?` hook fires once per granted apex outside the transaction (DB `ON CONFLICT` guards double reward); `app/realtime.ts` wires the hook (end-soonest → start-event street-music@cityhall 180s → move Thảo to the gathering anchor → safety-checked headline), one event per room per 10 min; offline mirror with the `canOfferQuests` friendliness gate for parity.
- Client: hub board (`widgets/hub/milestone.tsx` + `view.ts` derivation from inventory + `completed[].milestone`), "Ask about the concert" button (`canAskMilestone`, gated like the server), reward banner, `milestone_*` EN/VI.
- Review: NO BLOCKERS. Applied two nit fixes — extracted the shared `runConcertSequence` (the milestone spec now exercises the real hook code via a thin safety wrapper) and added the `canOfferQuests` gate to the offline mirror and `canAskMilestone`.
- Flaky infra note (pre-existing, unrelated to this change): `quest-migration.spec.ts` can exceed its 5s `testTimeout` on a cold PGlite start/first transform; it passes in ~1s with a 30s timeout and on warm full-suite runs. Worth bumping that test's timeout in a later cleanup.

## NPC offer clarity + accept/finish celebration + larger portrait (2026-11-02)

- DoD green: `bun run check` (zero warnings) → `check:types` → `build` → `test`. Server 403 passed / 2 skipped; client 233 passed.
- Server: `offeredErrandLine` (`apps/server/src/features/npc/fallbacks.ts`) describes a just-offered errand (authored `description` + concrete first `stepText`, hidden-riddle step suppressed via `isRevealed`); `harness.ts` prefers it for the `offered` event, so the deterministic reply no longer says "it is in the journal". Milestone/apex paths keep their own authored description.
- Client: `celebrate(kind)` transient store state + `<Celebration/>` overlay (`apps/client/src/widgets/hud/celebration.tsx`, `shared/ui/hud.css`); `converse.ts` plays `accept` (reward jingle) + `celebrate('accepted')` on an offer and `reward` + `celebrate('completed')` on completion. New `accept` audio event maps to the 1.76s `reward.mp3` jingle. EN/VI `celebrate_accepted`/`celebrate_completed`.
- Portrait: `.affinity-portrait` 52→88px (mobile 46→76px) in `friendship.css`; header text clearance widened in `conversation.css`.
- Tests: `apps/server/test/clues-fallbacks.spec.ts` — added `offeredErrandLine` describe (EN describes setup+step, no "journal"; hidden-riddle offer stays at the description only). `apps/server/test/harness-greetings.spec.ts` — updated the VI help assertion to expect the descriptive line ("Trước tiên, hãy") and not "nhật ký".
- UI: `scripts/qa-npc-dialog.mjs` (headless Playwright, run unsandboxed) passed at 1440 and 390 — portrait ≥70px and the `celebration-accepted`/`celebration-completed` overlays render. Screenshots in `artifacts/npc-dialog-clarity/`.

## Map Phase 0 — comic papercraft foundation (2026-11-02)

Committed at `bb7b88b` (slices: `3092b77` perf script + camera hook, `5134ea9`
atmosphere module, `0ece67a` toon palette/materials/glow/look flag, `bb7b88b`
perf-script cold-start hardening).

### Gates (committed HEAD)

- `bun run check` clean (742 files); `bun run check:types` code 0; `bun run build`
  code 0; `bun run test` → server 403 passed / 2 skipped, client 242 passed
  (28 files, incl. new `world-toon.spec.ts` and `world-primitives.spec.ts`).

### Perf baseline (new reference for phases 1–5)

`scripts/qa-map-perf.mjs` against the running dev server, 4 fixed poses × 2
viewports × day/evening. Evidence: `/tmp/saigon-map-evidence/perf-*.json`
(comic) and `/tmp/saigon-map-evidence/classic/perf-*.json`. Worst-case pose is
the alley.

| Pose (desktop)   | comic calls / tris | classic calls / tris |
| ---------------- | ------------------ | -------------------- |
| spawn (day)      | 228 / 350,209      | 227 / 350,145        |
| nguyễn-huệ (day) | 134 / 186,345      | 133 / 186,281        |
| cathedral (day)  | 145 / 176,807      | 145 / 176,807        |
| alley (day)      | 252 / 352,580      | 251 / 352,516        |

| Pose (mobile 390) | comic calls / tris | classic calls / tris |
| ----------------- | ------------------ | -------------------- |
| spawn (day)       | 154 / 340,217      | 153 / 340,153        |
| alley (day)       | 204 / 347,219      | 205 / 347,599        |

The toon swap adds ≈0 draw calls and ≈0 triangles (within ±1-call measurement
noise), confirming the look-guide expectation. These re-measured numbers — not
the earlier 192/346k desktop figure — are the Phase 0 reference; later phases add
their budgeted deltas on top. The alley pose already sits near the desktop
call ceiling, so phases that add alley dressing watch it closely.

### UI proofs (headless Playwright, 1440×900)

Evidence: `/tmp/saigon-map-evidence/toon-proof.json`, plus `toon-comic-spawn.png`,
`toon-classic-spawn.png`, `evening-glow.png`.
- Toon banding: a 40×40 patch on the spawn market façade shows 3 distinct
  quantized luminance levels under `comic` vs 6 under `classic` — fewer levels
  proves the 3-step ramp banding.
- Evening glow: with evening on, the warmest glow-strip pixel reads
  `rgb(255,156,98)` = `#ff9c62`, delta 0 from target — proves the unlit
  `MeshBasicMaterial` + `toneMapped={false}` path renders glow untoned.

### Hand-off (needs real hardware — user)

Phase 0 task 1 also asks for real-hardware fps at the spawn pose and mid Nguyễn
Huệ, `comic` vs `classic`, on desktop and a phone (`comic` must be ≤ 2 fps below
`classic`). Headless fps runs software GL and is untrustworthy, so this is left
to the user. These fps numbers become the per-phase fps reference.

## Map Phase 2 — landmarks and zones (2026-11-02)

Bitexco, the café apartments (42 Nguyễn Huệ), an exaggerated Bến Thành clock
tower, floating post office postcards, giant park trees, and Bùi Viện / market
dressing. Scenery only: no `LocationId`, `PLACES`, `CITY_ANCHORS`, NPC, or coin
changes; `city-layout.spec.ts` gained `ICON_FOOTPRINTS` in its landmark list with
no bounds change.

### Gates

- `bun run check` clean (750 files); `check:types` 0; `build` client + server 0;
  `test` → server 403 passed / 2 skipped, client 246 passed (29 files, incl. new
  `icons.spec.ts`).

### Landmarks QA (`scripts/qa-map-landmarks.mjs`, live dev server)

- Walk-in collision: walking at Bitexco stops the player at z=32.55 (north of the
  solid), and at the café apartments at z=−5.15 — both colliders hold. Desktop and
  390px.
- Minimap: exactly 2 landmark rects (distinct fill) and no overlap between the
  `map_bitexco` / `map_cafe_apartments` labels and the stop labels, both viewports.

### Bitexco camera check

From mid Nguyễn Huệ (69,0) at the default heading, the follow camera sits at
(69, 25.5, 16) looking toward −z; Bitexco is at z=29, behind the camera, so it
does not sit between the camera and the player and does not block the view. A
capture at this pose (`/tmp/saigon-map-evidence/bitexco-nguyenhue.png`) shows the
player clear with the tower reading over the rooftops.

### Perf (`scripts/qa-map-perf.mjs`, steady-state)

Desktop (comic): spawn 241 calls / 345,229 tris, alley 260 / 347,254 (worst case),
nguyễn-huệ 139 / 181,717, cathedral 146 / 170,727. Mobile: spawn 166 / 335,153,
alley 212 / 342,179. Triangles dropped versus the Phase 0 baseline at every pose
(the slot swaps removed two row buildings, which more than offsets the procedural
icons), so the +20k-triangle budget has margin. Draw calls land near the
desktop +12 budget; the counter carries ~±4 run-to-run variance, so the mobile
margin is held by cutting the signs, parasols, neon frames, and bulb wire below
700px rather than claimed to ±1. Evidence: `/tmp/saigon-map-evidence/phase2*/`.

### Deferred

- Cathedral wire clouds (item 5) depend on Phase 3's `PaperClouds`; a TODO marks
  the spot in `city.tsx`. Neon strip placements for 42 Nguyễn Huệ
  (`CAFE_NEON_STRIPS`) and Bùi Viện (`BUI_VIEN_NEON_FRAMES`) are exported for
  Phase 4.

## Map Phase 3 — diorama depth (2026-11-02)

Committed in the diorama-depth feature commit. Comic-only; `?look=classic`
unchanged. Scenery only.

### Gates

- `bun run check` clean (754 files); `check:types` 0; `build` client + server 0;
  `test` → server 403 passed / 2 skipped, client 253 passed (30 files, incl. new
  `world-diorama.spec.ts`).

### Depth QA (`scripts/qa-map-depth.mjs`, live dev server, canvas-pixel sampling)

- Title shot: fov 22 on the title screen, 49 after Play, both desktop and 390px
  (read via the Phase 0 `camera()` hook).
- Sky gradient (canvas element sampled with sharp; full-page WebGL capture is
  unreliable headless): day and evening skies each vary top-to-horizon (desktop
  sep 105 / 149) and differ from each other. Rain sky tokens are covered by the
  `world-diorama` unit test — room weather is server-authoritative and reverts a
  local override, so it is not scanned live.
- Cloud/skyline cluster: a bright cluster stands out above the horizon after a
  heading sweep (run 247 desktop, 98 mobile).

### Perf (`scripts/qa-map-perf.mjs`, vs the Phase 2 baseline)

Desktop +8 draw calls / +3.5k triangles at every pose (e.g. spawn 241→249,
alley 260→268); triangles well under the +5k budget. The phase's own budget is
+6 (sky 1, clouds 2, skyline 2, base 1); the extra +2 is the two cathedral-cloud
instanced meshes — Phase 2's deferred item 5, fulfilled here. Mobile +3 at spawn
(skyline cards cut below 700px, clouds reduced to 6). Evidence:
`/tmp/saigon-map-evidence/phase3/`.

## Map Phase 4 — light and weather (2026-11-02)

Committed in the night-lighting and rain/umbrella feature commits. Evening and
rain visuals only; day baseline and `?look=classic` unchanged. Two point lights
total (invariant held); `features/city/events.tsx` untouched.

### Gates

- `bun run check` clean (761 files); `check:types` 0; `build` client + server 0;
  `test` → server 403 passed / 2 skipped, client 262 passed (31 files, incl. new
  `world-weather.spec.ts`).

### Weather QA (`scripts/qa-map-weather.mjs`, live dev server, canvas sampling)

- Evening windows: the warmest pixel on the heritage band reads a clear 3000 K
  glow (r−b > 30), desktop and 390px.
- Evening neon: alley neon pixels are saturated (channel spread 52.2 desktop /
  51.8 mobile) cyan/magenta.
- Rain: after `setWeather('rain')` the streak mesh is present (600 desktop / 300
  mobile), 13 umbrellas open near the market, and the wet road band is darker
  than the dry baseline at the same pose.
- Rain → clear: streaks go to 0 and the umbrellas fold (13 → 0).
- Room weather is server-authoritative, so the QA re-sets and polls the override
  before sampling (it reverts on the next room snapshot).

### Perf (`scripts/qa-map-perf.mjs`, vs the Phase 3 baseline)

Day is unchanged (±1-2 call noise). Evening adds only ~+2 draw calls over day at
each pose (windows 1, neon 1-2, lamps merged +0) — well under the +8 evening/rain
budget. Rain adds the streak, puddle, and two umbrella instanced meshes on top,
verified by the diagnostics counts. Triangles stay within +10k. Evidence:
`/tmp/saigon-map-evidence/phase4/` and `weather-*.json`.
