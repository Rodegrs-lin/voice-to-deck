# Review checklist

Run the functional gate on the simple skeleton, then run the complete checklist again after visual implementation. Record commands, outputs, failures, repairs, and reruns in `review-report.md`. Store machine-readable assertions in `review-results.json`.

## Severity

- P0 blocks visual development or completed delivery: unreadable MP3 or SRT, invalid timeline, a clock source that is not the sound source for the chosen mode, two elements producing sound at once, an unmute path in silent mode, a volume or mute UI control in either mode, captions added without a recorded decision, playback failure, launcher failure, build failure, resource failure, or full playback failure.
- P1 blocks completed delivery: wrong cover source, narration mismatch, wrong asset, missing required content, black frame, serious overflow, unreadable contrast, or console error.
- P2 allows delivery when documented: decorative refinement, limited layout variety, or simpler motion that does not reduce comprehension.

Correctness and readability take priority over decoration.

## Provided-input review

- Every provided file used by the plan exists at a stable project path.
- Temporary and messaging-cache paths are not used as runtime dependencies.
- `input-report.json` records read and conversion status.
- `assets-manifest.json` records image roles and intended usage.
- Text-heavy screenshots are treated as `document-page` unless explicitly approved for display.
- OCR text order and critical claims are checked against the source image.
- Missing optional material that the user never supplied is not reported as a blocking gap.

## Cover and content review

- When a full SOP or article exists, `cover-brief.md` reflects the complete document.
- Cover title, subtitle, steps, data, and outcomes have source references.
- A source-document screenshot is absent from the final cover unless explicitly approved.
- Every marked focus segment has a page or high-priority beat.
- Page count and page messages match the approved plan.
- Visible copy follows the approved `rich`, `concise`, or custom density rule.
- Visible copy contains no invented facts or fake precision.
- Every evidence image appears only in its approved role and location.

## Timeline and clock provenance

- MP3 duration comes from `ffprobe`.
- SRT cues parse successfully.
- Final SRT cue does not exceed audio duration.
- Timeline covers 0 through the exact audio duration.
- No page gaps or overlaps exist.
- Beats remain inside their pages and follow narration order.
- Timeline metadata records `clock: "mp3"` (silent) or `clock: "dh(video)"` (audible), and the runtime matches that mode.
- Runtime page, beat, and progress selection use the clock element's `currentTime` only. SRT cue ids are timing metadata only.
- Source scan finds no timing use of `setTimeout`, `setInterval`, `Date.now`, `performance.now`, or an independent audio track.
- Review mode exposes page, beat, cue id, time, duration, paused, ended, muted state, and volume without displaying cue text.
- Visible state advances with audio time and remains stable while paused.
- Pause and capture two frames two seconds apart; the pixel difference across animated regions must be zero. Equal page, beat, and `currentTime` values are not evidence that the frame is frozen.

## Functional skeleton gate

Pass these checks before full visual development:

- Type check passes.
- Production build passes.
- Server, MP3, and timeline return HTTP 200. Validate the SRT locally; do not expose it as a runtime caption resource.
- Timeline validation passes.
- Space plays and pauses.
- Left and right move between timeline beats or pages according to the approved interaction.
- `?at=` and `?review=1` behave correctly.
- Native muted autoplay is attempted in `?auto=1` mode.
- The clock element's ownership matches the recorded mode: in silent mode the muted MP3 at volume 0 drives the page; in audible mode the audible element drives the page and the silent MP3 sits at volume 0.
- `node scripts/validate-silent-runtime.mjs <src> --mode <mode>` passes for the recorded mode, and the three runtime properties that static scan cannot cover are verified by hand: clock ownership, exactly one sound source, and a measured (not guessed) `BIAS`.
- The rendered page contains no subtitle or caption component, no text track, no visible SRT cue text, and no caption query parameter or control — unless captions were explicitly requested and the decision is recorded in `visual-direction.md`.
- No UI control exposes volume or mute in either mode. `?sound=1` / `?sound=0` are URL parameters, not controls.
- When the deck is intended for MP4 delivery, the recording handoff is in place: `?review=1` exposes `window.__setT` and `window.__rec = { duration, pages, renderAt, events }`, `__rec.pages[i].start` matches `timeline.pages[i].start` within 0.02s, `?review=1` does not auto-play, and any `<video>` is exposed through `window.__videoEl` + `window.__videoLocalT` rather than playing itself.
- A visible manual start control appears if autoplay is blocked.
- A dedicated Microsoft Edge run uses the same executable, isolated profile, URL, and autoplay arguments as the one-click launcher.
- After waiting at least one second in that Edge run, `currentTime` is greater than zero and `paused` is false.
- Accelerated full playback reaches `ended`, exact duration, last page, and last beat.
- No console errors occur.
- The motion gate passes for the PPT density this package targets (`scripts/audit-motion.mjs`):
  - **M1** every page tail is static for no more than 4s
  - **M2** no `@keyframes` or `animation:` drives continuous motion
  - **M3** each page carries at least one real anchor (graphic node present; per-page presence still confirmed by eye)
  - **M4** every beat produces a visible frame change (≥ 0.15% between two frames 0.35s apart)
  - **M5** no page exceeds 8 beats — beyond that the content belongs to `anchor-driven-demo-page`
- Any `SKIP` from that gate is recorded in `review-results.json` as unverified. A skipped check is never a pass.
- "A quantity is advancing" is confirmed by eye on two frames per beat. A frame diff proves only that something changed, not that it is a measured change.

Do not begin full visual implementation until all P0 checks pass.

## Screenshot Review

At 1920 x 1080 capture every page at:

1. Page start
2. Page midpoint
3. Immediately before page end

Check:

- Text overflow
- Empty or black scene
- Image stretching or unintended cropping
- Incomplete animation
- Residual elements from another page
- Text contrast and readability
- Stable safe margins
- Meaningful visual relationship
- Approved text density
- Correct asset role
- No play-gate overlay, start button, review badge, or debug HUD captured in the frame
- Entries not yet narrated are fully hidden, not semi-transparent

Create start, middle, and end contact sheets when practical. Inspect dense pages at full resolution.

## Final playback Review

After visual implementation, rerun the entire functional suite and add:

- Normal-speed playback sample at the start
- Normal-speed samples across selected page and beat boundaries
- Normal-speed final segment
- Accelerated complete playback
- Final launcher test from a clean invocation
- Final console-error capture
- When a recording or standalone SFX track was requested: frozen HTML hash unchanged, no captured control UI, exact duration match, and mix peak below -3 dB

The launcher must open the intended project and port. For reliable muted autoplay on Windows, prefer a dedicated Edge profile plus `--autoplay-policy=no-user-gesture-required`. Keep a manual start fallback because browser policy can still vary.

## Visual-selection compliance

- `visual-direction.md` records approval of one of five directions.
- Design dials and text density are recorded.
- One theme, accent, and shape system remain consistent.
- Page relationships vary with content.
- Consecutive pages avoid the same generic card grid.
- Motion communicates hierarchy, storytelling, feedback, or state change, and satisfies `MOTION-BASELINE.md`: one real anchor per page, at least one visible change per beat, no page tail static for more than 4s, and no whole-block fade treated as motion.

## Evidence and frozen-artifact gate

Apply CONTENT-EVIDENCE-ITERATION.md. Inspect real source images before assigning roles; validate page/asset/narration mapping, accurate historical metrics and masked-image usage. Include image captions and new panels in safe-margin review. Sample before and after procedural image switches.

Complete building and resource embedding before browser tests. Place UTF-8 declaration within the first 1024 bytes, check document.characterSet and representative Chinese text, then freeze the HTML and bind reports to its hash. Use separate screenshot directories for each test runner. Never inherit old PASS JSON, overwrite comparison frames concurrently, or remove failing assertions to claim regression success. Report unperformed pixel or manual-listening checks explicitly.

The invariants above apply per mode, not globally. Silent mode and audible mode are both first-class deliverables, and `timeline.json` records which one applies via `clock`. Audible mode is not "a silent runtime that failed" — it is a different contract with different tests. What is never allowed in either mode: two elements producing sound at once, a clock that is not the sound source, or a volume/mute UI control.

## Repair and release rule

Fix each failure and rerun the full affected suite. When a visual change could affect runtime, rerun the complete functional suite. Stop after three complete repair rounds for the same unresolved issue, record evidence in `BLOCKED.md`, and report the project as blocked or incomplete.

A completed delivery claim requires:

- No open P0 or P1 issue
- Functional skeleton gate passed before full visual work
- Final full regression passed
- Actual command output recorded
- `BLOCKED.md` contains `无`
