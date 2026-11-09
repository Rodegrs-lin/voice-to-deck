# voice-to-deck

**Narration audio in, a recordable dynamic deck out.**

Give it one voice track plus an SRT and your source material. It builds a 1920×1080 presentation page where the page, the beats and the progress bar all follow media time — silent and recordable, or audible and double-click-to-play.

[中文说明](README.md) · [License: MIT](LICENSE)

![20 seconds from a real deck: numbers counting up, a page turn, then four shots on the next page](docs/demo.gif)

*Real footage, 20 seconds, from a 19-page / 385-second project. The clip crosses a page boundary on purpose — that is the only way to see that the page really follows the audio.*

## The one rule

> **The clock equals the sound source.** Whatever produces sound owns the timeline. The other media element is a reference only.

This is the whole point of the package. When a page is timed by one element and heard through another, their buffering and decode timing drift independently — video stutters, so the picture runs ahead of the voice. You cannot fix that by nudging per-page timings, because the drift keeps happening.

## Two modes, pick one and record it in `timeline.json`

| | **Silent** `clock: "mp3"` | **Audible** `clock: "dh(video)"` |
|---|---|---|
| Who is heard | nobody (narration added in post) | the media that makes sound |
| Who is the clock | the muted MP3 | **that same sound-producing element** |
| `BIAS` | **0.10s** (measured; MP3 content lags video) | **0** |
| Volume | all 0, no unmute path | source fixed at 0.72, no UI control |
| Typical use | screen recording, post-production | hand someone a file, it just plays |

## Install

```bash
npx skills add Rodegrs-lin/voice-to-deck --skill voice-to-deck
```

Or unzip the release and drop the whole `voice-to-deck/` folder into `~/.workbuddy/skills/` (or `~/.claude/skills/`).

Sanity check — should print `"status": "PASS"` and `"themeCount": 23`:

```bash
node scripts/list-themes.mjs
```

Then just say: *"Use voice-to-deck, turn this narration into a dynamic deck. MP3 and SRT are at …"*

## What you get

- A Vite + React + TypeScript project on a fixed 1920×1080 stage, driven by the clock element's `currentTime` — never by a timer
- `timeline.json` (pages / beats / cues), `outline.md`, `visual-direction.md`, `review-report.md` + `review-results.json`
- 23 bundled themes, each a `theme.json` + `tokens.css`
- A fixed recording URL and a one-click launcher

## Three gates before delivery

```bash
node scripts/validate-timeline.mjs <timeline.json> --duration <s> --srt <captions.srt>
node scripts/validate-silent-runtime.mjs <src> --mode silent   # or --mode sound
node scripts/audit-motion.mjs --timeline <timeline.json> --src <src> --exclude lab,backup
```

`audit-motion` enforces the PPT-density contract: no dead page tail over 4s, a visible change per beat, one real anchor per page, ≤8 beats per page, and no CSS animation driving continuous motion.

**A `SKIP` is an unverified check, never a pass** — the report lists every skipped id.

## Three lessons that only come from real 6-minute films

1. **Page boundaries must be re-fitted to actual vocal onsets**, not to SRT cue starts. Subtitles open early — 4 of 16 pages were 0.8–1.3s early, each different, so a constant offset cannot fix it.
2. **Time alignment is not content alignment.** Every page can be perfectly timed while page 9 is talking about the wrong thing. Users report this as "sound and picture do not match", and you will burn three rounds adjusting time for nothing.
3. **"The page feels empty" has three different causes** — elements not arriving, elements done but the page tail is long, or nothing moving at all. Three different fixes; diagnosing the wrong one makes it worse.

Details, with the measured numbers: [references/CLOCK-AND-SYNC.md](references/CLOCK-AND-SYNC.md) and the sections of [SKILL.md](SKILL.md).

## Related

- **[html-to-mp4-recording](https://github.com/Rodegrs-lin/html-to-mp4-recording)** — render the finished page to MP4. Deterministic frame-by-frame capture, no dropped frames. This package does **not** export video itself; it hands the page over via `window.__rec`.
- **anchor-driven-demo-page** — for high-density motion pieces where *every sentence* gets its own graphic. This package targets deck density instead: one real anchor per page, a visible change per beat. Mixing the two densities produces a screen full of restless shapes.

## Specs

- All source input (MP3, SRT, PDF, DOCX, images) is read-only
- No TTS, no image-generation API, no API key
- Captions are off by default; if you explicitly ask for them, it is recorded as a contract change
- Built for Vite + React + TypeScript; silences and animations are all derived from time, so a paused page is pixel-identical across two captures
