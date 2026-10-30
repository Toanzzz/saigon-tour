# City hub integration plan

Bring the city hub (`apps/design`) into the game client as a live screen driven by game state.
The hub and game already share `packages/shared/tokens.css`, fonts, and the diorama language;
this plan covers behavior, data, and placement.

## Target

- Hub is a client screen: `GameState.screen` gains `'hub'`.
- Opened in play from a header button and the `H` key. Shown once after the reward panel closes.
- Title → Start exploring → play stays unchanged, so the 3-minute demo path and QA selectors hold.
- The live scene keeps rendering behind a dimmed backdrop. Movement already stops when
  `screen !== 'playing'` (`core/player.tsx:48`).
- Close (`Esc`, close button, Continue exploring) returns to `'playing'`.
- XR sessions keep the existing world-space panels; the DOM hub is hidden while in XR.

## Code layout

```
apps/client/src/ui/hub/
  index.ts      public API: <HubScreen state />
  view.ts       hubView(state): pure selector → everything the hub renders
  hero.tsx      diorama hero, greeting, primary actions
  cards.tsx     story road, neighbor card
  city.tsx      ride, discovery, sound cards
  hub.css       ported from apps/design, scoped under .hub-screen (split if >300 lines)
```

- No Tailwind or lucide in the client. Add the missing glyphs (`users`, `stamp`, `mic`) to
  `ui/icons.tsx`.
- Copy `ben-thanh.webp` 1800w next to the existing 900w file in `apps/client/public/images/`.
- Hub components stay dumb; all derivation lives in `view.ts` so it is unit-testable.

## Data mapping

| Hub element | Source | Change needed |
| --- | --- | --- |
| Wallet | `world.currency` | none |
| Greeting | time of day from `Date` | drop the "Mai" name and the temperature |
| Story road, 3 steps | `quest`, `world.deliveredItems`, `completed` | step logic in `view.ts` |
| Story rewards | `quest.reward.currency` + postcard | none |
| Neighbor card | last NPC in `world.talkedTo` | add `lastLine: Partial<Record<NpcId, string>>` to state, set in `chat()` |
| Neighbor status | `source` (`live` / `fallback`) | drop "Remembers 4 chats" and "Voice ready" |
| Ride card | `stop`, `MODES`, `PLACES` | show cheapest affordable ride from the current stop |
| Pulse card | `world.visitedLocations.length / 4` | becomes "Places discovered"; drop "tree shade" |
| Sound card | `muted`, `volume`, `audio` | reuse `update({ muted })` |
| Diorama pins | `PLACES.market` only | the image only depicts the market; other stops become chips with visited state |
| Nav tabs | — | removed; Journal and Map buttons open the existing panels |

### Story step rules

1. No quest and nothing completed → step 1 current ("Meet Cô Hoa").
2. Quest active, `herbs:linh` not delivered → step 1 done, step 2 current.
3. Delivered, not verified → step 2 done, step 3 current ("Tell Cô Hoa").
4. Quest in `completed` → all done; footer shows the postcard earned.

## Phases

1. **State + selector.** Add `'hub'` screen, `lastLine`, `openHub()` / `closeHub()` actions,
   `H` key binding, and `hubView()` with vitest coverage of the step rules and ride choice.
2. **Port UI.** Move components and CSS into `ui/hub/`, wire to `hubView`, header button,
   post-reward entry. Keep files ≤300 lines.
3. **QA.** Extend `scripts/qa-game.mjs`: open hub after delivery, assert coins and story step
   text match state, open Journal from hub, close back to play. Desktop and 390px mobile.
   Port the overflow and font checks from `scripts/qa-hub.mjs`.
4. **Retire `apps/design`.** Delete the package, `scripts/qa-hub.mjs`, and port 58003 from docs
   once the client hub passes QA. Tokens stay in `packages/shared`.
5. **Docs.** Update `docs/game-design.md` core loop, `artifacts/game-progress.md`, and
   `artifacts/final-evidence.md`.

## Open decisions (defaults in bold)

- Hub placement: **in-play overlay + after reward** / replace the title screen / pause menu.
- `apps/design` after the port: **delete** / keep as a static style sandbox.
- Persistence: **none (session only)** / `localStorage` save of world, completed quests, and
  settings so the hub can say "welcome back".

## Risks

- Panel and screen collisions: hub must not open while `dialogue` or `ride` is active.
- `index.tsx` is 248 lines; the hub mount and header button push it toward the cap. Move the
  header into its own file first.
- Bundle: the hub adds CSS and one image only; no new JS dependencies.
