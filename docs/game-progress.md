# Game progress

## Current scope

Stylized District 1 exploration with NPC-authored errands, a shared-room City Director, persistent player progress, and anonymous-first co-op presence.

- Player promise: meet neighbors, help with small errands, and discover a compact Sài Gòn neighborhood.
- Core loop: talk → ask for an errand → follow 1–3 validated steps → return to the giver → receive a persistent reward. Walking is free; transport and market purchases spend coins.
- Spatial plan: Bến Thành anchors Lê Lợi; Nguyễn Huệ links City Hall and the river; Đồng Khởi links the Opera House and cathedral/Post Office square. The food alley and park provide quieter destinations.
- World: licensed character/prop assets, authored streets and landmark façades, supplied landmark statues, Draco-compressed models, day/evening lighting, ambient crowds, transport, market, and river viewpoint.

## Quest overhaul

- Pass 1 implemented and committed: `30a23f7`. Shared quest validation, domains and seeds cover all nine NPCs; the server owns quest IDs, rewards, active cap, accepted event progression, and once-only completion records.
- Player saves contain up to three quests, sequential progress, completion summaries, and inventory. Migration 0003 preserves existing active and completed progress.
- Client journal, HUD, hub story, NPC markers, desktop dialogue, XR dialogue, and reward copy derive from quest data. Session, HTTP, socket-event, and reward apply paths retain revision fences and replay pending quest progress.
- Pass 1 proof: all root gates; 87 server / 61 client tests; desktop/mobile offline and live real-control completion; Muse schema rejection/correction and live harness completion with token evidence.
- Pass 2 implemented and validated. A City Director owns each occupied room’s events, weather, NPC placements/needs, and headlines. Actions pass deterministic validation; placement uses authored anchors; events cap at two; model turns run at most once per ninety seconds with daily count/spend guards.
- City state uses Colyseus patches; headline messages produce toasts. NPC models and speech move to synchronized positions; interaction range reads those positions. Rain uses tint/fog. Event markers and the hub City pulse feed reflect room state.
- Pass 2 proof: all root gates; 100 server / 67 client tests. Live two-context desktop/mobile shared event/move/feed passed. Live Director tools and a need-reactive NPC proposal have recorded usage. Deterministic scripted-room desktop/mobile two-context verification passed.
- Pass 3 implemented and validated. Party quests use a shared ID and original recipient list, independent progress, atomic group assignment, and once-only rewards. Leave/disconnect retains participation; abandon/reset removes the player’s copy.
- Journal abandonment reclaims pending supplied delivery items. Minimap pins follow live NPC targets; tracking chooses the current HUD objective. `DIRECTOR_MODE=scripted` supplies deterministic demo beats.
- Pass 3 proof: root gates, 111 server / 82 client tests, two real Postgres integration cases including cross-instance concurrent group completion, isolated live Muse party completion and socket pushes, desktop/mobile live and offline journal controls, and final offline completion flow.
- Live party browser proof: real invite/accept, independent three-step progress, return verification, and 61-coin rewards pushed to both desktop/mobile clients; no page errors.
- Persistence Playwright passed at both widths: live quest completion, reload preserving wallet/completion/name, and reset preserving identity/name while restoring 30 coins and clearing quests/completions.
- Development state sync: a stale process sent initial snapshots without later patches. The identical direct/proxied probes pass after a user-managed full restart. Dev API shutdown closes room sockets, the HTTP server, and the database pool, then exits on SIGINT/SIGTERM. `bun dev` sends SIGKILL after 3 seconds if that process is still running.

- NPC dialog clarity: an Errands strip (ready/needs-you/in-progress/available states from a shared `dialogueQuests`) sits between the header and history; NPC lines are bubbles, the header eyebrow shows role · location, portraits are per-NPC, and the footer source-label is text-on-offline only. Verified by gates, 6 new `dialogueQuests` unit cases, and headless Playwright (desktop + 390px) for the full quest cycle and all four strip states.
- English + Vietnamese: Paraglide JS 2 client catalogs (`apps/client/messages`). Locale: saved choice (query cache `['settings']`) → browser `vi*` → `en`. Title `EN | VI` toggle and Pause `Language / Ngôn ngữ` select switch live; only the DOM UI remounts. NPC interact requests send `locale`; the server adds a per-turn language rule, caches greetings per locale, and has Vietnamese fallbacks and seed quests. Room-wide barks, headlines, and Director events stay English. Saved quests keep their original language.

## Runtime and contracts

- Bun 1.4.4, React Three Fiber/Three.js, Rapier, TanStack Query/Store, WebXR; Node/Hono, Mastra, Better Auth, Colyseus, Postgres 18; shared Zod contracts.
- Ports: client 58000, API 58001, Postgres 58002. Ask the user to start/restart local development servers. `bun dev` exits the API on SIGINT/SIGTERM and force-kills it after 3 seconds.
- Cloudflare serves client assets; the API runs separately in a Docker image. Secrets stay server-side.
- Title screen order: title, tagline, blurb, then one 400px form (name + dice → Start exploring/Enter VR → guest/Meta account line), controls hint. Legal links pin to the bottom-left; short landscape moves them bottom-right on a pill. Mobile fade darkens toward the bottom, behind the text. City event labels stay below the UI layer.
- Title screen states: fresh players (no favors, quests, talks, or travel) get the editable name + dice and Start exploring. Returning players with a journey get Welcome back + a summary chip (favors done · tracked quest · location), a read-only `Continue journey / as {name}` button, and Start a new journey. Renaming during a journey lives in the Pause menu (Save name appears once edited).
- Start a new journey is a two-tap confirm everywhere (title, Pause, reward); the confirm label reverts after 4s. It erases progress only and returns to the fresh title with the current name prefilled and editable.
- Anonymous guests receive a generated editable name. Facebook login links progress; an existing account save wins. Reset preserves identity; clear saved data drops the persisted query cache.
- Quest rewards use the durable completion ledger. Room state is ephemeral and isolated; player quest progress persists in Postgres.
- Meta: `muse-spark-1.3-contributor` at `https://api.meta.ai/v1/chat/completions`; `META_MUSE_API_KEY` stays server-side.
- No deployment has run yet. Unrelated `.gitignore` edits remain outside quest commits. Escape-key debug logs were removed at user request.

## CI deploy — November 1, 2026

- `.github/workflows/deploy.yml`: push to `main` runs verify → arm64 API image to GHCR → SSH recreate on t-oracle via `scripts/deploy-remote.sh` and `compose.prod.yml` → client `wrangler deploy` with `VITE_API_BASE_URL=${API_URL}`. Pull requests run verify only. `bun run credentials` (`scripts/credentials.ts`) infers gh/ssh/wrangler context, links a pre-filled Cloudflare token template, verifies, then sets the secrets, vars, deploy key, and host `.env`.
- Local proof: root gates, `actionlint`, `shellcheck`, `docker compose -f compose.prod.yml config`, and a linux/arm64 image build. Not yet run: `bun run credentials` against the host, a CI run, the public health check, and Playwright against workers.dev.

## Verification and limits

- Required gates: `bun run check` → `bun run check:types` → `bun run build` → `bun run test`.
- UI proof: headless Playwright driving actual controls at 1440×900 and 390×844, with deterministic and live model runs.
- Evidence: `docs/final-evidence.md`; ignored captures/reports in `artifacts/` and live usage JSON under `/tmp/saigon-quest-evidence/`.
- Server Vitest uses two workers; this avoids reproduced PGlite initialization timeouts under concurrent browser load without increasing timeouts.
- Physical Quest 3 hardware, zone-specific audio mixing, and Facebook OAuth with production credentials are unverified. The expanded mobile scene exceeds the initial 300k triangle target in dense views.

## NPC friendship harness

- Shared ids cover 29 agents; city placements, director control, and barks remain neighbor-only.
- Friendship persists on the player row through migration 0005, normal row locks, revisions, socket saves, and reset.
- Conversation-driven offers, automatic ready completion, bounded friendship tools, decline ownership, expiry, delivery reclamation, resident poses, labels, and local history cache are implemented.
- Root gates pass. Unit verification: 150 server tests and 120 client tests passed. Real Postgres integration: two tests passed, including persisted completion friendship.
- Scripted compaction spike and 25-turn live Postgres memory flow pass. Live prompt tokens fall from 4,181 to 2,871 after compaction; turn-two lotus tea preference is recalled.
- Desktop and 390px Playwright: walker pause, chat offer, automatic completion, +1 friendship, abandonment −1, reopened/reloaded history, authenticated reset clearing history, reduced-motion fade, and no page errors or overflow pass.
- Live model-authored herb delivery and greet completion pass: propose-quest, 55 coins, once-only reward.

- Opening an NPC conversation shows a cached assistant greeting without sending an automatic player line. The greeting is stored in that NPC/player thread for later model context.

- Greetings use all 11 affinity levels, room time, weather, active city events, and neighbor need. Revisiting without speaking keeps one unanswered greeting; the Earlier divider renders separately.

- Chat affinity + avatar: the NPC portrait renders a head-and-shoulders crop of the real character glb (single hidden on-demand WebGL canvas, cached per model+color, falls back to an initial). The portrait carries a corner affinity crest (five tiers: Cold, Wary, Getting acquainted, Warm, Close friend) and opens an `affinity-info` popover (tier ladder, level, next-tier distance, tip); a change bumps/dips the crest. A screen-reader-only `<meter>` keeps the numeric value. Each NPC message shows a round mini-avatar. The conversation footer (source label, Continue exploring) was removed; the close button suffices.

- World NPC quest diamond only renders when it has a `!`/`?` glyph. Pause panel has a "What the symbols mean" guide covering the two quest diamonds and the affinity crest.

## Quest reward unlocks

- Neighbors grant permanent cosmetics, vehicles, and pets as quest rewards, gated by friendship tier (`FRIENDSHIP_TIERS`: neutral 0, warm 2, close 4). Catalog of 27 signature unlocks (9 neighbors x 3 tiers) in `packages/shared/src/unlocks`.
- `RewardSchema.unlockId` is optional so legacy quest/completed jsonb rows still parse. `createQuest`/`rewardFor` select the giver's first not-owned, not-promised, tier-allowed unlock.
- Server migration 0007 adds the `players.unlocks` jsonb column. Unlocks persist through save/update/reset, grant idempotently inside the `quest_completions` guard, and reset clears them. `POST /me/equip` validates ownership and slot, writes `equipped`, and pushes the new look to the live room; presence carries `look`.
- Client syncs `unlocks` over the session load, world, and quest-completed paths, mirrors the grant offline, and shows the unlock in the reward popup, journal, and XR HUD.

## Single world room and waiting notice

- The game runs exactly one street room. Capacity stays 20; Colyseus gets `maxClients = 20 + 5` headroom and a `WorldRoom.active` singleton guard so it never auto-locks or spills into a second room. Capacity is enforced in `onAuth` via `admit`, which throws `room_full` before a seat is reserved. A player who already holds a slot (replacement, reload, or a retained disconnect) is always admitted.
- Matchmaking is serialized through a promise chain so two concurrent first joins land in one room. `room_full` maps to HTTP 503 so the client treats it as a soft refusal.
- `GET /realtime/status` returns `{ capacity, players, full, longest }`. `longest` is the connected member with the earliest `joinedAt`; `joinedAt` survives replacement and reconnect, and `stayedMs` is server-computed. The endpoint rejects a present-but-unlisted `Origin` and allows same-origin reads.
- The client enters a `waiting` connection state on `room_full`, polls `/realtime/status`, and retries every 10s with no backoff. `WaitingNotice` shows a `role="status"` card on the title screen and in the HUD with the longest stroller's name and a locally ticking duration (minutes, then `h min`). Solo play continues while waiting; `welcome` clears the notice.

## Plain player bodies, equip anywhere, 3D wardrobe

- The baked tourist avatar is retired. `scripts/blender/build-player-bases.py` builds plain `player-man` (Kenney `character-male-e`) and `player-woman` (`character-female-e`) bodies, splitting the body-mesh shirt and trouser faces into flat `outfit-top`/`outfit-bottom` materials while skin, hair, shoes, and the face keep `colormap`. Animations (idle, walk, sprint, sit, …) are preserved. `prepare:assets` ships `people/player-man.glb` and `people/player-woman.glb`; the `player-tourist` runtime model is gone, its source kept.
- `AvatarBody = 'man' | 'woman'` lives in `shared/unlocks/avatar.ts` with `bodyModel(body)`. The body is identity: it defaults to `man`, is chosen on the title screen, can be changed from the wardrobe, and survives a new journey. It is carried on `GuestPlayer`, `PresencePlayer`, and the Colyseus `PresenceState`, falling back to `man` for older clients.
- Outfit palettes re-key to `outfit-top`/`outfit-bottom`; áo dài is a pink top over cream trousers. The remote-player `color` tint only recolours clothing materials (`CLOTHING`), never skin or face. Dead baked-prop hiding (`HIDDEN_BY_SLOT`, `hideReplacedMeshes`) is removed.
- Server: `players.body` column (migration 0008, default `man`), `db.updateProfile`, `POST /me/profile` accepts `{ name, body }`, `realtime.updateProfile` pushes the live presence, and `/me/reset` keeps the body.
- The wardrobe is a 3D fitting room under one shared drei `View` canvas (`widgets/hud/wardrobe/`): an auto-rotating avatar stage with the equipped ride and pet, slot tabs, and spinning per-item cards with equip/unequip toggles. Locked cards load no 3D. Equip works anywhere — the key `I` opens it while walking, riding, paused, or in the hub, and the reward popup gains "Wear now".
- The two bicycle unlocks dropped their missing `vehicles/bicycle*` GLB paths so `PersonalVehicle` renders the procedural `Bike`.
- Gates: `bun run check`, `check:types`, `build`, and `test` pass (server 186 passed / 2 skipped, client 128 passed).
