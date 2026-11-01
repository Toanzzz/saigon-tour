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

## Runtime and contracts

- Bun 1.4.4, React Three Fiber/Three.js, Rapier, TanStack Query/Store, WebXR; Node/Hono, Mastra, Better Auth, Colyseus, Postgres 18; shared Zod contracts.
- Ports: client 58000, API 58001, Postgres 58002. Ask the user to start/restart local development servers. `bun dev` exits the API on SIGINT/SIGTERM and force-kills it after 3 seconds.
- Cloudflare serves client assets; the API runs separately in a Docker image. Secrets stay server-side.
- Title screen order: title, tagline, blurb, then one 400px form (name + dice → Start exploring/Enter VR → guest/Meta account line), controls hint. Legal links pin to the bottom-left; short landscape moves them bottom-right on a pill. Mobile fade darkens toward the bottom, behind the text. City event labels stay below the UI layer.
- Title screen states: fresh players (no favors, quests, talks, or travel) get the editable name and Start exploring. Returning players with a journey get Welcome back + a summary chip (favors done · tracked quest · location), read-only "Playing as … · Change", Continue journey, and a two-tap Start a new journey (confirm reverts after 4s; second tap saves the name and resets).
- Anonymous guests receive a generated editable name. Facebook login links progress; an existing account save wins. Reset preserves identity; clear saved data drops the persisted query cache.
- Quest rewards use the durable completion ledger. Room state is ephemeral and isolated; player quest progress persists in Postgres.
- Meta: `muse-spark-1.3-contributor` at `https://api.meta.ai/v1/chat/completions`; `META_MUSE_API_KEY` stays server-side.
- No deployment or push performed. Unrelated `.gitignore` edits remain outside quest commits. Escape-key debug logs were removed at user request.

## Verification and limits

- Required gates: `bun run check` → `bun run check:types` → `bun run build` → `bun run test`.
- UI proof: headless Playwright driving actual controls at 1440×900 and 390×844, with deterministic and live model runs.
- Evidence: `docs/final-evidence.md`; ignored captures/reports in `artifacts/` and live usage JSON under `/tmp/saigon-quest-evidence/`.
- Server Vitest uses two workers; this avoids reproduced PGlite initialization timeouts under concurrent browser load without increasing timeouts.
- Physical Quest 3 hardware, zone-specific audio mixing, and Facebook OAuth with production credentials are unverified. The expanded mobile scene exceeds the initial 300k triangle target in dense views.
