# NPC API

## Voice transcription

`GET /voice/status` returns `{ available }`. Set
`META_TRANSCRIBE_MODEL=muse-voice-transcribe-1.0` to enable voice with the server's
Meta credential. `META_TRANSCRIBE_API_KEY` may override that credential.
`META_TRANSCRIBE_URL` defaults independently of the chat endpoint to
`https://api.meta.ai/v1/asr/transcribe`; non-local endpoints require HTTPS.

`POST /voice/transcribe` requires the existing authenticated session. It accepts
multipart `audio` (mono PCM16 WAV, 24 kHz, at most 15 seconds) and `locale`
(`en` or `vi`), with a 1 MiB request limit. It returns `{ text }`, capped at
500 characters. Invalid audio returns 400, missing authentication 401,
oversized requests 413, throttling 429, and unavailable/provider/budget
failures 503. Other routes retain the 16 KiB request limit.

The server sends multipart JSON settings and WAV audio to Meta with a 15-second
timeout. Spend uses the existing conservative reservation and settles by audio
duration at $0.18 per hour, with zero chat tokens. Recordings are transient.
The browser shows a reactive waveform while listening. Cancel discards the
recording and preserves typed text; Send stops capture, converts the recording
to WAV, and sends non-empty transcripts through the existing conversation turn.
Capture stops at 15 seconds and waits for Send or Cancel. Conversation changes,
pause, and restart cancel stale work; text input remains available.

Original recordings can be replayed beside the player's sent transcript during
the current page session. The client holds at most twenty object URLs and
follows server-confirmed message IDs. Reset and eviction revoke recordings;
audio is excluded from persisted history and is unavailable after reload.

`bun scripts/spike-transcribe.ts <english.wav> <vietnamese.wav>` verifies the
upstream contract using the server environment and writes results under
`/tmp/saigon-quest-evidence/`. Synthetic speech fixtures establish the upstream
contract; microphone behavior requires the browser check.

The Node + Hono API runs Mastra NPC agents against an OpenAI-compatible chat-completions endpoint. The default is Meta Muse Spark (`muse-spark-1.3-contributor` at `https://api.meta.ai/v1/chat/completions`); `META_MODEL` and `META_API_URL` override both. `META_MUSE_API_KEY` is the server credential (`META_API_KEY` is an alias). Credentials never enter the browser build. Each model call has a 15-second limit; the client waits up to 40 seconds for a turn.

## Interaction

`POST /npc/:npcId/interact` authenticates a Better Auth bearer session and accepts:

```json
{
  "message": "Any errands?",
  "intent": "chat",
  "locale": "en",
  "events": [],
  "worldContext": {
    "playerLocation": "market",
    "nearbyNpcs": ["hoa"],
    "timeOfDay": "morning"
  }
}
```

Intents are `chat` and `greet`; `help` and `check` are accepted as `chat`. `greet` opens a conversation with an empty message. `locale` is `en` or `vi`. Events are `visit`, `talk`, `deliver`, `purchase`, and `spend`. Request bodies do not select player identity.

The response includes `npcId`, `revision`, `reply`, `source` (`live` or `fallback`), `degraded`, `cached`, `world`, `quests`, `questEvents`, `friendship`, `friendshipEvents`, `party`, and `toolCalls`. A quest event is `offered`, `progress`, `completed`, or `incomplete`; it carries its canonical quest and reward. A friendship event carries the NPC, a ±1 delta, the new level, and a reason (`chat`, `completed`, `abandoned`, `expired`, `declined`). A quest includes giver, title, description, steps, scope, server-generated id and reward, progress flags, status, and creation time. Party quests also contain `party: { id, memberIds }`, with original recipient ids. Each recipient stores its own progress.

`GET /npc/:npcId/history?limit=30` returns the caller’s user/assistant text for that NPC (limit 1–60).

`GET /me` returns the saved player with `quests[]`, completed quest summaries, world, reputation, friendship, unlocks, body, and an increasing revision. `POST /me/profile` saves `{ name, body }` and pushes it to live presence. `POST /me/equip` equips an owned unlock in its slot. `POST /me/reset` clears progress, unlocks, friendship, and NPC memory while keeping identity, name, and body. Client HTTP and socket apply paths reject stale saves independently of dialogue request identity and party ordering.

## Authority and limits

Agents call `propose-quest`, `drop-quest`, `adjust-friendliness`, `get-context`, and `remember-player-fact`. `QuestService` validates and executes every mutation. Rewards derive from the shared engine, never the model. Delivery requires a held item; purchases require sufficient funds. Events advance active quests; any interaction with the giver completes ready quests and grants rewards once.

The shared schema permits at most three active quests with one to three enum-based steps. Persona allowlists constrain destinations, recipients, items, and gifts. Invalid proposals return specific rejection reasons. When a live reply is missing and the player asked for help, a validated seed quest is offered; seed quests also support offline play.

Each model HTTP request reserves spend before calling the provider and settles reported token usage afterward. Daily spend, per-player/NPC call guards, bounded steps, timeouts, and safe reply validation constrain live generation. Evidence and observed token counts belong in `docs/final-evidence.md`.

## Shared city

The world room’s city snapshot contains a revision, all NPC placements (`locationId`, `anchorId`, `position`), up to two active events, per-NPC needs, clear/rain weather, and the last twelve headlines. City events carry an enum kind, location, title, description, start time, and expiry. Room state patches synchronize the snapshot; `city-headline` messages deliver new headlines immediately.

The City Director drafts a day with a single `plan-beat` tool: each call schedules a batch of validated `start-event`, `end-event`, `move-npc`, `set-npc-need`, `post-headline`, and `set-weather` actions at a time offset. It runs once per UTC day while the room is occupied, reading local news (VnExpress `thoi-su` by default) and the city snapshot, bounded by a daily director count and the shared model-spend guard. News may lightly theme an event but is never shown verbatim. NPC `get-context` reads this room snapshot so quest proposals can respond to city needs.

## Abandon and party rewards

`POST /me/quests/:questId/abandon` removes the authenticated player’s quest copy, reclaims its remaining supplied delivery items, lowers friendship with the giver by one, and returns the updated player. Abandoned recipients no longer block readiness.

Party proposals validate and assign the same quest id to every current member. When a member interacts with the giver, every original recipient still holding the quest must be ready; ready recipients receive rewards once through completion records in a transaction. `quest-completed` messages update rewards immediately for every member.
