# Final evidence

QA captures referenced below live in `artifacts/`, which is local-only and gitignored.

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

## Verification limits

- Incremental-state investigation: backend PID 26453 sent initial room snapshots without later patches through both direct and Vite-proxied connections; isolated Bun/Node controls passed. A user-managed restart to PID 42450 made the identical direct/proxied probes synchronize joins and movement. The party browser flow then passed. Exact old-process cause remains unproven; no transport workaround was applied.
- Captures and raw model evidence are local, ignored artifacts; durable commands and observed results are recorded here. No deployment or push performed.
- Physical Quest 3 hardware, production Facebook OAuth, and zone-specific audio mixing are unverified. Dense mobile views exceed the original 300k-triangle scene target.
