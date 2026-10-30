# Saigon Tour — NPC Agent Harness Integration

## Goal

Add multiple long-lived, memory-equipped AI NPCs to Saigon Tour using **Mastra** in the
existing Bun/TypeScript backend.

Each NPC will:

- Have a stable persona and scoped world knowledge
- Remember important interactions with the player
- Decide when to offer, verify, complete, or refuse quests
- Call validated backend tools instead of directly mutating game state
- Degrade gracefully if the Meta Model API is unavailable

Mastra agents use an LLM plus tools to pursue open-ended goals, retain conversation history
when memory is configured, and can return structured responses for the game UI. [18]

---

## Architecture

```text
Game Client
   |
   | POST /npc/:npcId/interact
   v
Bun Backend
   ├─ Game State Service (authoritative)
   │    ├─ Player
   │    ├─ Quests
   │    ├─ Currency / inventory
   │    └─ World entities
   │
   ├─ Mastra NPC Harness
   │    ├─ NPC Agents
   │    ├─ NPC Memory
   │    ├─ Tools
   │    └─ Quest workflows
   │
   └─ Meta Model API
```

### Core rule

The AI NPC may **propose** actions.

The backend game service must **validate and execute** them.

Never let the model directly change quest state, grant currency, move the player, or modify
inventory.

---

## Install dependencies

From the backend repository root:

```bash
bun add @mastra/core zod
```

Mastra tools must be created with `createTool()` and must define `id`, `description`,
`inputSchema`, and `execute()`. Plain object tool definitions will not execute. [17]

Create or update `.env`:

```bash
# Never expose this to the game client
META_API_KEY=your_meta_model_api_key

# Use whichever env var your Meta-compatible provider integration requires
OPENAI_API_KEY=your_key
```

Do not embed API keys in the Unity/Web client. All model calls must pass through the backend. [17]

---

## Recommended folder structure

```text
src/
  game/
    state.ts
    quests.ts
    rewards.ts
    validation.ts

  npc/
    personas/
      market-vendor.ts
      xe-om-driver.ts
      cafe-owner.ts

    memory/
      npc-memory.ts

    tools/
      offer-quest.ts
      check-quest.ts
      complete-quest.ts
      remember-player-fact.ts
      get-world-context.ts

    agents/
      market-vendor-agent.ts
      xe-om-driver-agent.ts
      cafe-owner-agent.ts

    mastra.ts

  routes/
    npc.ts
```

---

## 1. Define the NPC persona

Create `src/npc/personas/market-vendor.ts`:

```ts
export const marketVendorPersona = `
You are Cô Hoa, a friendly street-food vendor near Bến Thành Market.

Personality:
- Warm, practical, observant, and slightly teasing
- Speaks simple, natural Vietnamese-accented English
- Cares about local suppliers, regular customers, and fair prices

Knowledge scope:
- You know the market, nearby food stalls, local suppliers, and regular customers.
- You do not know confidential information about other NPCs unless it is public knowledge.
- You do not know the player's private inventory unless the player mentions it.

Behavior rules:
- Stay in character at all times.
- Keep dialogue short: 1-3 sentences unless giving quest details.
- Offer a quest only when it fits the conversation and your role.
- Never invent quest rewards; use the offer_quest tool.
- If asked about something outside Saigon Tour, gently redirect to city life.
- If a tool fails, apologize briefly and offer a normal in-character response.
`;
```

---

## 2. Create NPC tools

Tools are the only way an NPC can affect the game.

Create `src/npc/tools/offer-quest.ts`:

```ts
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const offerQuestTool = createTool({
  id: "offer-quest",
  description: "Offer a valid quest to the player. The backend validates and records it.",
  inputSchema: z.object({
    questTemplateId: z.string(),
    playerMessage: z.string(),
  }),
  outputSchema: z.object({
    accepted: z.boolean(),
    reason: z.string(),
    quest: z
      .object({
        id: z.string(),
        title: z.string(),
        description: z.string(),
        objectiveType: z.string(),
        target: z.string(),
        rewardCurrency: z.number(),
      })
      .optional(),
  }),
  execute: async ({ questTemplateId, playerMessage }) => {
    const result = await gameService.offerQuest({
      questTemplateId,
      playerMessage,
    });

    return result;
  },
});
```

Create `src/npc/tools/check-quest.ts`:

```ts
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const checkQuestTool = createTool({
  id: "check-quest",
  description: "Check whether a player's active quest objective has been completed.",
  inputSchema: z.object({
    questId: z.string(),
  }),
  outputSchema: z.object({
    questId: z.string(),
    status: z.enum(["active", "completed", "failed", "not_found"]),
    rewardGranted: z.boolean(),
    message: z.string(),
  }),
  execute: async ({ questId }) => {
    return await gameService.checkQuest({ questId });
  },
});
```

Create `src/npc/tools/remember-player-fact.ts`:

```ts
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const rememberPlayerFactTool = createTool({
  id: "remember-player-fact",
  description:
    "Store one important, durable fact about the player for future conversations.",
  inputSchema: z.object({
    fact: z.string().max(240),
    importance: z.enum(["low", "medium", "high"]),
  }),
  outputSchema: z.object({
    stored: z.boolean(),
  }),
  execute: async ({ fact, importance }) => {
    await npcMemoryService.rememberPlayerFact({
      fact,
      importance,
    });

    return { stored: true };
  },
});
```

---

## 3. Add NPC memory

Mastra agents can retain conversation history when memory is configured. [18]

Create `src/npc/memory/npc-memory.ts`:

```ts
import { Memory } from "@mastra/memory";

export const npcMemory = new Memory({
  options: {
    lastMessages: 10,
    semanticRecall: {
      topK: 5,
      messageRange: 2,
    },
  },
});
```

For the hackathon, use SQLite, LibSQL, or JSON file storage. Keep memory scoped by:

```text
npcId + playerId
```

Example memory record:

```json
{
  "npcId": "market-vendor",
  "playerId": "player_123",
  "fact": "Player helped find the missing delivery bag.",
  "importance": "high",
  "createdAt": "2026-10-30T12:00:00Z"
}
```

---

## 4. Create an NPC agent

Create `src/npc/agents/market-vendor-agent.ts`:

```ts
import { Agent } from "@mastra/core/agent";

import { marketVendorPersona } from "../personas/market-vendor.ts";
import { offerQuestTool } from "../tools/offer-quest.ts";
import { checkQuestTool } from "../tools/check-quest.ts";
import { rememberPlayerFactTool } from "../tools/remember-player-fact.ts";
import { getWorldContextTool } from "../tools/get-world-context.ts";

export const marketVendorAgent = new Agent({
  id: "market-vendor",
  name: "Cô Hoa",
  instructions: marketVendorPersona,
  model: "openai/gpt-5-mini", // replace with the configured Meta-compatible model ID
  memory: npcMemory,
  tools: {
    offerQuestTool,
    checkQuestTool,
    rememberPlayerFactTool,
    getWorldContextTool,
  },
});
```

Mastra expects the model in `provider/model` format, and agents are registered through a
Mastra instance so they can access shared services such as storage and logging. [17][18]

---

## 5. Register agents

Create `src/npc/mastra.ts`:

```ts
import { Mastra } from "@mastra/core";

import { marketVendorAgent } from "./agents/market-vendor-agent.ts";
import { xeOmDriverAgent } from "./agents/xe-om-driver-agent.ts";
import { cafeOwnerAgent } from "./agents/cafe-owner-agent.ts";

export const mastra = new Mastra({
  agents: {
    marketVendorAgent,
    xeOmDriverAgent,
    cafeOwnerAgent,
  },
});
```

Retrieve agents through the Mastra instance rather than importing them directly:

```ts
const agent = mastra.getAgentById("market-vendor");
```

This ensures the agent has access to shared instance-level storage, logging, and the agent
registry. [18]

---

## 6. Create the interaction API

Create `src/routes/npc.ts`:

```ts
import { Hono } from "hono";
import { z } from "zod";

import { mastra } from "../npc/mastra.ts";
import { gameService } from "../game/state.ts";

export const npcRoutes = new Hono();

const InteractSchema = z.object({
  playerId: z.string(),
  message: z.string().min(1).max(1000),
  worldContext: z.object({
    playerLocation: z.string(),
    nearbyNpcs: z.array(z.string()).default([]),
    activeQuestIds: z.array(z.string()).default([]),
    timeOfDay: z.enum(["morning", "afternoon", "evening", "night"]),
  }),
});

npcRoutes.post("/npc/:npcId/interact", async (c) => {
  const npcId = c.req.param("npcId");

  const parsed = InteractSchema.safeParse(await c.req.json());

  if (!parsed.success) {
    return c.json({ error: "Invalid request" }, 400);
  }

  const { playerId, message, worldContext } = parsed.data;

  const agent = mastra.getAgentById(npcId);

  if (!agent) {
    return c.json({ error: "Unknown NPC" }, 404);
  }

  try {
    const response = await agent.generate(message, {
      memory: {
        resource: playerId,
        thread: `${npcId}:${playerId}`,
      },
      context: [
        {
          role: "system",
          content: `
Current world context:
Player location: ${worldContext.playerLocation}
Nearby NPCs: ${worldContext.nearbyNpcs.join(", ") || "none"}
Active quests: ${worldContext.activeQuestIds.join(", ") || "none"}
Time of day: ${worldContext.timeOfDay}
          `,
        },
      ],
    });

    return c.json({
      npcId,
      reply: response.text,
      toolCalls: response.toolCalls,
      toolResults: response.toolResults,
    });
  } catch (error) {
    console.error("NPC agent failed", error);

    return c.json({
      npcId,
      reply: getFallbackLine(npcId),
      degraded: true,
    });
  }
});

function getFallbackLine(npcId: string) {
  const fallbacks: Record<string, string> = {
    "market-vendor": "Ah, the market is busy today. Come back in a moment, okay?",
    "xe-om-driver": "Where do you want to go? I know a good route.",
    "cafe-owner": "Sit down, relax. The city can wait a few minutes.",
  };

  return fallbacks[npcId] ?? "Sorry, I am a little busy right now.";
}
```

Mastra supports `.generate()` for complete responses and `.stream()` for incremental output;
the response includes text, tool calls, tool results, steps, and token usage. [18]

---

## 7. Client contract

The game client sends:

```json
{
  "playerId": "player_123",
  "message": "Do you need help with anything?",
  "worldContext": {
    "playerLocation": "ben_thanh_market",
    "nearbyNpcs": ["cafe-owner"],
    "activeQuestIds": [],
    "timeOfDay": "afternoon"
  }
}
```

The backend responds:

```json
{
  "npcId": "market-vendor",
  "reply": "Actually, yes. My supplier has not arrived. Can you check the east entrance?",
  "toolCalls": [],
  "toolResults": []
}
```

If the agent calls `offer-quest`, the backend should also return:

```json
{
  "questCreated": {
    "id": "find_supplier",
    "title": "Find the Missing Supplier",
    "description": "Check the east entrance for Cô Hoa's supplier.",
    "objectiveType": "reach_location",
    "target": "market_east_entrance",
    "rewardCurrency": 50
  }
}
```

---

## 8. Quest loop

Use this sequence for every quest:

1. Player talks to NPC.
2. NPC agent decides whether to offer a quest.
3. Agent calls `offer-quest`.
4. Backend validates the quest template and creates a quest.
5. Client displays the quest in the quest log.
6. Player completes the objective in the world.
7. Game emits a quest event.
8. Client calls `POST /npc/:npcId/interact` or a dedicated quest endpoint.
9. Agent calls `check-quest`.
10. Backend verifies the objective deterministically.
11. Backend grants the reward only after validation.
12. NPC stores a memory note about the outcome.

Quest state must be authoritative in the backend. The model should never be the source of
truth for whether a quest is complete.

---

## 9. Background NPC life

Do not run every NPC continuously.

Use an event scheduler:

```ts
setInterval(() => {
  scheduler.tick();
}, 30_000);
```

On each tick, wake an NPC only if:

- The player is nearby
- The NPC has an active quest deadline
- A world event affects the NPC
- The NPC has a scheduled behavior, such as moving between locations
- Enough time has passed since its last autonomous update

Each NPC wake should be cheap and bounded:

```ts
await agent.generate(`
You are waking up for a brief autonomous update.
Decide whether you need to speak, move, remember something, or do nothing.
Do not start a new conversation unless appropriate.
`);
```

For the demo, limit autonomous updates to 3–5 NPCs and avoid model calls during combat,
transport riding, or loading.

---

## 10. Reliability requirements

Implement these before adding more NPCs:

- Request timeout: 8–12 seconds
- One retry maximum
- Deterministic fallback dialogue per NPC
- Cached or pre-generated demo responses
- Structured output validation with Zod
- Rate limiting per player and per NPC
- Dev-only request/response logging
- Cost tracking for Meta Model API usage

If the model is unavailable, the game must remain playable with canned in-character lines. [17]

---

## 11. Demo-safe NPC set

Start with these four:

| NPC | Role | Agent behavior |
|---|---|---|
| Cô Hoa | Market vendor | Offers fetch/delivery quests; remembers player helpfulness |
| Minh | Xe ôm driver | Recommends destinations; reacts to reputation |
| An | Café owner | Social hub; shares rumors and introduces other NPCs |
| Bảo | Cyclo driver | Slow scenic transport; personal stories and optional side quests |

Each NPC should have its own persona file, agent definition, and restricted tool access.

---

## 12. Acceptance checklist

- [x] Bun backend can start with Mastra installed
- [x] Meta Model API key is stored only in backend environment variables
- [x] At least one NPC can hold a multi-turn conversation
- [x] NPC memory persists during the play session
- [x] NPC can offer a structured quest through a validated tool
- [x] Quest completion is verified by backend game logic
- [x] Rewards are granted only by the backend
- [x] Invalid or unsafe model output is rejected
- [x] Model timeout or API failure produces a fallback line
- [x] At least three NPCs use the same harness with different personas
- [ ] Background NPC updates are event-driven, not per-frame
Evidence: `apps/server/test/harness.spec.ts`, `persistence.spec.ts`, and `artifacts/pass-persistence/`; background room scheduler validation is covered by `apps/server/test/realtime.spec.ts` and `artifacts/pass-multiplayer/flow.json`; parties remain for the co-op pass.
