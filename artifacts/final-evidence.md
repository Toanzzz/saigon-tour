# Final evidence

Validated on October 30, 2026 from the local production previews.

## Playable loop

- Desktop production flow: `artifacts/pass-3-design/`
- States covered: title, active play, live quest dialogue, stop arrival, transport menu, riding, reward, and restart.
- Live quest completion reached `completed: 1` and reward state.
- No page errors, console errors, or failed requests were recorded in the final flow checkpoint.

## Mobile and XR

- Mobile viewport: `390×844`; canvas capture: `390×664`. Mobile flow: `artifacts/pass-3-design-mobile/`.
- Real touch joystick moved the player and reset on pointer release.
- Touch interaction target was present.
- `navigator.xr` was present, while `immersive-vr` reported unsupported in the test browser; the XR entry control stayed hidden.
- Physical Quest 3 hardware was not tested.

## Visual and performance evidence

- Canvas inspector manifest: `artifacts/evidence.json`
- Captures: `artifacts/pass-2-inspector/`
- Desktop active play: entropy `4.58`, edge density `0.308`, contrast `171.5`.
- Desktop quest: entropy `4.52`, edge density `0.237`, contrast `108`.
- Desktop reward: entropy `4.75`, edge density `0.291`, contrast `132.5`.
- Mobile active play: entropy `4.36`, edge density `0.231`, contrast `171.2`.
- Final desktop capture: `181` draw calls, `307,578` triangles, `75` geometries, `47` textures.
- Final mobile capture: `129` draw calls, `300,612` triangles, `64` geometries, `40` textures.
- Hardware GPU was active in the browser capture: Apple M1 Pro via ANGLE Metal.

## Audio evidence

- Harness report: `artifacts/audio-check.json`
- Loaded assets: `confirm`, `bell`, `reward`, and `city`.
- Real controls exercised unlock, five gameplay/UI events, pause/resume, mute, and restart.
- Hidden-tab lifecycle was exercised with synthetic `visibilitychange`.
- Missing `city.mp3` produced the expected graceful fallback without page errors.

## Design hub

- Source: `apps/design/`
- Desktop and mobile evidence: `artifacts/design-hub/`
- `bun run check` covers `apps/design`; `tsgo -b` and `vite build` in `apps/design` passed.
- `node scripts/qa-hub.mjs` passed at `1440×900` and `390×844`: navigation, diorama pin selection, conversation action, sound toggle, Vietnamese fonts loaded, zero horizontal overflow, no page or console errors.

## Release checks

- `bun run check` passed.
- `bun run check:types` passed.
- `bun run build` passed.
- `bun run test` passed.
- Docker image build passed with `docker build -f apps/server/Dockerfile -t saigon-tour-api:pass-2 .`.
- Required client assets exist in `apps/client/dist/`.
- Client secret scan found no Meta key, endpoint, bearer credential, or model identifier in client source/build output.
- No deployment or public hosting verification was performed.
