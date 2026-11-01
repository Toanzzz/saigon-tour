# NPC agent harness

All 29 NPCs have static Mastra agents: nine neighbors and twenty residents. The Node + Hono server owns player state; model text never grants inventory, currency, reputation, quest ids, or rewards. The City Director and ambient barks target the nine neighbors.

## Quest loop

1. The player asks an NPC for help in conversation. The agent proposes a title, description, one to three steps, and a scope.
2. `QuestService` validates entity enums, the giver’s domain, self-delivery, duplicates, party eligibility, the three-quest cap, and friendliness. At −3 or below, offers return `friendliness_too_low`.
3. Accepted quests allocate their delivery items. Visit, talk, delivery, and purchase events advance the next matching step. Party proposals use a shared id with independent participant progress.
4. Every interaction with the giver, including the opening greeting, automatically completes ready quests. Party completion waits for every participant still holding a copy. A transaction grants each reward once through `quest_completions` and increases each rewarded participant’s friendship with the giver by one.
5. Active errands expire lazily after twenty minutes; ready errands never expire. Abandonment, expiry, and declining an unstarted errand reclaim unused supplied items and reduce friendship by one. Abandonment removes only the player’s copy.

Steps are `GO_TO {locationId}`, `TALK_TO {npcId}`, `DELIVER {itemId,npcId}`, and `BUY {marketItemId}`. Domains constrain locations, recipients, items, and gifts. Rewards depend on step count and travel distance, with currency capped at 100 and reputation at 1–2.

## Tools and memory

Every agent has `proposeQuest`, `dropQuest`, `adjustFriendliness`, `getContext`, and `rememberPlayerFact`. Tools use authenticated identity. Only the giver can decline its own active errand before progress. Context includes the shared city, party, current errands, completed errands for this turn, remembered facts, and friendliness with tone guidance. Resident personas include their role, local knowledge, home, and shared safety rules.

Friendship lives on the locked player row as JSON. Levels range from −5 to +5 and start from authored presets. The model may request one ±1 adjustment per turn, subject to a three-minute per-player/NPC cooldown. Chat can raise friendship only to +3; completed quests can reach +5. Socket saves carry friendship with the normal revision.

Postgres stores every server conversation under `npcId:playerId`, including greetings and fallback replies. `GET /npc/:npcId/history?limit=30` authenticates the caller and returns only user/assistant text parts from that caller’s thread. The client persists history in TanStack Query, includes offline turns locally, and clears it on journey reset or sign-out. Tool payloads and system context are excluded from the history response.

Mastra Observational Memory compacts each thread using the same explicit metered model as the NPC. The Observer threshold is 3,000 message tokens; the Reflector threshold is 2,000 observation tokens. Both have 600 output-token limits and minimal reasoning. Async buffering keeps compaction off the ordinary request path. Hooks log token usage. Observations preserve promises, preferences, gifts, errands, and tone. A bounded context wrapper limits raw messages to forty because OM ignores `lastMessages`. Twelve durable facts per NPC/player remain available alongside observations. Reset waits for memory work, clears OM records explicitly, and deletes all 29 threads.

## Reliability

Deprecated `help` and `check` intent values normalize to chat. Ready completion runs deterministically. A missing live reply permits a validated seed offer only when the player’s message asks for help; a live reply is preserved. The browser offline mirror expires stale errands, completes solo ready errands, applies friendship, and offers seeds through the same shared rules. Party rewards require server authority.

The harness allows three model steps, sanitizes replies, enforces timeouts and call limits, and reserves spend before every provider request, including Observer and Reflector requests. Unknown usage retains the reservation ceiling. Secrets stay in server environment variables. Greetings cache by NPC, time, locale, model/persona hash, and friendliness band; prewarm and barks cover neighbors only.

## Journal and party errands

The journal lists steps, remaining active lifetime, tracking, and abandonment. Conversations provide Give controls for carried deliveries; errands are requested in chat and completion happens on return. Resident walkers publish live poses, pause near the player or during dialogue, and share quest labels and friendship feedback with neighbors.

Party assignment validates every recipient before mutation. Original recipient ownership survives party changes. Readiness checks only participants retaining their copy; abandoning or resetting a journey removes that participant’s copy. Socket updates synchronize saves and once-only rewards.

## City Director

Each occupied street room owns one `CityWorld` and one `CityDirector`. The scheduler wakes the director for world events and schedules, with at most one turn per ninety seconds. Empty rooms generate no model calls. Director context contains the city snapshot and the last twelve headlines; it has no conversation-memory thread.

The agent can start or end a city event, move an NPC to an authored location anchor, set an NPC’s need, post a safe headline, and choose clear or rainy weather. `CityWorld` validates enum values, authored anchors, safe text, event lifetime, and the two-active-event cap. NPCs read these events and their own need when shaping quest proposals; ordinary quest-domain validation still applies.

`DIRECTOR_MODE` selects `live`, `scripted`, or `off`. Scripted beats and live-failure fallback use the same action validator. `DIRECTOR_DAILY_LIMIT` bounds daily live director turns in `model_spend`; each model HTTP step also reserves spend through `meteredFetch`.

Colyseus schema patches carry NPC placements, city events, weather, and snapshot context to every player in the room. Headlines also travel as `city-headline` messages. The client interpolates NPCs toward room placements, uses them for proximity, shows event markers and City pulse, and represents rain with tint and fog.

## Acceptance

Run `bun run check`, `bun run check:types`, `bun run build`, and `bun run test`. Browser QA drives help, generic quest steps, return verification, reward, reload, and reset on desktop and 390px mobile. Live schema acceptance can be repeated with:

```sh
bun --env-file=apps/server/.env apps/server/scripts/quest-model-spike.ts
```

The spike submits an invalid self-delivery through the real discriminated-union tool, then requires a corrected proposal within three steps. It meters provider calls and writes safe evidence under `/tmp/saigon-quest-evidence`.
