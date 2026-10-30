# NPC agent harness

NPCs run on Mastra (`@mastra/core` 1.80, `@mastra/memory` 1.39) inside the Node + Hono API.
The model is Meta `muse-spark-1.3-contributor` at `https://api.meta.ai/v1/chat/completions`,
reached through `@ai-sdk/openai-compatible` 3.0.71 (pinned to the provider spec Mastra 1.80
accepts). `META_MUSE_API_KEY` is the server-only credential; `META_API_KEY` is an alias.
`META_MODEL` and `META_API_URL` override the model and completion URL. No credential, endpoint,
or model ID enters the client build.

## Route

`POST /npc/:npcId/interact` with `{ playerId, message, intent, events, worldContext }`.
`intent` is `chat`, `help` (the player pressed Help), or `check` (the player asked for
verification). `events` are world observations since the last call: `visit`, `talk`,
`deliver`, `spend`. The response carries the reply, `source` (`live`/`fallback`), `degraded`,
the authoritative `world`, the active `quest`, a `questEvent` (`offered`/`completed`/
`incomplete`), and the tool names the agent called.

## Authority

- `GameService` (`apps/server/src/game/state.ts`) owns per-player world state, quests,
  coins, inventory, and reputation. Records expire after an hour of inactivity.
- Agents act only through tools: `offer-quest`, `check-quest`, `remember-player-fact`,
  `get-world-context`. Every tool calls `GameService`, which validates the template, giver,
  and objective. Rewards come from the quest template, never from the model.
- A `deliver` event counts only if the server knows the player is carrying the item.
- Help and Check always run their validated tool, even if the model forgets to call it.
- The client replaces its world with the server's `world` after each turn.

## Agents

| NPC | Persona | Tools |
| --- | --- | --- |
| Cô Hoa | Market vendor; offers and verifies the herb errand | all four |
| Anh Tâm | Xe ôm driver; routes and fares, reacts to reputation | remember, world context |
| Chị Linh | Park volunteer; social hub and rumors | remember, world context |
| Ông Ba | Cyclo driver; river stories | remember |

Memory: Mastra message history (last 10) per `npcId:playerId` thread in an in-memory store,
plus up to 12 remembered facts per NPC and player, injected as context. Both reset when the
server restarts.

`NpcScheduler` wakes queued NPCs on events (player nearby, quest deadline, world event,
schedule), at most three per tick with a two-minute cooldown, and pauses during rides.

## Reliability

- 8 s per model step, 10 s per turn, at most three steps, one retry.
- Deterministic in-character fallback lines per NPC; the browser has its own offline path
  when the API is unreachable.
- Replies with links, markup, or control characters are rejected.
- Rate limits: 24 model turns per player per hour, 400 ms between turns, 12 turns per
  NPC per player, 500 per process, and a reserved-spend ceiling (`META_SPEND_LIMIT_USD`,
  default $5) at $0.03 per turn.
- Token usage and estimated cost are tracked per process and logged outside production.

These are per-process application limits. The provider account spend cap has not been
inspected or changed; set it before public hosting.

## Verification

- 21 server tests cover tool-only quest offers, foreign or unknown templates, verified
  one-time rewards, fabricated delivery events, garbage and hung model responses, unsafe
  text, multi-turn memory, three personas with restricted tools, route validation, rate
  limits, CORS, body limits, and the scheduler.
- Live run through the harness: Cô Hoa called `offer-quest` (herbs added), then
  `check-quest` + `remember-player-fact` after delivery (30 → 80 coins), recalled the
  errand on the next turn; Anh Tâm called `get-world-context`. Four turns, 10,167 input
  and 960 output tokens.

## Provider references

- Chat wire format: `https://dev.meta.ai/docs/protocols/chat-completions`
- Pricing and rate limits: `https://dev.meta.ai/docs/pricing-rate-limits`
