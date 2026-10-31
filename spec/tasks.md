# Implementation Plan — Saigon Tour

Tasks are ordered to deliver a demoable P0 vertical slice first, then layer P1 breadth, then
P2 differentiators (VR, voice). Each task cites the requirements it satisfies. Check items off
as they land. Given the Nov 4 deadline, treat the tier boundaries (P0 → P1 → P2) as cut lines.

---

## Phase 0 — Foundations (P0)

- [x] 1. **Scaffold the Bun monorepo** (R0.2; Design §2, §10)
  - Stack is locked: three.js + React Three Fiber + @react-three/xr, full TypeScript ^7, solo.
  - Create Bun workspace (`bun@1.4.4`, isolated linker): `apps/client` (Vite + React + TS),
    `apps/server` (Node + Hono + TS), `packages/shared` (zod v4 schemas + types).
  - Add Biome 2.6.x, `tsconfig.base.json` + root solution file + composite project per package,
    and a root `check` script (`tsc -b`, `biome check`).
  - Add an asset-only `wrangler.jsonc` to serve the built client on Cloudflare.
  - Add root README stating the project is built for the hackathon.
  - Initialize a **public** git repo and push.
  - _Requirements: R0.2, A2, Design §2, §10_

- [x] 2. **Verify a raw Meta Model API call** (R0.1, R9) — _credits already claimed_
  - From `apps/server/`, make a smoke-test call to Muse Spark and confirm a response; pin the
    exact model IDs in `docs/` (resolves Design D2).
  - Confirm the spend limit is set to protect the $150 budget.
  - _Requirements: R0.1, R9.2, Design D2_

- [x] 3. **Backend AI proxy skeleton** (R9)
  - Hono server (TS) with `/health`, env-based Meta key, credentialed CORS for the Cloudflare
    client origin, 7-key structured logger, and `export type AppType` for the `hc<>` client.
  - `MetaClient` wrapper + model selector (hosted vs open-weight) behind config.
  - Add a `Dockerfile` for `apps/server`; the proxy ships as a Docker image to a small host
    behind a TLS-terminating reverse proxy (Design §5, §11 D5).
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
  - WASD + mouse-look + sprint + interact; capsule collider; walkable-surface constraint;
    movement state machine `WALKING | RIDING | IN_DIALOGUE`.
  - _Requirements: R2.1, R2.2, R1.2_

- [x] 7. **InteractionSystem + contextual prompts** (R1.3)
  - Forward raycast/proximity detection; "Press E to talk / board" prompts; event routing.
  - _Requirements: R1.3, R6.1_

## Phase 2 — Agentic NPC (P0 core differentiator)

- [x] 8. **NPC persona data + one seeded NPC in-world** (R3.2)
  - Define `NpcPersona` records; place **Cô Hoa** in the market with an idle presence.
  - _Requirements: R3.2, Design §6_

- [x] 9. **`/npc/chat` dialogue turn end-to-end** (R3.1, R3.5, R3.7, R9.3)
  - PromptBuilder (persona + world rules + output contract); call Muse Spark; thinking
    indicator; timeout + unreachable fallback lines; dev logging.
  - Desktop dialogue UI: NPC name, history, text input.
  - _Requirements: R3.1, R3.5, R3.6, R3.7, R6.3, R9.3, R10.3_

- [x] 10. **`/npc/quest` structured quest proposal** (R3.3, R5.2)
  - Model returns a schema-validated `Quest` (Zod); OutputValidator repair/reject path.
  - NPC autonomously decides when to offer; quest enters the QuestSystem.
  - _Requirements: R3.3, R5.2, R9.3, Design §5_

- [x] 11. **QuestSystem + Inventory + HUD** (R5, R6.1)
  - Quest log (active/completed), objective types (`TALK_TO/GO_TO/DELIVER/COLLECT`),
    currency + items; minimal HUD (currency, active-quest hint, prompts).
  - _Requirements: R5.1, R5.2, R5.4, R5.5, R6.1_

- [x] 12. **`/npc/verify` completion + reward grant** (R3.4, R5.3)
  - Deterministic checks for `GO_TO/COLLECT`; model-assisted judgment for fuzzy claims;
    grant reward, mark quest complete, reward feedback in UI.
  - _Requirements: R3.4, R5.3, Design D3_

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
  - One-key `DemoSeed` scenario reproducing spawn → NPC → AI quest → ride → complete →
    reward; pre-warm/cache the demo path's AI responses; verify every fallback path.
  - _Requirements: R10.1, R10.2, R10.4_

- [x] 17. **Title/intro + controls screen** (R6.2)
  - _Requirements: R6.2_

- [ ] 18. **First playtest + perf pass (desktop)** (R1.4, R10)
  - Confirm ≥ 60 FPS; fix blockers along the demo path.
  - _Requirements: R1.4_

> **Checkpoint: after Task 18 a complete, demoable P0 slice exists. A valid hackathon
> submission is possible from here. Everything below is upside.**

## Phase 5 — Breadth (P1)

- [x] 19. **Add remaining NPCs (3–4 total)** — Anh Tâm, Chị Linh, Ông Ba. _(R3.2)_
- [x] 20. **Add transport modes** — modern (Metro Line 1, bus) + traditional (xe ôm, cyclo).
  _(R4.3)_
- [x] 21. **Full quest-log UI + inventory screen.** _(R5.1, R6.1)_
- [x] 22. **Ambient city life + basic audio** (decorative traffic, pedestrians, street SFX).
  _(Design §4.4, out-of-scope traffic = decorative only)_

- [x] 22a. **Shared neighborhood** — rooms, presence, emotes, parties, team lunch errand.
  _(docs/multiplayer.md)_

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
  - Voice route; mic capture → transcript → NPC agent; optional TTS reply; graceful
    degrade to text.
  - _Requirements: R8.1, R8.2, R8.3_

- [ ] 26. **(Optional) AI-generated textures/art via Muse Image/Wonder** (Best Creative Build)
  - Generate stylized textures/signage; document which assets are AI-generated.
  - _Requirements: A3, targets Best Creative Build bonus_

- [ ] 27. **(Optional) Open-weight path via Muse Spark Open** (Best Open Weights bonus)
  - Flip the model selector to an open-weight endpoint; verify the agent loop still works.
  - _Requirements: R9.5_

## Phase 7 — Submission (required before Nov 4, 9:00 PM ET)

- [ ] 28. **Record the 3-minute demo video** following `docs/demo-script.md` (R0.4)
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
