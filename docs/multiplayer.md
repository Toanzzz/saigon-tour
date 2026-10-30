# Shared neighborhood

The API runs as one replica. It auto-assigns guests to public street rooms with up to 20 players. Rooms, parties, connections, and rate limits live in the API process; guest journeys and model spend live in Postgres. A restart ends the live room session and keeps saved progress.

## Connection

`/ws` accepts only configured `CORS_ORIGINS`. The client sends `hello` with its guest bearer token and protocol `1` within five seconds. Each player has one socket; a newer socket replaces the old. The process accepts up to 400 connections. Messages are capped at 4 KB. The browser reconnects with backoff capped at ten seconds.

Clients send position and heading at 10 Hz. Positions are cosmetic, bounded world coordinates; they do not authorize rewards. Shared snapshots arrive at 10 Hz. Disconnected players retain their room slot for 60 seconds. Empty rooms expire after 60 seconds.

Visit, spend, and talk events travel over the live socket. Delivery stays on authenticated NPC interactions. A sequence acknowledges each socket event batch; the browser replays outstanding local events over the server save. Offline NPC fallback remains available when the API cannot be reached.

## Presence

The people control and `P` show the current room and neighbors. `Q` opens fixed emotes and phrases while movement remains available. There is no typed public chat. NPC room lines have no tools and cannot grant quests or rewards. An event scheduler wakes nearby NPCs, with per-NPC cooldowns and a room budget. The database daily model budget and NPC bark count limit all live generations; authored fallback lines keep the room active after the limits.

Remote tourists interpolate snapshots with a 150 ms delay. The client draws the nearest eight within 45 units, or six on mobile. XR shows world presence without party controls.

## Local operation

`bun run dev` starts Postgres before the client and API. Compose binds Postgres to `127.0.0.1:58002`; client and API use 58000 and 58001. `docker compose --profile api up -d --build` runs the API image with migrations applied at startup. `DATABASE_URL` is required in production.

Guest tokens live in browser local storage; the server stores only SHA-256 hashes. Reset retains the guest name and token while clearing saved progress and NPC memory. Guests unseen for 30 days are removed by the startup/daily sweep.
