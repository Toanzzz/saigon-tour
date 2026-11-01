# NPC API

The Node + Hono API runs Mastra NPC agents using the Meta Muse Spark chat-completions endpoint. `META_MUSE_API_KEY` is the server credential (`META_API_KEY` is an alias); `META_MODEL` and `META_API_URL` override the defaults. Credentials never enter the browser build.

## Interaction

`POST /npc/:npcId/interact` authenticates a Better Auth bearer session and accepts:

```json
{
  "message": "Any errands?",
  "intent": "help",
  "events": [],
  "worldContext": {
    "playerLocation": "market",
    "nearbyNpcs": ["hoa"],
    "timeOfDay": "morning"
  }
}
```

Intents are `chat`, `help`, `check`, and `greet`. Events are `visit`, `talk`, `deliver`, `purchase`, and `spend`. Request bodies do not select player identity.

The response includes `npcId`, `revision`, `reply`, `source` (`live` or `fallback`), `degraded`, `cached`, `world`, `quests`, `questEvents`, `party`, and `toolCalls`. A quest event is `offered`, `progress`, `completed`, or `incomplete`; it carries its canonical quest and reward. A quest includes giver, title, description, steps, scope, server-generated id and reward, progress flags, status, and creation time.

`GET /me` returns the saved player with `quests[]`, completed quest summaries, world, reputation, and an increasing revision. Client HTTP and socket apply paths reject stale saves independently of dialogue request identity and party ordering.

## Authority and limits

Agents call `propose-quest`, `check-quests`, `get-context`, and `remember-player-fact`. `QuestService` validates and executes every mutation. Rewards derive from the shared engine, never the model. Delivery requires a held item; purchases require sufficient funds. Events advance active quests and verification grants rewards once.

The shared schema permits at most three active quests with one to three enum-based steps. Persona allowlists constrain destinations, recipients, items, and gifts. Invalid proposals return specific rejection reasons. Explicit help and check remain functional when model output omits a tool; seed quests support fallback and offline play.

Each model HTTP request reserves spend before calling the provider and settles reported token usage afterward. Daily spend, per-player/NPC call guards, bounded steps, timeouts, and safe reply validation constrain live generation. Evidence and observed token counts belong in `docs/final-evidence.md`.
