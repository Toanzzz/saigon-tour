# NPC model service

The server uses `muse-spark-1.3-contributor` at
`https://api.meta.ai/v1/chat/completions`. `META_MUSE_API_KEY` is the primary server-only
credential; `META_API_KEY` is an accepted alias. `META_MODEL` and `META_API_URL` override the
model and full completion URL for a compatible endpoint. No credential enters Vite's client
configuration.

The request uses a `developer` persona message, a serialized game-state/user message,
`reasoning_effort: "minimal"`, `max_completion_tokens: 800`, and
`response_format: { "type": "json_object" }`. Temperature remains at the provider default.
The provider's private reasoning tokens share the completion-token allowance.

`/npc/chat` returns validated dialogue and a quest-offer decision. `/npc/quest` returns a
validated, reachable herb-delivery quest and the model's chosen wording and reward.
`/npc/verify` checks recorded world events against the issued quest; it cannot grant a reward
on the strength of a player's textual claim. Quest generation is constrained to the demo
route. Source fields explicitly distinguish live model output from deterministic fallback.

## Guardrails

- 16 KiB request bodies; bounded histories, item counts, currency, IDs and text.
- 8-second upstream timeout and a maximum of 800 completion tokens.
- 24 upstream calls per session per hour, minimum 400 ms between calls.
- 500 calls per server process and a conservative reserved-spend ceiling of $5 per process
  (`META_SPEND_LIMIT_USD`), reserving $0.03 before each upstream call, including failed calls.
- Bounded five-minute dialogue cache and one-hour issued-quest cache.
- Unreachable, malformed, unsafe, over-budget, or unconfigured model requests use a playable
  fallback. UI labels identify fallback dialogue.

The reserve covers a 20,000-input-token / 800-output-token request at the documented Muse
Spark standard rates; the configured contributor model is cheaper. Custom models require
reviewing this reserve. These are application limits, not an account-wide billing cap.
Restarting the service resets them, and each replica has its own limit. The provider dashboard
spend limit has not been inspected or changed. Set the account cap there before public hosting.

This is a single-player session service. World events come from the game client, and are not
an anti-cheat or monetary trust boundary. Client reward application is idempotent by quest ID.

## Verification

- Live chat: HTTP 200, validated JSON, 3.264 seconds, 233 total tokens.
- Live quest through the actual Hono application: HTTP 200, `source: "live"`, validated
  herb-delivery objective and 50-coin/postcard reward, 6.081 seconds.
- Eighteen server tests cover malformed requests/output, unavailable/timeout fallbacks,
  unsafe text, unreachable quests, premature/inflated/duplicate rewards, CORS, body limits,
  cache reuse, session/global call guards, and the spend ceiling.

## Provider references

- Overview: `https://dev.meta.ai/docs/overview`
- Chat wire format: `https://dev.meta.ai/docs/protocols/chat-completions`
- Reasoning budget: `https://dev.meta.ai/docs/reasoning`
- Pricing and rate limits: `https://dev.meta.ai/docs/pricing-rate-limits`
