# Requirements — Saigon Tour

## Overview

**Saigon Tour** is a 3D exploration game set in a stylized mini-city inspired by Sài Gòn
(Ho Chi Minh City, Vietnam). The player wanders a compact, hand-authored district, rides
the city's public transport — both modern (Metro Line 1, electric bus) and traditional
(xe ôm motorbike taxi, cyclo, bus) — and meets NPCs whose dialogue, quests, and reward
decisions are driven live by Meta's AI models. NPCs behave as goal-directed agents: they
converse naturally, assign context-aware quests, verify completion, and grant rewards.

The project is a submission to the **Meta Global AI Developer Hackathon** (building period
Oct 27 – Nov 4, 2026; submission due Nov 4, 9:00 PM ET). It targets the **"Build for Your
World"** problem statement and the **Best Agentic Use-Case** bonus prize, with Quest 3 VR
support as a differentiator.

### Hackathon-derived constraints (non-negotiable)

- **R0.1** The project MUST incorporate Meta's models through the Meta Model API
  (Muse Spark series for dialogue/agent reasoning; optionally Muse Voice/Transcribe for
  voice, Muse Image/Wonder for asset or texture generation) and/or Meta open-weight models
  (Muse Spark Open, Muse Glimmer). NPC intelligence is the primary integration point.
- **R0.2** The repository MUST be public (open source) by the submission deadline.
- **R0.3** All demoed features MUST be built during the hackathon window and clearly
  attributable as original work.
- **R0.4** There MUST be a polished, self-contained experience that can be captured in a
  **3-minute demo video** (demo = 25% of the judging score). A guaranteed-demoable vertical
  slice takes priority over breadth of features.
- **R0.5** The Meta model usage SHOULD go beyond a basic chatbot integration — NPCs should
  demonstrate autonomy: deciding quests, tracking state, verifying completion, and
  reacting to the world (targets the "Use of Meta AI Tooling" 25% and Best Agentic 
  Use-Case criteria).

## Priority tiers

To protect the demo under an 8-day timeline, requirements are tiered:

- **P0 (Must-have / demo-critical):** desktop 3D city, player movement, at least one
  AI-powered NPC with an agentic quest loop, at least one working transport mode, reward
  feedback. This is the vertical slice that MUST exist for a valid submission.
- **P1 (Should-have):** multiple NPCs, multiple transport modes (modern + traditional),
  quest log / inventory, ambient city life, basic audio.
- **P2 (Stretch / differentiator):** Meta Quest 3 VR mode, voice interaction with NPCs,
  AI-generated textures/assets, day-night cycle.

---

## Requirement 1 — Explorable 3D mini-city (P0)

**User story:** As a player, I want to freely explore a 3D city that evokes Sài Gòn, so
that I feel immersed in the setting and have places to discover.

### Acceptance criteria
1. WHEN the game loads THEN the system SHALL render a navigable 3D environment representing
   a compact Sài Gòn-inspired district (streets, low-rise shophouses, street-food stalls,
   recognizable landmarks such as a Bến Thành-style market, a Notre-Dame-style cathedral,
   and a central park).
2. WHEN the player moves THEN the system SHALL keep the player collider constrained to
   walkable surfaces and prevent passing through solid geometry.
3. WHEN the player approaches an interactive object or NPC THEN the system SHALL show a
   contextual prompt (e.g., "Press E / trigger to talk").
4. The environment SHALL maintain an interactive frame rate on the target desktop hardware
   (≥ 60 FPS desktop target; ≥ 72 FPS when running in Quest 3 VR per Requirement 7).
5. The district SHALL be bounded so the player cannot leave the authored play area
   (invisible walls, water, or natural barriers).

## Requirement 2 — Player movement and camera (P0)

**User story:** As a player, I want responsive movement and camera control so exploration
feels smooth on both desktop and VR.

### Acceptance criteria
1. WHEN the player uses keyboard/mouse (desktop) or controller/hand input (VR) THEN the
   system SHALL move the avatar and orient the camera accordingly.
2. WHEN on desktop THEN the system SHALL support WASD movement, mouse-look, sprint, and
   interact keys.
3. WHEN the player is riding a transport vehicle (Requirement 4) THEN direct walking
   control SHALL be suspended and camera SHALL follow the vehicle.
4. The system SHALL provide a comfort-safe default camera (no forced acceleration that
   induces motion sickness in VR; snap-turn option in VR).

## Requirement 3 — AI-powered NPC agents (P0, core differentiator)

**User story:** As a player, I want to talk to NPCs who respond intelligently and give me
meaningful quests, so the city feels alive and my actions matter.

### Acceptance criteria
1. WHEN the player initiates dialogue with an NPC THEN the system SHALL send the NPC's
   persona, world state, and the player's input to a Meta model via the Meta Model API and
   return a natural-language response in character.
2. Each AI NPC SHALL have a persistent persona (name, role, personality, speaking style,
   knowledge scope) injected into the model context so responses stay consistent.
3. WHEN appropriate in conversation THEN the NPC agent SHALL autonomously decide to offer a
   quest, producing a **structured quest object** (id, title, description, objective type,
   target, reward) via the model, not a hard-coded script.
4. WHEN the player reports progress or the world state changes THEN the NPC agent SHALL
   evaluate whether the quest objective is satisfied and decide to grant, withhold, or
   adjust the reward.
5. The dialogue system SHALL handle model latency gracefully (typing/thinking indicator,
   timeout fallback line) so the game never appears frozen.
6. The system SHALL constrain model output to a safe, in-world scope (system prompt +
   output validation) and reject or sanitize off-topic or unsafe responses.
7. IF the Meta Model API is unreachable THEN the NPC SHALL fall back to a canned in-character
   line and the game SHALL remain playable (demo resilience).
8. Model API keys and secrets SHALL NOT be embedded in client builds; AI calls SHALL be
   routed through a backend/proxy that holds credentials.

## Requirement 4 — Public transport system (P0 for one mode; P1 for the rest)

**User story:** As a player, I want to ride Sài Gòn's public transport — modern and
traditional — so getting around is part of the fun and the cultural flavor.

### Acceptance criteria
1. The system SHALL implement at least one fully rideable transport mode end-to-end for the
   demo (P0). The recommended first mode is the **xe ôm (motorbike taxi)** or **city bus**.
2. WHEN the player boards a transport vehicle at a stop/station THEN the system SHALL
   transition the player into a riding state, move them along a defined route, and set them
   down at the chosen destination stop.
3. The system SHOULD provide, across tiers, both **modern** (Metro Line 1 train, electric
   bus) and **traditional** (xe ôm motorbike taxi, cyclo / xích lô, classic bus) options
   (P1).
4. WHEN the player selects a destination THEN the system SHALL present reachable stops and
   the associated vehicle, and SHALL optionally charge in-game currency / fare.
5. Transport SHALL meaningfully shorten travel between distant quest locations, tying it to
   the gameplay loop rather than being decorative.
6. WHEN riding THEN the system SHALL present a stylized moving view of the city (camera on
   vehicle) rather than a loading screen.

## Requirement 5 — Quest, reward, and progression loop (P0 minimal; P1 full)

**User story:** As a player, I want quests with clear objectives and rewards so I have
goals and a sense of progress.

### Acceptance criteria
1. The system SHALL track active and completed quests in a quest log visible to the player
   (minimal HUD for P0; full log UI for P1).
2. WHEN an NPC agent grants a quest THEN it SHALL appear in the quest log with title,
   description, and objective.
3. WHEN a quest objective is completed and verified (per Requirement 3.4) THEN the system
   SHALL grant the specified reward (currency, item, unlock, or reputation) and mark the
   quest complete.
4. The system SHALL maintain a simple inventory / currency balance affected by rewards and
   fares.
5. Quest state SHALL persist across browser reloads and API restarts for an anonymous guest.

## Requirement 6 — UI, HUD, and onboarding (P1; minimal HUD is P0)

**User story:** As a player, I want clear on-screen information and a short intro so I
understand the controls and goals.

### Acceptance criteria
1. The system SHALL display a HUD with currency, active-quest hint, and interaction prompts.
2. WHEN the game first starts THEN it SHALL present a brief title/intro screen and a
   one-screen controls reference.
3. The dialogue UI SHALL show the NPC name, portrait/placeholder, conversation history for
   the current exchange, and a player input affordance (text entry on desktop; voice or
   selectable prompts in VR).
4. The UI SHALL be legible in both desktop (2D overlay) and VR (world-space panels) modes.

## Requirement 7 — Meta Quest 3 VR support (P2, differentiator)

**User story:** As a Quest 3 user, I want to explore the city in immersive VR so the
experience is more compelling and demo-worthy.

### Acceptance criteria
1. The system SHALL run as a WebXR (or native) VR application on Meta Quest 3 with
   stereoscopic rendering and 6-DoF head tracking.
2. WHEN in VR THEN the system SHALL support controller-based locomotion (teleport and/or
   smooth move with snap turn) and interaction (pointing/grabbing to talk to NPCs and board
   transport).
3. WHEN in VR THEN NPC dialogue SHALL be presented on world-space panels, and input SHALL
   be possible without a physical keyboard (voice via Muse Voice/Transcribe, or a
   ray-selectable prompt menu).
4. The VR build SHALL hold ≥ 72 FPS on Quest 3 (performance budget: reduced draw calls,
   baked lighting, LODs).
5. The same core game logic (NPC agents, transport, quests) SHALL be shared between desktop
   and VR builds (single codebase, platform-conditional input/rendering).

## Requirement 8 — Voice interaction with NPCs (P2)

**User story:** As a player (especially in VR), I want to speak to NPCs and hear them, so
conversation feels natural and hands-free.

### Acceptance criteria
1. WHEN the player speaks THEN the system SHALL transcribe speech to text via Meta
   Voice/Transcribe and feed it to the NPC agent (Requirement 3).
2. The NPC's response MAY be spoken aloud via text-to-speech for added immersion.
3. Voice SHALL degrade gracefully to text input if transcription is unavailable.

## Requirement 9 — Backend / AI proxy service (P0, supports Requirement 3)

**User story:** As the developer, I want a backend that holds Meta credentials and brokers
AI calls, so keys stay secret and agent logic is centralized and testable.

### Acceptance criteria
1. The system SHALL provide a backend service that receives NPC-agent requests from the
   client, calls the Meta Model API with the appropriate model and system prompt, and
   returns validated, structured responses.
2. The backend SHALL hold the Meta API key server-side (environment/secret), never in the
   client.
3. The backend SHALL enforce request shaping (persona + world state + player input →
   structured response), output validation, and a per-session rate/cost guard to protect
   the $150 credit budget.
4. The backend SHALL expose health and fallback behavior so the client can detect
   unavailability (Requirement 3.7).
5. The backend SHALL support both Meta Model API (hosted) and, optionally, an open-weight
   model endpoint (for the "Best Build on Meta Open Weight Models" bonus), selectable by
   configuration.

## Requirement 10 — Performance, resilience, and demo-readiness (P0 cross-cutting)

**User story:** As a presenter, I want the game to run reliably during a live 3-minute demo
so nothing breaks on stage.

### Acceptance criteria
1. The system SHALL provide a "demo mode" seed/scenario that reliably reproduces a compelling
   path: spawn → meet NPC → receive AI quest → ride transport → complete quest → get reward.
2. The system SHALL cache or pre-warm AI responses where feasible to reduce live latency
   risk during the demo.
3. The system SHALL log AI requests/responses (dev only) for debugging and for the demo
   video narration.
4. All AI failure paths (timeout, unreachable, invalid output) SHALL have deterministic
   fallbacks so the demo never hard-stops.

---

## Out of scope (for the hackathon window)

- Large open-world map, full city scale, or accurate geographic replica of HCMC.
- Real accounts, cross-browser identity, typed public chat, monetization, and XR party controls.
- Photorealistic graphics; the art target is a clean stylized/low-poly look.
- Full traffic simulation; ambient traffic is decorative only.

## Assumptions

- A1. Meta Model API access and the $150 credit will be claimed and available.
- A2. Target engine/stack supports both a desktop build and a Quest 3 VR build from one
  codebase (see design — Web/WebXR + three.js/Babylon, or Unity, to be decided in design).
- A3. Art assets will be a mix of free/CC low-poly packs (properly licensed per R0.3) and
  possibly AI-generated textures (Muse Image/Wonder), with original composition built during
  the hackathon.
- A4. One to four developers; scope tiers (P0→P2) are cut from the top down if time runs short.
