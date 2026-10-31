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

Identity is Better Auth. Starting the game signs in anonymously; the session token lives in browser local storage and is sent as a bearer credential. Players can rename themselves or roll a random name. Meta login (Facebook Login) links the anonymous identity: a new Meta account inherits the guest save, and an account that already has a save keeps it. Reset keeps the identity and name while clearing saved progress and NPC memory. Anonymous players unseen for 30 days are removed by the startup/daily sweep; Meta accounts are kept.

## Parties and the lunch errand

The People panel invites a connected neighbor within eight units. Invites expire after 30 seconds. A party holds two to four guests; every member can invite, accept, decline, or leave. Acceptance checks room, proximity, and available space again. Invitations remain accessible while a modal or city hub is open.

Any member can ask Cô Hoa for the team lunch while every member is eligible. Dishes are assigned in party join order: noodles, broth, baguette, coffee. The assignment belongs to the party rather than the saved inventory. Each assigned member hands their own dish to Chị Linh. Once all remaining assignments are delivered, any member checks with Cô Hoa. Every assigned member receives 40 coins, a photo, and two reputation, once. Leaving removes the assignment; fewer than two assignments cancels the errand. The solo herb errand is independent.

Save snapshots carry an increasing database revision. The client uses it to reject stale HTTP/socket saves, while party snapshot updates have their own ordering fence. Quest rewards have a separate socket push so a teammate sees the reward immediately.
