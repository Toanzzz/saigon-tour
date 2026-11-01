# NPC agent harness

Nine Mastra NPC agents write short errands through validated tools. The Node + Hono server owns player state; model text never grants inventory, currency, reputation, quest ids, or rewards.

## Quest loop

1. The player asks any neighbor “Any errands?”. The agent proposes a title, description, one to three steps, and a scope.
2. `QuestService` validates entity enums, the giver’s persona domain, self-delivery, duplicates, party eligibility, and the three-active-quest cap. Rejections carry a specific reason the agent can correct.
3. An accepted quest is active immediately. Delivery items come from the giver. New accepted visit, talk, delivery, and purchase events advance the next matching step.
4. The player returns to the giver and chooses “I’m back”. Every ready quest from that giver completes, with rewards recorded once through `quest_completions`.

Step primitives are `GO_TO {locationId}`, `TALK_TO {npcId}`, `DELIVER {itemId,npcId}`, and `BUY {marketItemId}`. Locations, recipients, items, home anchors, and gift choices are constrained by `packages/shared/src/quest/domains.ts`. Rewards are deterministic: a base, step count, and distance from the giver’s home; currency is clamped to 100 and reputation to 1–2.

## Tools and memory

Every NPC has `propose-quest`, `check-quests`, `get-context`, and `remember-player-fact`. All use authenticated player identity. The speaker must match the proposed giver. `get-context` returns the player, active quests, and the room city snapshot, including current events and the speaker’s need. Persona prompts include domain limits and example quest specs.

Conversation history is scoped to `npcId:playerId`; remembered facts are scoped to the same pair and limited to twelve. Postgres stores journeys, completions, facts, model spend, and persistent Mastra memory. Reset clears the journey and NPC memory while keeping identity.

## Reliability

Help and check intents run deterministic validation even if the model omits the tool. If live generation fails or its budget is exhausted, help chooses a validated seed quest. Seed specs use the same schema and engine as live proposals and browser offline play.

The harness allows three model steps, enforces request timeouts and call limits, sanitizes replies, and reserves model spend before every provider request. Failed or unknown-usage calls retain their reservation ceiling. Secrets stay in the server environment.

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
