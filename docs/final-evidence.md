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
- `node scripts/qa-coin-collect.mjs`, unsandboxed headless Chromium at 1280x800 and 390x844: teleporting onto `coin_leloi_1` raised the wallet 30 -> 35 once, the `collectingCoins` effect set populated then cleared to 0 within the window, and re-entering the spot granted nothing. A reduced-motion run collected with the effect set never populated. Local evidence: `/private/tmp/saigon-tour-qa/coin-collect-{desktop,mobile}.png`.

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
