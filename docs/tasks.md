# Implementation Plan — Saigon Tour

Tasks are ordered to deliver a demoable P0 vertical slice first, then layer P1 breadth, then
P2 differentiators (VR, voice). Each task cites the requirements it satisfies. Check items off
as they land. Given the Nov 4 deadline, treat the tier boundaries (P0 → P1 → P2) as cut lines.

---

## Phase 0 — Foundations (P0)

- [x] 1. **Scaffold the Bun monorepo** (R0.2; Design §2, §8)
  - Stack is locked: three.js + React Three Fiber + @react-three/xr, full TypeScript ^7, solo.
  - Create Bun workspace (`bun@1.4.4`, isolated linker): `apps/client` (Vite + React + TS),
    `apps/server` (Node + Hono + TS), `packages/shared` (zod v4 schemas + types).
  - Add Biome 2.6.x, `tsconfig.base.json` + root solution file + composite project per package,
    and a root `check` script (`tsc -b`, `biome check`).
  - Add an asset-only `wrangler.jsonc` to serve the built client on Cloudflare.
  - Add root README stating the project is built for the hackathon.
  - Initialize a **public** git repo and push.
  - _Requirements: R0.2, A2, Design §2, §8_

- [x] 2. **Verify a raw Meta Model API call** (R0.1, R9) — _credits already claimed_
  - From `apps/server/`, make a smoke-test call to Muse Spark and confirm a response; pin the
    model ID in `docs/meta-api.md`.
  - Confirm the spend limit is set to protect the $150 budget.
  - _Requirements: R0.1, R9.2_

- [x] 3. **Backend AI proxy skeleton** (R9)
  - Hono server (TS) with `/health`, env-based Meta key, credentialed CORS for the Cloudflare
    client origin, 7-key structured logger, and `export type AppType` for the `hc<>` client.
  - `MetaClient` wrapper + model selector (hosted vs open-weight) behind config.
  - Add a `Dockerfile` for `apps/server`; the proxy ships as a Docker image to a small host
    behind a TLS-terminating reverse proxy.
  - _Requirements: R9.1, R9.2, R9.4, R9.5_

## Phase 1 — Explorable city + movement (P0)

- [x] 4. **Scene bootstrap and desktop render loop** (R1, R2)
  - Set up camera, lighting, skybox, ground; a fixed render/update loop.
  - _Requirements: R1.1, R1.4, R2.1_

- [x] 5. **Build the Sài Gòn mini-district greybox** (R1)
  - Block out streets, shophouses, a Bến Thành-style market, a cathedral, a central park;
    place bounds (invisible walls/water).
  - Import low-poly GLTF assets; record licenses in `assets/LICENSES`.
  - _Requirements: R1.1, R1.5, A3, R0.3_

- [x] 6. **PlayerController + physics (desktop)** (R2, R1.2)
  - WASD + drag-to-look + sprint + interact; capsule collider; walkable-surface constraint;
    movement state machine `WALKING | RIDING | IN_DIALOGUE`.
  - _Requirements: R2.1, R2.2, R1.2_

- [x] 7. **InteractionSystem + contextual prompts** (R1.3)
  - Forward raycast/proximity detection; "Press E to talk / board" prompts; event routing.
  - _Requirements: R1.3, R6.1_

## Phase 2 — Agentic NPC (P0 core differentiator)

- [x] 8. **NPC persona data + one seeded NPC in-world** (R3.2)
  - Define `NpcPersona` records; place **Cô Hoa** in the market with an idle presence.
  - _Requirements: R3.2, Design §6_

- [x] 9. **NPC dialogue turn end-to-end (`POST /npc/:npcId/interact`)** (R3.1, R3.5, R3.7, R9.3)
  - PromptBuilder (persona + world rules + output contract); call Muse Spark; thinking
    indicator; timeout + unreachable fallback lines; dev logging.
  - Desktop dialogue UI: NPC name, history, text input.
  - _Requirements: R3.1, R3.5, R3.6, R3.7, R6.3, R9.3, R10.3_

- [x] 10. **Structured quest proposal (`propose-quest` tool)** (R3.3, R5.2)
  - The agent proposes through a Zod-validated tool; `QuestService` rejects with specific
    reasons and the model corrects within its step budget.
  - NPC autonomously decides when to offer; quest enters the QuestSystem.
  - _Requirements: R3.3, R5.2, R9.3, Design §5_

- [x] 11. **QuestSystem + Inventory + HUD** (R5, R6.1)
  - Quest log (active/completed), step types (`GO_TO/TALK_TO/DELIVER/BUY`),
    currency + items; minimal HUD (currency, active-quest hint, prompts).
  - _Requirements: R5.1, R5.2, R5.4, R5.5, R6.1_

- [x] 12. **Completion + reward grant** (R3.4, R5.3)
  - Deterministic step checks; any interaction with the giver completes ready quests, grants
    the reward once, and shows reward feedback in the UI.
  - _Requirements: R3.4, R5.3_

- [x] 13. **Output safety + cost guard** (R3.6, R9.3)
  - System-prompt scoping, output sanitation, per-session rate/cost ceiling → fallback.
  - _Requirements: R3.6, R9.3_

## Phase 3 — Transport (P0: one mode; P1: the rest)

- [x] 14. **TransportSystem data model + first rideable mode** (R4.1, R4.2, R4.6)
  - `TransportNetwork` (stops/routes/vehicles); implement **xe ôm** or **bus** end-to-end:
    board → pick destination → fare → `RIDING` with camera-on-vehicle → arrive.
  - _Requirements: R4.1, R4.2, R4.4, R4.5, R4.6_

- [x] 15. **Wire transport into the quest loop** (R4.5)
  - Place the demo quest's target across the map so transport is the natural way there.
  - _Requirements: R4.5, R5.3_

## Phase 4 — Demo hardening (P0 cross-cutting)

- [ ] 16. **Demo seed + pre-warm/cache** (R10.1, R10.2, R10.4)
  - `?demo` resets and starts beside Hoa; authored offers reproduce gag → arc.
    Desktop/mobile live route passes through ride, delivery, reward, and twist.
  - Rehearsal warms assets; deterministic offers need no model call. Partial-outage
    reconciliation and full offline checks remain required before closing this task.
  - _Requirements: R10.1, R10.2, R10.4_

- [x] 17. **Title/intro + controls screen** (R6.2)
  - _Requirements: R6.2_

- [x] 18. **First playtest + perf pass (desktop)** (R1.4, R10)
  - Visible Chromium 153 on Apple M1 Pro, 1440×900: market, park, alley, and
    walking five-second samples average approximately 120 FPS, p95 9.4–9.8 ms.
  - _Requirements: R1.4_

> **Checkpoint: after Task 18 a complete, demoable P0 slice exists. A valid hackathon
> submission is possible from here. Everything below is upside.**

## Phase 5 — Breadth (P1)

- [x] 19. **Add more NPCs** — nine neighbors and twenty walking residents. _(R3.2)_
- [x] 20. **Add transport modes** — modern (Metro Line 1, bus) + traditional (xe ôm, cyclo).
  _(R4.3)_
- [x] 21. **Full quest-log UI + inventory screen.** _(R5.1, R6.1)_
- [x] 22. **Ambient city life + basic audio** (decorative traffic, pedestrians, street SFX).
  _(Traffic stays decorative; `docs/audio.md`)_

- [x] 22a. **Shared neighborhood** — one world room, presence, emotes, parties, party errands.
  _(docs/multiplayer.md)_
- [x] 22b. **City Director** — shared events, weather, NPC moves and needs, headlines.
  _(docs/agent-harness.md)_
- [x] 22c. **NPC friendship and memory** — affinity, observational memory, timestamped history, activity narration.
  _(docs/agent-harness.md)_
- [x] 22d. **Quest reward unlocks and 3D wardrobe** — cosmetics, rides, pets, plain bodies.
  _(docs/game-design.md)_
- [x] 22e. **English + Vietnamese** — Paraglide client catalogs and per-locale NPC replies.
- [x] 22f. **CI deploy** — API image to t-oracle, client to Cloudflare on push to `main`.

## Phase 6 — Differentiators (P2)

- [x] 23. **WebXR VR mode on Quest 3** (R7)
  - Immersive session, stereo render, 6-DoF; XRInput locomotion (teleport + smooth +
    snap-turn); world-space dialogue panels; ray-select to talk/board.
  - Share the game core unchanged; only input/rendering differ.
  - Physical Quest 3 run not yet verified.
  - _Requirements: R7.1, R7.2, R7.3, R7.5_

- [ ] 24. **VR performance pass (≥ 72 FPS)** (R7.4)
  - Draw-call reduction, baked lighting, LODs, foveation.
  - _Requirements: R7.4_

- [ ] 25. **Voice interaction via Muse Transcribe** (R8)
  - Authenticated voice route and desktop/mobile mic implemented. Live EN/VI spike,
    authenticated in-process route against Meta, and desktop/mobile browser capture,
    conversion, mocked-transcript chat, cancellation, and text fallback pass.
    Combined browser-to-configured-API check remains pending.
  - _Requirements: R8.1, R8.2, R8.3_

- [ ] 26. **(Optional) AI-generated textures/art via Muse Image/Wonder** (Best Creative Build)
  - Generate stylized textures/signage; document which assets are AI-generated.
  - _Requirements: A3, targets Best Creative Build bonus_

- [ ] 27. **(Optional) Open-weight path via Muse Spark Open** (Best Open Weights bonus)
  - Flip the model selector to an open-weight endpoint; verify the agent loop still works.
  - _Requirements: R9.5_

## Phase 7 — Submission (required before Nov 4, 9:00 PM ET)

- [ ] 28. **Record the 3-minute demo video** (R0.4)
  - Narrate the agentic NPC loop + transport + VR; show what was built during the hackathon.
  - _Requirements: R0.4_

- [ ] 29. **Finalize public repo + README + licenses + submission** (R0.2, R0.3)
  - Clear "built during hackathon" attribution; list contributors; submit on the CV platform;
    (optional) post demo on X for the Most Viral bonus.
  - _Requirements: R0.2, R0.3_

---

### Suggested solo/4-day-crunch cut line

If time is tight, ship **Tasks 1–18 only** (full P0 slice: one NPC, one transport mode, the
agentic quest loop, demo hardening) and record the video on that. Add VR (Task 23) only if
Phase 4 finishes with ≥ 2 days left.
