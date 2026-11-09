# Timeline schema

## Top-level shape

Use an object with metadata and a `pages` array:

```json
{
  "audioDuration": 284.238333,
  "clock": "mp3",
  "contentDensity": "rich",
  "presenter": {
    "asset": "inputs/original/dh-presenter.mp4",
    "mode": "pip-circle-bottom-left",
    "muted": true
  },
  "pages": []
}
```

`clock` records which runtime contract applies. See `CLOCK-AND-SYNC.md`.

- `"mp3"` — silent mode: the muted MP3 is the clock, nothing is audible.
- `"dh(video)"` — audible mode: the element that produces sound is the clock; the MP3 only maps time.

Omit `presenter` when the deck has no on-camera element.

## Page object

Every page contains:

```json
{
  "id": "edit-from-voice",
  "pageNumber": 25,
  "section": "剪辑与发布",
  "subsection": "口播驱动剪辑",
  "start": 0,
  "end": 18.633,
  "cueStart": 1,
  "cueEnd": 9,
  "narration": "本页覆盖的连续口播文本",
  "screen": "页面核心信息",
  "visual": "页面视觉关系说明",
  "transition": "cut",
  "priority": "normal",
  "beats": []
}
```

Required invariants:

- The top level is an object, not a bare pages array.
- `clock` equals `mp3` or `dh(video)`, and the runtime matches the recorded mode.
- `contentDensity` equals `rich`, `concise`, or `custom`.
- First page `start` equals 0.
- Each page `end` equals the next page `start`.
- Last page `end` equals the duration of the media that drives the clock (the MP3 in silent mode, the audible element in audible mode). If the two differ by more than 0.5s, fix the timeline before building visuals.
- Page ids and page numbers are unique.
- `cueStart` and `cueEnd` map to valid SRT cue ids.
- `[PPT重点]` pages use `priority: "high"`.
- Page copy follows the approved `contentDensity` or documented custom density rule.

## Beat object

Every beat contains:

```json
{
  "id": "edit-from-voice-b1",
  "start": 0,
  "end": 4.2,
  "cueStart": 1,
  "cueEnd": 2,
  "action": "reveal-title"
}
```

Required invariants:

- Beat ids are unique within the page.
- Every page contains at least one beat.
- The first beat starts at the page start.
- Adjacent beats have no gap or overlap.
- The final beat ends at the page end.
- Beat start and end remain inside the page range.
- Beat order follows narration order.
- Beat timing comes from SRT cue boundaries or deliberate coverage of the initial silent segment.
- Do not create an independent timer for animation orchestration.

## Runtime selection

Select the active page with the current clock time:

```ts
const page = pages.find(
  (item, index) =>
    currentTime >= item.start &&
    (currentTime < item.end || index === pages.length - 1),
)
```

Select the active beat from the active page using the same clock value. Compute every visible animation value from that time and render it as a static style. Do not rely on CSS `animation`, `@keyframes`, or `transition` for any continuous motion: they run on the compositor clock and keep advancing while playback is paused.

## Runtime review contract

Expose deterministic review hooks in the generated page. Two attributes, because in audible mode the clock and the reference track are different elements:

```html
<!-- silent mode: one element is both -->
<audio data-ppt-clock data-clock-source></audio>

<!-- audible mode: the reference track and the clock are different -->
<audio data-ppt-clock></audio>
<video data-clock-source></video>

<main data-page-id="..." data-beat-id="..."></main>
```

- `data-ppt-clock` always marks the silent MP3, used for time mapping and duration checks.
- `data-clock-source` marks **the element whose `currentTime` drives the render function**. In silent mode both attributes sit on the same element; in audible mode they sit on different ones. A reviewer can therefore read the active mode straight off the DOM.

In `?review=1` mode, show or expose: current page id, beat id, cue id, the clock element's `currentTime`, duration, paused state, ended state, and for **both** media elements the muted state and volume. Cue id is timing metadata. Never expose cue text as a visible subtitle.

Browser Review must verify: visible state changes when the clock element's time changes; state stays frozen while paused; in silent mode every media element is silent; in audible mode exactly one element is audible while the silent MP3 stays at volume 0. Keeping the audio muted at volume 0 is required **in silent mode only**.

### Recording handoff (`window.__rec`)

If the deck will later be turned into an MP4, the page must also expose what [`html-to-mp4-recording`](https://github.com/Rodegrs-lin/html-to-mp4-recording) expects for form B (Vite/React bundle). `renderAt` and `__setT` are the same function:

```ts
if (REVIEW) {
  const renderAt = (v: number) => setT(v)
  ;(window as any).__setT = renderAt
  ;(window as any).__rec = {
    duration: tl.audioDuration,
    pages: tl.pages.map((p) => ({ id: p.id, start: p.start, end: p.end })),
    renderAt,
    events: () => EVENTS,   // [] when the deck has no sound effects
  }
}
```

Three rules that make the recording correct:

1. **`__rec.pages[i].start` must match `timeline.pages[i].start` within 0.02s.** The recorder asserts this and exits otherwise; a mismatch throws every sound effect off.
2. **`?review=1` renders, it does not play.** No auto `play()`, and no clamp such as `t < 5 ? 5 : t` — that clamp silently replaces the first five seconds of the film.
3. **Hand the video to the recorder instead of playing it.** Expose `window.__videoEl = el` and `window.__videoLocalT = t - page.start`; the recorder pauses and seeks per frame. A page that plays its own `<video>` runs it several times over during a frame-by-frame capture (capture is ~3× slower than realtime), and every take comes out different.

## SRT timing gaps

SRT can contain pauses. Timeline pages must still cover those ranges. Keep the previous semantic visual active through a pause unless the narration requires a deliberate clean hold. Do not fill gaps with visible subtitle text.
