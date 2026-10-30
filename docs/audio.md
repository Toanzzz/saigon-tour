# Audio

## Event matrix

| Runtime event | File | Group | Level | Loop |
| --- | --- | --- | --- | --- |
| Exploration | `city.mp3` | ambience | 0.22 | Yes |
| Confirm / parcel pickup | `confirm.mp3` | ui / sfx | 0.45 / 0.60 | No |
| Board / arrive | `bell.mp3` | sfx | 0.55 | No |
| Verified reward | `reward.mp3` | sfx | 0.70 | No |

Runtime files live in `apps/client/public/audio/`. No existing audio was present in the asset inventory.

## Prompts

- `confirm.mp3`: Tiny soft wooden click followed by a delicate warm glass tick, one friendly game menu confirmation, clear gentle transient, very short tail, no music, no voice, no harsh beep.
- `city.mp3`: Quiet daytime Saigon neighborhood ambience heard from a shaded market street, distant small motorbikes passing softly, faint indistinct market bustle, occasional small birds, light rustling palms, relaxed warm afternoon, subtle background bed with no foreground horns, no intelligible speech, no music, seamless loop.
- `bell.mp3`: One soft friendly double ding of a small city bus arrival bell, warm clean metal with a short airy decay, calm travel exploration game, no engine, no voice, no music.
- `reward.mp3`: A short welcoming reward chime for delivering a parcel to a neighbor, three bright wooden and glass notes rising gently into a warm shimmer, satisfying clear transient, soft short tail, no voice, no continuous music.

## Runtime

The first player gesture creates and resumes Web Audio, then fetches and decodes the four files. Mute and volume apply through one master gain. Ambience has one loop source; pause and hidden tabs suspend playback. Restart cleanup stops and disconnects every source. Failed loads stay visible in `audio.stats().errors`, while gameplay continues.

Five event names map to four files. UI events have an 80 ms cooldown, other events 120 ms. The manager limits simultaneous effects to eight.

## Validation

- Four stereo MP3 files, 44.1 kHz / 128 kbps, approximately 253 KB total.
- Durations: confirm 0.60 s, bell 1.20 s, reward 1.76 s, city 12.00 s.
- City audio has 20 dB gain compensation and 40 ms edge fades to keep the seam quiet.
- Headless Chromium decoded every file and passed real-click unlock, five event triggers, mute, volume, pause/resume, and restart checks.
- Simulated hidden-tab transitions stopped playback; repeated resume left one ambience source.
- A missing ambience file left the three effects usable and reported its load error.
- Listening quality remains subject to human review; automated checks establish decoding and lifecycle behavior.

Run the isolated lifecycle check with a scratch Playwright installation:

```sh
PLAYWRIGHT_MODULE=/tmp/saigon-tour-qa/node_modules/playwright/index.mjs node scripts/qa-audio.mjs
```

Set `PLAYWRIGHT_CHROMIUM` to override the local cached browser executable. Results are written to `artifacts/audio-check.json`; the harness serves on port 58009.
