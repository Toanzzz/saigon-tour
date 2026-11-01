# Final evidence

QA captures referenced below live in `artifacts/`, which is local-only and gitignored.

## NPC dialog clarity — November 1, 2026

- Errands strip added between the conversation header and history. `dialogueQuests` now returns `fromNpc`/`forNpc`/`ready`/`delivery`/`canHelp`/`full`; the journal and dialog share one source.
- NPC lines render as left-aligned bubbles mirroring the player bubble; the NPC speaker label is dropped (header names them), eyebrow shows `role · location`, and per-NPC portrait colors were added.
- Footer source-label shows text only in the offline/fallback state; a dot with a tooltip otherwise.
- Gates pass: `bun run check` (only unrelated `plan/*.md` markdown-format findings remain), `bun run check:types`, `bun run build`, `bun run test` (server 114 passing/2 skipped, client 88 passing including 6 new `dialogueQuests` cases: none/from/for/ready/delivery/full).
- Headless Playwright (dev server user-started, run unsandboxed), desktop 1440×900 and mobile 390×844:
  - Offline full quest cycle via new copy: "Ask for an errand" → "Give fresh herbs" → "Turn in" granted the 25-coin reward once; currency 55, 1 completed; no page errors or horizontal overflow. Evidence: `artifacts/npc-dialog-clarity/quest-flow.json`.
  - Errands-strip states asserted: 0 quests shows "Ask for an errand"; active quest shows "In progress" + "Track"; ready quest shows "Ready" + "Turn in"; 3/3 shows "Journal full (3/3)". Evidence: `artifacts/npc-dialog-clarity/{available,active,ready,full}-{1440,390}.png`.

## Title screen layout — November 1, 2026

- Root gates pass: check → types → build → test. Server 114 passing, two skipped; client 82 passing.
- Headless Playwright at 1440×900, 1280×720, 390×844 and 844×390: form order is name → Start → account; name row and Start share a width; legal links never overlap the content; no horizontal overflow or page errors. On desktop, fill name → dice → refill → Start exploring removed the title screen. Event name tags render at z-index 3–4, below `.game-ui` (10). Local captures: `artifacts/title-layout/`.

## Dev server shutdown — November 1, 2026

- Root gates pass: `bun run check` → `bun run check:types` → `bun run build` → `bun run test`. Server 114 passing, two integration cases skipped; client 82 passing.
- `onStop` releases once, exits on the first SIGINT/SIGTERM, and still exits when release stays pending. `closeHttpServer` finishes while a client holds the socket.
- `bun --watch` using that helper stayed up across a file reload, then exited on an external SIGTERM while a socket was connected. Port 58994 was free afterward.

## Final quest and party verification — November 1, 2026

- Required root gates pass: `bun run check` → `bun run check:types` → `bun run build` → `bun run test`. Server: 111 passing, two integration cases skipped in the unit gate; client: 82 passing. Two real Postgres integration cases pass separately.
- Real Postgres group control: twelve concurrent completion checks through two independent `GameDb` / `QuestService` instances produce one reward per participant and exactly two ledger rows for the shared quest.
- Actual Muse party harness: authored “Morning coffee for Linh’s lunch”, a three-step `BUY coffee` / `GO_TO park` / `TALK_TO linh` quest shared by two members. Each bought coffee and completed independent steps. Both received fifty coins, a postcard, and two reputation; wallets 30 − 3 + 50 = 77. Both received `quest-completed`; repeated checks changed nothing. Four requests, 11,351 input / 903 output tokens, estimated $0.0074815. Local evidence: `/tmp/saigon-quest-evidence/party-live.json`.
- Live party browser Playwright passed with desktop/mobile contexts: real Invite/Accept and emote, a live three-step party errand “Path for evening gathering” (`GO_TO alley`, `GO_TO cityhall`, `TALK_TO vy`), independent progress, and a giver check pushing 61 coins/postcard/2 reputation to both clients (wallet 91, completed 1). No page errors. Local evidence: `artifacts/quest-multiplayer/flow.json`, `desktop.png`, `mobile.png`.
- Final persistence Playwright passed at 1440×900 and 390×844: live completion wallets 79 / 70 with one completion; reload preserves wallet/completion/name; reset returns each to 30 coins, zero active/completed quests, and the same identity/name. Local evidence: `artifacts/quest-persistence/final/flow.json`. The script waits for delivery HTTP/thinking completion before moving to the next NPC.
- Journal Playwright passed at desktop 1440×900 and mobile 390×844 in live and offline flows: offer, visible minimap target, Track errand, Abandon errand, quest/pin removal, no completion granted, no page errors or horizontal overflow. Local evidence: `artifacts/quest-journal/live/flow.json`, `artifacts/quest-journal/offline/flow.json`, and captures.
- Final deterministic offline completion Playwright passed at both widths: generated seed quest, real help/delivery/return controls, 25-coin reward, one completion, no page errors or overflow. Local evidence: `artifacts/quest-overhaul/final-offline/quest-flow.json` and captures.
- Party regressions cover atomic cap/inventory rejection, concurrent rewards, original ownership through leave/reconnect, service reconstruction, abandon/reset, authenticated abandonment, and a captured-lock-set race with a new party offer. Client coverage includes abandonment failures/session/revision fences, offline shared-reward refusal, live map targets, and summed multi-quest reward pushes.
- Presence ordering regression: a state snapshot arriving before welcome can temporarily include self in remote samples. A focused failing control proved the stale self entry; roster recording now removes self when identity is known.

## Shared city Director verification — November 1, 2026

- Root gates pass: check → types → build → test. Server 100 passing / one integration skipped; client 67 passing.
- Live headless Playwright, desktop 1440×900 and mobile 390×844 in two contexts: same room, revision 4, matching market event, Linh moved to market/gathering `[-17,0,8]`, Hoa’s need, weather, and headline visible in each City pulse feed. No page errors or overflow. Local evidence: `artifacts/city-director/shared-city.json` and desktop/mobile captures.
- Scripted headless Playwright passed in two desktop/mobile contexts: first City Hall festival, Vy at `cityhall/gathering [66,0,-12]`, shared food-alley need and headline rendered in both City pulse feeds. No page errors or overflow. Local evidence: `artifacts/city-director/scripted/shared-city.json` and captures.
- Actual Muse Director: `start-event`, `move-npc`, `set-npc-need`, `post-headline` accepted. Two metered calls; 5,602 input / 728 output tokens, estimated $0.004257. Empty-room and cooldown ticks made no extra requests.
- Actual NPC with that snapshot authored “Morning Rush Herbs for Linh” using `propose-quest`; its description names the event and Linh’s moved placement. `source: live` asserted. Two metered requests, 5,125 input / 364 output tokens, estimated $0.0032905. Local evidence: `/tmp/saigon-quest-evidence/director-live.json`.
- Shared schema tests verify full and incremental Colyseus encoding, event/need/headline deletion, and millisecond timestamps. Server tests cover event cap/expiry, authored anchors including prototype-name rejection, safe headlines/needs, isolated room worlds, occupied-room cooldown, atomic UTC daily counts, and a live turn losing occupancy.
- Client regressions reproduce and prevent incomplete/malformed snapshot crashes and old-room callbacks clearing or overwriting a replacement room.

## Quest overhaul verification — November 1, 2026

- Pass 1 root gates pass: `bun run check` → `bun run check:types` → `bun run build` → `bun run test`. Server: 87 passing tests and one Postgres integration test skipped; client: 61 passing tests.
- Headless Playwright, deterministic offline seed flow, 1440×900 and 390×844: real `Any errands?` → `Give herbs` → `I'm back` controls offered a generated quest, advanced delivery, and granted its 25-coin reward once. No page errors or horizontal overflow. Local evidence: `artifacts/quest-overhaul/offline/quest-flow.json` and reward captures.
- Live Muse Spark tool spike uses the actual shared discriminated-union schema and validator. A self-delivery proposal returned `self_delivery`; Muse corrected the recipient within three steps. Model `muse-spark-1.3-contributor`; three metered requests, 4,078 input / 372 output tokens, estimated $0.002783. Local evidence: `/tmp/saigon-quest-evidence/model-spike.json`.
- Isolated live `NpcHarness` with PGlite: Muse authored “Help Linh with lunch”, a two-step visit/talk quest through `propose-quest`; accepted events made it ready, `check-quests` granted 40 coins, a postcard, and 2 reputation. Wallet 30 → 70; repeated check remained 70. Four metered requests, 9,581 input / 753 output tokens, estimated $0.0062965. Local evidence: `/tmp/saigon-quest-evidence/live-flow.json`. This proves actual harness/model behavior with isolated persistence.
- Live browser Playwright passed at 1440×900 and 390×844: Muse authored distinct two-step visit/talk errands, real help/return controls advanced them and granted 40 coins (wallet 70), one completion, `source: live`, no page errors or overflow. Local evidence: `artifacts/quest-overhaul/live-browser/quest-flow.json` and reward captures.
- Regression coverage includes migration of existing active/completed saves, concurrent offer cap and completion checks, repeated deliveries, full inventory purchase rejection, and pending-event quest progression through all four revision-fenced client apply paths.
- PGlite fixture initialization timed out under unrestricted test workers during concurrent browser work. A one-variable run with two workers passed unchanged assertions and timeouts; server Vitest uses two workers.

## Title screen continue vs new journey — November 1, 2026

- Root gates pass: `bun run check` (Biome flags only the ignored `plan/*.md` drafts) → `bun run check:types` → `bun run build` → `bun run test` (client 88 passing).
- Headless Playwright against the local dev server, 1440×900 and 390×844 (touch): fresh context shows `Start exploring`, editable name, no summary or new-journey control. After accepting Hoa's errand and reloading, the title shows `Welcome back, {name}`, a chip such as `Helping with “Fresh herbs for Linh” · near Bến Thành Market`, `Playing as … · Change`, and `Continue journey`. Continue keeps the quest. Change → new name → Continue persists the name across reload. `Start a new journey` shows `Tap again to erase progress`, reverts after 4s, and the second tap enters play with an empty quest list; a reload then shows the fresh state with the kept name. No page errors. Passed 3 consecutive two-viewport runs plus 2 extra mobile runs. One earlier mobile run timed out waiting for play after Change → Continue and did not reproduce in the later 6 mobile runs; cause unproven.
- `scripts/qa-persistence.mjs` passes at both widths; `enterPlay` in `scripts/qa-quest-flow.mjs` accepts `Start exploring` or `Continue journey`.

## Title rename and new-journey reset — November 1, 2026

- Root gates pass: `bun run check` → `bun run check:types` → `bun run build` → `bun run test` (server 114 passing / 2 skipped, client 88 passing).
- Headless Playwright against the local dev server, 1440×900 and 390×844 (touch), 3 passing two-viewport runs: returning title has no name input or Change control, and the primary button reads `Continue journey as {name}`. Pause → edit name → `Save name` updates the server name; the button hides after save and the title shows the new name after reload. Pause and title `Start a new journey` arm `Tap again to erase progress`, revert after 4s, and the second tap returns to the fresh title (`Start exploring`, no Welcome back or summary, empty quests, current name prefilled). Editing that name → Start exploring saves the new name. No page errors.
- `scripts/qa-persistence.mjs` passes at both widths with the two-tap reset and fresh-title assertion.
- Reset keeps account and Meta availability: the reset previously rebuilt state from `initialState()`, so `metaAvailable` became false and `account` null, hiding `Continue with Meta` until reload. Headless Playwright at 1440 and 390: the button shows after Pause → two-tap reset; the same script fails on the prior code.
- Intermittent: in a few runs, clicking Continue right after a reload left the screen on `title` before diagnostics were installed; the QA waits for diagnostics before clicking. Cause unproven.

## English + Vietnamese — November 1, 2026

- Root gates pass after each pass: check → types → build → test (server 118 passing / 2 skipped, client 97 passing). Unit coverage: tests pinned to `en`; `vi-VN` browser → `vi`; `LocaleSchema` equals Paraglide locales; catalogs share keys; `['session']`/`['settings']` gcTime is Infinity; saved choice survives 10 fake minutes; `InteractRequestSchema` defaults `locale` to `en` and rejects others; greetings cache per locale with the Vietnamese rule in the prompt; live chat turns carry the rule; Vietnamese offline fallback and seed quest (`Rau thơm cho hàng xóm`) on server and client.
- `scripts/qa-i18n.mjs`, headless Playwright against the local dev server, 1440×900 and 390×844 (touch), browser `vi-VN`: title `Một chuyến đi nhỏ`, `html[lang=vi]`; `EN` toggle → `A little journey`, persisted across reload; Pause → select `Tiếng Việt` → `Cứ thong thả.` with the pause menu still open; HUD `Chợ Bến Thành · Xu`, journal `Hành trình nhỏ của bạn … 30 xu`; NPC chat sends `locale: "vi"` and shows Vietnamese replies; `Clear saved data` → back to `vi`. No page errors or overflow.
- Live provider: model `google/gemini-3.8-flash` via the OpenAI-compatible endpoint in `apps/server/.env`. Tool-enabled NPC turns hit the 8s per-call limit (`MastraTimeoutError … stepMs`, proven with a real `NpcHarness` turn); the same request body with no limit returned a Vietnamese reply in 8.6s. The per-call limit is now 15s; the client waits 40s. After the change, direct `/npc/hoa/interact`: `vi` → `source: live`, Vietnamese reply, 11s; `en` → live English, 7s.
- Live headless Playwright against the dev server, 1440×900 and 390×844: `qa-i18n` passed with `replySource: live` Vietnamese chat (e.g. “Nước lèo phở bò cô hầm từ sáng sớm thơm phức…”); the greeting was a cached Vietnamese fallback from earlier runs. `qa-npc-dialog` passed (it now imports the app's own `game.ts?t=…` instance). `qa-persistence` passed: live quest completion to 55 coins, reload, and reset at both widths.

## Verification limits

- Incremental-state investigation: backend PID 26453 sent initial room snapshots without later patches through both direct and Vite-proxied connections; isolated Bun/Node controls passed. A user-managed restart to PID 42450 made the identical direct/proxied probes synchronize joins and movement. The party browser flow then passed. Exact old-process cause remains unproven; no transport workaround was applied.
- Captures and raw model evidence are local, ignored artifacts; durable commands and observed results are recorded here. No deployment or push performed.
- Physical Quest 3 hardware, production Facebook OAuth, and zone-specific audio mixing are unverified. Dense mobile views exceed the original 300k-triangle scene target.

## CI deploy pipeline — November 1, 2026

- From a clean export of `a5fd7b7` plus the deploy files: `bun run check` → `check:types` → `build` → `test` passed (server 118 passed / 2 skipped, client 97 passed).
- `actionlint .github/workflows/deploy.yml`, `shellcheck scripts/deploy-remote.sh scripts/setup-deploy.sh`, and `POSTGRES_PASSWORD=x docker compose -f compose.prod.yml config -q` passed.
- `docker buildx build --platform linux/arm64 -f apps/server/Dockerfile .` passed.
- Host t-oracle (`oracle.toan.io`, aarch64): user `toan` is in `docker`, and the `edge` network exists.
- Not yet observed: GitHub secrets/vars, the host `.env`, a workflow run, `https://saigon-tour-api.toan.io/health`, and the deployed client.

## NPC friendliness harness

- Required root gates pass in order: `bun run check` → `bun run check:types` → `bun run build` → `bun run test`. Server: 150 passing / 2 skipped; client: 120 passing.

- Migration `0005_npc_friendship.sql` adds player-row friendship. `bun run test:integration` passes both real Postgres cases; completion friendship persists at +2 and the completion ledger grants once under concurrency.
- Unit coverage includes all 29 NPC seed loops, friendship clamps/presets/cooldown/chat cap/offer gate, once-per-turn adjustment, decline ownership/progress, expiry/reclamation, reset, history identity isolation, and explicit-model observational memory.
- `node scripts/qa-friendship.mjs`, unsandboxed headless Chromium at 1440×900 and 390×900: walker stops nearby; real conversation input requests an errand; talking to Linh advances it; return greeting opens reward and adds +1; reopening shows meter +1 and prior chat; abandonment subtracts one; history survives reload; authenticated journey reset clears history; reduced-motion feedback uses `friendship-fade`. No page exceptions or horizontal overflow. Local evidence: `artifacts/npc-friendship/results.json` and resident captures.
- Live quest script with `google/gemini-3.8-flash`: model calls `propose-quest`, delivery advances, giver greet completes, wallet reaches 55, repeated completion does not grant again. Recorded usage: 4,284 input / 128 output tokens, estimated $0.002398.
- Live memory script: 25 turns using Postgres storage, explicit metered compatible model, minimal reasoning, asynchronous observation. Observations exist; prompt input falls from 4,181 at turn 19 to 2,871 at turn 20; turn-two lotus tea preference is recalled on turn 26. Raw context is bounded to forty messages through `getContext`, since Mastra OM ignores `lastMessages`. Reset explicitly clears the OM record because the installed Postgres adapter's `deleteThread` removes only messages, vectors, and thread metadata.
- Verification commands using `.env` unset inherited `META_MUSE_API_KEY`: the inherited old key returned provider HTTP 401 while the updated file credential succeeded. No secret values are recorded.

## NPC opening greetings

- Opening a conversation sends `intent: greet` with an empty message. Headless Playwright at 1440×900 and 390×900 showed one NPC line, no player line, and no `What is happening in the neighborhood?` text. The next typed message included the greeting in the model context. Asked what the NPC had just said, the NPC repeated its greeting.
- The run exposed a provider greeting stopped by the output limit (`finish_reason: length`). Greeting generation now allows 300 output tokens, skips caching truncated replies, and versions the cache key.

## Chat header affinity

- Headless Playwright at 1440×900 and 390×900 opened Linh via the real interact control. Start: `• Getting acquainted`, `+1 to Warm`, meter value 1, one warm pip lit. After raising Linh to 2 through `noteFriendship`: `♥ Warm`, two warm pips, one `.changed` pip, no page errors. The header fit in one 26px row inside the dialog at both widths.

## Quest reward unlocks

- Gates: `bun run check`, `bun run check:types`, `bun run build`, and `bun run test` pass. Unit coverage: 166 server tests (adds `unlocks`, `unlocks-grant`, `me-equip`) and 128 client tests (adds `wardrobe`).
- Server tests prove the giver's tier-gated unlock selection, idempotent grant under 12 concurrent completions, equip ownership/slot validation, reset clearing, and that legacy rewards without `unlockId` still parse.
- `node scripts/qa-unlocks.mjs`, unsandboxed headless Chromium at 1440×900 and 390×900: completing Hoa's seed errand grants the neutral-tier `non-la` unlock, the reward popup shows "unlocked", the wardrobe opens from the header button, and equipping sets `equipped.hat = non-la`. No page errors at either width. Evidence: `artifacts/unlocks/results.json` and reward/wardrobe screenshots.

## Single world room and waiting notice — November 1, 2026

- Gates: `bun run check`, `bun run check:types`, `bun run build`, and `bun run test` pass. Server 176 tests (adds one-room capacity, `room_full` surfacing in Colyseus 0.18, same-player replacement at 20/20, retained-slot rejoin plus a waiting guest admitted when one leaves, two concurrent first joins in one room, and `joinedAt` preserved across replacement). Client 128 tests unchanged.
- `node scripts/qa-waiting.mjs`, unsandboxed headless Chromium at 1440×900 and 390×844: 20 SDK peers fill the one room; `GET /realtime/status` reports `full: true` with a longest name. A fresh browser is refused with `room_full`, shows the waiting notice on the title screen and in the HUD (longest stroller name and duration), and auto-joins within the 10s retry once a peer leaves. No page errors at either width. Evidence: `artifacts/waiting/waiting-{title,hud}-{1440,390}.png`.

## Plain player bodies, equip anywhere, 3D wardrobe — November 1, 2026

- Gates: `bun run check`, `bun run check:types`, `bun run build`, and `bun run test` pass. Server 186 tests / 2 skipped (adds `me-profile` body round-trip + reset persistence + invalid-body 400, `presence-body` schema round-trip and `man` fallback, and avatar/outfit-palette assertions in `unlocks`). Client 128 tests (wardrobe spec reworked for the 3D cards; session spec covers `saveProfile` sending `{ name, body }`).
- Blender: `scripts/blender/build-player-bases.py` builds `player-man`/`player-woman`. Re-importing each GLB confirmed three materials (`colormap`, `outfit-top`, `outfit-bottom`), the shirt faces on `outfit-top` and trousers on `outfit-bottom` with skin/hair/shoes on `colormap`, and preserved `idle/walk/sprint/sit` animations. A high-contrast recolour render (top magenta, bottom green) measured 2,614 top and 4,474 bottom pixels, proving both split regions recolour; per-outfit renders show the bottom and top recolouring to each palette.
- `node scripts/qa-avatar.mjs`, unsandboxed headless Chromium at 1440×900 and 390×844: a new journey picking "Young woman" starts with `state.body === 'woman'`; after reload the body persists; a second context (man) and the woman share one room and the man's client receives the woman's body through presence (`network.remoteBodies` includes `woman`). No page errors. Evidence: `artifacts/avatar/results.json` and title/playing/multiplayer screenshots.
- `node scripts/qa-unlocks.mjs`, same widths: completing Hoa's errand and clicking "Wear now" equips `non-la`; the wardrobe opens with a `<canvas>` inside the dialog; the equipped card's Unequip clears the slot and Equip re-applies it; switching the body to woman updates `state.body`. No page errors. Evidence: `artifacts/unlocks/results.json` and reward/wardrobe screenshots.
- A stale Vite dev-server module graph briefly served the moved `widgets/hud/wardrobe.tsx`; re-touching `app/game-ui.tsx` forced Vite to re-resolve to `widgets/hud/wardrobe/index.ts`. The production build was unaffected.

## Esc pause menu fix — November 1, 2026

- Bug: pressing Esc from active play only briefly suspended the music and never showed the pause menu. Root cause proven with instrumented headless Chromium: the global keydown handler opened the pause menu (a native modal `<dialog>` via `showModal()`), and the same Esc press then fired the dialog's native `cancel`, whose `onCancel` re-toggled `pause()` back to `playing`. The menu opened and closed within one keypress.
- Fix: the game store (`screen`/`panel`) is the single source of truth. `Dialog` and `HubScreen` `onCancel` now only `preventDefault()` the browser's native Esc-to-close, so they no longer write state. The Esc branch in `input.ts` runs before the typing early-return, so the global handler is the sole Esc authority and also works when a control inside the pause dialog (e.g. the volume slider) is focused.
- Gates: `bun run check`, `bun run check:types`, `bun run build`, `bun run test` pass (server 176/2 skipped, client 128).
- Unsandboxed headless Chromium at 1280×800 and 390×844: six consecutive Esc presses strictly alternate the pause menu open/closed (DOM `.pause-dialog[open]`), and the Resume button closes it. No page errors. Note: the `__THREE_GAME_DIAGNOSTICS__` snapshot updates via R3F `useFrame`, which freezes while physics is paused, so `state.screen` from that global reads stale when paused — the pause() call trace and the DOM confirm the store is correct.

## Gender toggle replaces title avatar preview — November 1, 2026

- Title screen no longer renders the turning avatar preview or the two-button "Your look" panel. Gender is now a single pill toggle inside `.title-name-row`, placed between the name input and the dice, cycling man ↔ woman on click. Reused in the in-play rename panel (`PauseName`).
- i18n: dropped unused `title_body_label`; added `title_body_toggle` (en "Switch character look", vi "Đổi diện mạo nhân vật"). `body_man`/`body_woman` still supply the short pill labels.
- Gates: `bun run check`, `bun run check:types`, `bun run build`, `bun run test` (client 128) pass.
- Unsandboxed headless Chromium at 1440×900 and 390×844: `.title-body`/`.title-avatar` absent; `.title-gender` and `.title-dice` both present in `.title-name-row`; clicking the toggle switches the label Young man → Young woman; `aria-label` = "Switch character look".

## Gender icon toggle + gender-aware dice — November 1, 2026

- Gender toggle now shows a Mars/Venus icon (`male`/`female`) instead of a text label; the man/woman wording stays in the button's `aria-label`/`title` for screen readers.
- The dice now randomizes gender too: it picks a random body and a matching first name. `randomPlayerName(body, random?)` draws from gender-split tourist first-name pools (`MALE_FIRST`/`FEMALE_FIRST`) plus a shared surname list; added `randomPlayerBody(random?)`. The server's no-arg `randomPlayerName()` still works (defaults to man).
- Gates: `bun run check`, `bun run check:types`, `bun run build`, `bun run test` (client 128) pass.
- Unsandboxed headless Chromium at 1440×900 and 390×844: gender button renders a single SVG icon with no text; toggling swaps the icon path; across 40 dice rolls both genders appear and names vary. Sample presets: Kenji Clarke, Sofía Walsh, Nora Kim, Mikkel Novak, Priya Dubois.

## Gender glyphs from @iconify-json/glyphs — November 1, 2026

- Added dev dependency `@iconify-json/glyphs@1.2.0` to the client workspace. `scripts/glyphs-extract.ts` (script `glyphs:extract`) pulls only the used icons (`male`, `female`) into `src/shared/ui/glyphs.generated.ts`, so the full 3,452-icon set never enters the bundle.
- New `Glyph` component in `shared/ui/icons.tsx` renders the extracted glyph body (80×80 viewBox, stroke `currentColor`). The title/pause gender toggle uses `<Glyph name={body === 'man' ? 'male' : 'female'}>`; the hand-authored Mars/Venus paths were removed.
- Gates: `bun run check`, `bun run check:types`, `bun run build`, `bun run test` (client 128) pass.
- Unsandboxed headless Chromium at 1440×900 and 390×844: gender button SVG uses viewBox `0 0 80 80` with the exact glyphs `male`/`female` path data, swapping on toggle.

## Client state → TanStack Store refactor — November 1, 2026

- Scope: phases 1–6 of `plan/tanstack-store-refactor.md`. Every piece of reactive client state now lives in a TanStack Store (module-level, explicit resets); pending flags come from `useMutation`; no behavior change.
- Gates after every phase: `bun run check` (1 pre-existing `cards.css` !important warning), `bun run check:types`, `bun run build`, `bun run test` (server 186 passed / 2 skipped, client 135 passed — includes the new `test/ui-stores.spec.ts` covering store resets, `installUiResets` transitions, the `journeyConfirm` fake-timer auto-disarm, and `samplePresenceView` write-on-change).
- Perf check (`scripts/qa-store-perf.mjs`, unsandboxed headless Chromium, desktop 1440 and mobile 390): walking for 2 s re-renders `GameUI` only 1× (down from ~20 at 10 Hz before), while the minimap "you" marker `cy` moved (125.5 → 118.4). No page errors.
- Flow QA (unsandboxed headless Chromium, 1440 + 390): `qa-npc-dialog` (chat draft) PASS; `qa-unlocks` (wardrobe tab store) PASS; `qa-waiting` (shared clock ticker) PASS; `qa-i18n` (locale remount — drafts survive, name persists) PASS; `qa-game` (mobile touch stick → `touchView`) PASS.
- Live probes confirmed the migrated draft stores on the running game: the title name draft seeds from `guestName` ("Lukas Müller"), the transport form seeds to `destination: "park"` with a fully populated English `<select>`, and the header mute toggle flips `game.muted` and the audio engine `muted` together via `installAudioSync`.
- `qa-avatar` and `qa-ride` fail on stale selectors unrelated to this refactor (they look for the old "Young woman" title button label, now the "Switch character look" icon toggle, and the Vietnamese "Nhà thờ Đức Bà" option under an en-US context). `qa-journal` times out waiting on an un-offered quest; `qa-audio` references the pre-slice `src/audio/index.ts` path and needs a scratch `PLAYWRIGHT_MODULE`. None touch the refactored code paths.
