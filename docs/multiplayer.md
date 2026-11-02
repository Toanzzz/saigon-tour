# Shared neighborhood

The API runs as one replica. Realtime uses Colyseus (`@colyseus/core` 0.18.23, `ws-transport` 0.18.4, `schema` 5.0.43, `sdk` 0.18.9) inside the Hono/Node process. The game runs exactly one public `world` street room for up to 20 players. Rooms, parties, connections, and rate limits live in the API process (in-memory matchmaking driver and presence); guest journeys and model spend live in Postgres. A restart ends the live room session and keeps saved progress.

## Connection

Matchmaking is a Hono route, `POST /matchmake/:method/world`, so the API's CORS allowlist and body limit apply; Colyseus's own permissive CORS is not exposed. Requests and room socket upgrades from origins outside `CORS_ORIGINS` get 403. The room's `static onAuth` verifies the Better Auth bearer session (`client.auth.token`) before a seat is reserved. Room sockets (`/<processId>/<roomId>`) share the HTTP server through `WebSocketTransport.attachToServer`. Each player has one active session; a newer join closes the old one with 4002. The process accepts up to 400 clients. Messages are capped at 4 KB. Rule violations close with 4008 (`rate_limit`, `invalid_message`, `out_of_bounds`).

Matchmaking runs through one serialized chain, and a `WorldRoom.active` guard keeps a second room from opening; Colyseus `maxClients` is 25 so it never auto-locks. Capacity is enforced in `onAuth`: a 21st player is refused with `room_full` (HTTP 503) before a seat is reserved, while a player who already holds a slot (replacement, reload, retained disconnect) is always admitted. `GET /realtime/status` returns `{ capacity, players, full, longest }`, where `longest` is the member with the earliest `joinedAt`. A refused client enters the `waiting` state, shows a waiting notice on the title screen and HUD with the longest stroller’s name and stay, retries every 10 seconds, and keeps solo play available.

Clients send position and heading at 10 Hz; the server allows 15 state messages per second for timer jitter. Positions are cosmetic, bounded world coordinates; they do not authorize rewards. Presence is Colyseus room state (`WorldRoomState.players`), patched to clients and interpolated 150 ms behind. Dropped clients may reconnect into their seat for 60 seconds (`allowReconnection`); the SDK retries automatically, then the browser rejoins with backoff capped at ten seconds.

Visit, spend, and talk events travel over the live socket. Delivery stays on authenticated NPC interactions. A sequence acknowledges each socket event batch; the browser replays outstanding local events over the server save. Offline NPC fallback remains available when the API cannot be reached.

## Presence

The people control and `P` show the current room and neighbors. `Q` opens fixed emotes and phrases while movement remains available. There is no typed public chat. NPC room lines have no tools and cannot grant quests or rewards. An event scheduler wakes nearby NPCs, with per-NPC cooldowns and a room budget. The database daily model budget and NPC bark count limit all live generations; authored fallback lines keep the room active after the limits.

Remote tourists interpolate snapshots with a 150 ms delay. The client draws the nearest eight within 45 units, or six on mobile. XR shows world presence without party controls.

## Shared city

The room owns city events, NPC placements and needs, weather, and twelve recent headlines. Colyseus schema patches synchronize them to all room members; `city-headline` messages announce new headlines. NPC movement uses authored anchors and interpolated client positions. Interaction range and NPC speech follow synchronized positions.

The director runs only with players present, at most one draft per UTC day; the drafted beats then play out over the day. `DIRECTOR_MODE=scripted` provides a deterministic demo day plan; `off` disables the director. Live failures or exhausted budgets use the scripted day plan through the same validator. At most two events are active, each with an expiry. City state ends with the room; player quest progress stays in Postgres.

## Local operation

`bun run dev` starts Postgres before the client and API. Compose binds Postgres to `127.0.0.1:58002`; client and API use 58000 and 58001. `docker compose --profile api up -d --build` runs the API image with migrations applied at startup. `DATABASE_URL` is required in production.

Identity is Better Auth. Starting the game signs in anonymously; the session token persists in the TanStack Query cache (browser local storage) and is sent as a bearer credential. Players can rename themselves or roll a random name. Meta login (Facebook Login) links the anonymous identity: a new Meta account inherits the guest save, and an account that already has a save keeps it. Reset keeps the identity, name, and body while clearing saved progress, unlocks, friendship, and NPC memory. Anonymous players unseen for 30 days are removed by the startup/daily sweep; Meta accounts are kept.

## Parties and quests

The People panel invites a connected neighbor within eight units. Invites expire after 30 seconds. A party holds two to four guests; every member can invite, accept, decline, or leave. Acceptance checks room, proximity, and available space again. Invitations remain accessible while a modal or city hub is open.

Quests are authored by NPC agents and saved per player. Party snapshots contain membership and invitations. A party speaker can receive an agent-authored `scope: party` quest. Every member receives the same server-generated quest id and spec, with their own progress and supplied delivery items. All recipients must pass proposal validation, including the three-quest cap. The quest records the party id and original member ids; it does not depend on a later party snapshot.

Each recipient follows their own steps. Any interaction with the giver grants the reward only when every recipient still holding that quest is ready. Completion runs in a transaction over sorted player ids and uses a unique completion record per player and quest. Every rewarded member receives a `quest-completed` push. A repeated check grants nothing. Abandoning removes that player’s copy and reclaims remaining supplied delivery items; abandoned copies are excluded from readiness checks. Party membership changes do not transfer or erase saved quest ownership.

Save snapshots carry an increasing database revision. The client uses it to reject stale HTTP/socket saves, while party snapshot updates have their own ordering fence. Quest rewards have a separate socket push so a teammate sees the reward immediately.
