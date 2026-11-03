# Three-minute demo

Play: <https://saigon-tour.toanz.workers.dev/?demo>.
Use a fresh browser profile for rehearsal. The demo entry resets the current player's
journey; use a separate guest from any save you want to keep.

## Recording schedule

- Freeze the recording build: **November 4, 2026, 18:00 ICT**.
- Finish upload and submit on Cerebral Valley by **November 5, 2026, 06:00 ICT**.
- Official deadline: **November 4, 2026, 21:00 EST** /
  **November 5, 2026, 09:00 ICT**. The earlier target leaves three hours for upload or form issues.

## Prepare

1. Ask the user to start or restart local dev servers when local rehearsal needs them.
   `bun run dev` uses client 58000, API 58001, and Postgres 58002.
2. Check `/health` on the API used by the recording client. Confirm the live Meta model
   and retain the response with the recording build's commit in `docs/final-evidence.md`.
3. For a repeatable city, ask the user to restart the API with `DIRECTOR_MODE=scripted`.
   Keep the model key configured for the separate live NPC demonstration.
   Scripted city events are authored; label them accurately in narration.
4. Rehearse `?demo` through Hoa's broth errand, a real ride, delivery to Linh,
   return reward, and the first twist. Let assets finish loading. There is no
   `prewarm` package command.
5. Prepare a separate fresh tab without `demo` for the live tool interaction.
   Ask an NPC for an errand and verify a live model call and validated `propose-quest`.
   Record genuine output; use visible edits to remove waiting between shots.
6. Open the second guest for the shared-room cameo. Confirm both players are visible.
   Record the exact deployed build; keep notifications and private logs off-screen.

## Shot list

| Time      | Picture and action                                                                                            | Narration                                                                                                                          |
| --------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 0:00–0:20 | Bến Thành, movement, one NPC encounter                                                                        | A small neighborhood journey: people, errands, and a city that responds. Name the intended visitor and the hackathon contribution. |
| 0:20–0:55 | Separate non-demo tab: ask for an errand, show the response and active quest                                  | Muse Spark chooses tools; the server validates the quest and owns rewards. Identify the live interaction.                          |
| 0:55–1:55 | Start demo, ask Hoa for an errand, ride to the park, give Linh broth, return to Hoa, show reward and Wear now | Follow the authored two-bowl errand. Show real delivery and completion controls, then the equipped reward.                         |
| 1:55–2:20 | Ask Hoa again, visit the alley, speak to Mai, show the changed destination in the journal                     | The next errand redirects the broth to Vy's lantern crew. Show the twist; the video need not finish this second quest.             |
| 2:20–2:45 | City pulse/event and shared-room guest                                                                        | Explain the Director's daily plan and synchronized players. State when the displayed city sequence is scripted.                    |
| 2:45–3:00 | Brief phone/VI view, then play URL and contributor                                                            | Browser play, English/Vietnamese, and what was built during the event. End with the accessible play and repository links.          |

The segments total **180 seconds**. Record separate takes and cut travel or waiting
to fit each segment. Keep the live tool result and quest completion legible.
Voice may replace a cutaway only after `scripts/qa-voice.mjs` passes against the
configured recording server. Set `META_TRANSCRIBE_MODEL=muse-voice-transcribe-1.0`
and ask the user to restart the local server before that check.
Mention WebXR only as implemented functionality;
claim Quest 3 performance only after a physical-device check.

## Flow checks and recovery

- An offered errand activates immediately; there is no separate Accept button.
- After the first reward, equip with Wear now or continue, then close the city hub
  before returning to Hoa's conversation.
- Use the map's current NPC marker. Scripted Director moves Mai to the market at its
  opening beat; follow the alley objective first, then find her current location.
- Scripted beats occur at 0, 240, and 540 real minutes. Capture the initial city event;
  do not wait for later beats during a three-minute take.
- For browser QA use `?debug=1&demo`; record the clean `?demo` view. Run
  `scripts/qa-demo.mjs` at 1440×900 and 390×844 with real controls.
- Check live, forced timeout/failure, and unreachable-API paths. Fallback play must
  still offer, deliver, complete, and reward; show it as fallback when recorded.
- `qa-demo` defaults to live and fully offline modes. `QA_MODES=offline` checks
  a fresh guest with the whole API blocked. `QA_MODES=timeout,unreachable`
  isolates NPC-only failures; that selective outage has a known limitation:
  an authoritative pickup/room save can erase a locally offered quest.
  Do not claim this partial-outage path passes.
- If a live call falls back, retain that observation and retake the live segment
  after checking the API. A deterministic demo offer is not proof of a model call.
- On this Mac, fake microphone capture uses the cached Chromium headless shell:
  set `CHROMIUM_PATH` to its executable and `QA_VOICE_WAV` to a 48 kHz PCM WAV.
  `QA_VOICE_MOCK=1` checks capture, conversion, and UI against a synthetic transcript;
  omit it for the configured real API check.
- If the demo entry reports a reset/profile failure, retry from the title after
  the API recovers. Do not continue with a stale journey.
- If the deployed build is wrong or CORS fails, keep the previous verified recording
  build and fix the deployment before the final capture.

## Evidence before submission

Record the deployed commit, successful Deploy run, API health/model, desktop/mobile
demo results, and video URL in `docs/final-evidence.md`.
Headless QA proves interaction and render behavior; it does not establish hardware FPS.
Measure the route on a real desktop and record device, GPU, browser, viewport, DPR,
sampling duration, frame-time statistics, and observed stutters against the 60 FPS target.

Review [asset provenance](../assets/LICENSES.md), resolve the listed rights/production
records, verify public repository/video access while signed out, add the uploaded video
to the README, then submit on Cerebral Valley.
