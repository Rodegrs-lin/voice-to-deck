---
name: voice-to-deck
description: 把一条口播音轨（配 SRT 与素材）做成可录制、可双击播放的 1920×1080 动态演示页——页、拍、进度全部由媒体时间驱动。两种时钟模式：静音档（MP3 只计时不出声，配音后期合）与有声档（出声的媒体自己当时钟，双击就有声音）。Turn one narration audio file into a recordable 1920x1080 dynamic deck driven by media time — silent mode (the muted track is the clock) or audible mode (the sound-producing element is the clock). Use when the cover must be derived from the full source, the user must pick among five visual directions and a text-density level, and playback correctness needs evidence-backed review. Also use when 「音画对不上」/ "sound and picture do not match" and the cause has to be located. Do not use for TTS generation. An MP4 is produced by handing the finished page to html-to-mp4-recording, not by this package. Do not use when the narration is dense enough that every sentence needs its own graphic — that is anchor-driven-demo-page.
---

# voice-to-deck

帮已经录好口播的人把画面做出来：一条音轨 + 字幕 + 素材 → 一个能双击播放、也能录成片的 1920×1080 动态演示页。

Create a recordable dynamic deck whose page, beat, and progress state comes from media time and never from a timer. Pick one clock contract and hold it for the whole deck: **silent** (the muted track is the clock, nothing is audible) or **audible** (the element that makes sound is the clock). Use SRT only to derive semantic timing boundaries. Treat every source input as read-only.

## 三条只有做过长片才总结出来的规矩

这三条是这个包里最贵的部分，都是 392 秒实片踩出来的。开工前先读，它们比后面的流程更决定成片能不能看。

1. **时钟必须等于声源。** 出声的是谁，就用谁的 `currentTime`；另一条媒体只做参考。音画对不上，十次有九次是这条被违背。→ [references/CLOCK-AND-SYNC.md](references/CLOCK-AND-SYNC.md)
2. **页边界必须按「真实开口」重排，不能直接用字幕时间。** 字幕句首普遍比实际开口早，实测 16 页里 4 页早 0.8–1.3 秒，且逐页不同，加常数治不了。→ 本文件「页边界必须按真实开口重排」一节
3. **时间对齐不等于内容对齐。** 每页时间刻度都准，但这一页讲的根本不是口播当下在讲的事——实测 16 页从第 9 页起整体错位一页；症状是用户只说「音画对不上」，而人会一直去校时间（我校了三轮，全白费）。→ 本文件「内容对齐必须单独验」一节

第四件最常被投诉的事是「画面空着等」，它有**三个不同原因、修法完全不同**（元素迟迟不出现 / 元素出完了但页尾还长 / 画面完全不动）→ 见「空白感来自三个不同原因」一节

## Self-contained package

This skill installs as one directory and requires no companion skill. Everything it needs is inside the package:

- `themes/` — 23 theme token sets, each `<id>/theme.json` + `<id>/tokens.css`. Enumerate them with `scripts/list-themes.mjs`. Never hardcode a theme list, and never write an absolute install path into the skill or its references.
- `references/` — the clock and audio-sync contract, the motion baseline (PPT density, not motion-film density), the 16:9 stage system, chapter craft, recording patterns, design read, the three design dials, layout variety, anti-slop review, and the review checklist.
- `scripts/` — SRT parsing, theme enumeration, timeline validation, silent-runtime validation.

Where a general presentation skill would add audible playback, TTS, an audio toggle, captions, or subtitles, this package's silent contract wins. Do not import those behaviors, and do not add an unmute path.

## Non-negotiable invariants

**The clock equals the sound source.** Read [references/CLOCK-AND-SYNC.md](references/CLOCK-AND-SYNC.md) before building any runtime. Choose one mode and record it in `timeline.json` as `clock`:

- `clock: "mp3"` — silent mode. The full MP3 is hidden, `muted`, `volume = 0`, and is the only playback clock. Nothing is audible; narration and sound effects are added later in the editor. Subtract the measured `BIAS` (0.10s in the reference project).
- `clock: "dh(video)"` — audible mode. The element that actually makes sound is the clock. The silent MP3 stays `muted` at `volume = 0` and is used only for time mapping and duration checks. `BIAS` is 0, and a 0.3s threshold corrects drift between the tracks.

- Derive page, beat, and progress state from the clock element's `currentTime`. Never from a second media element, never from a wall clock.
- Use SRT cue boundaries only to build and review the timeline; never let SRT drive playback state.
- Do not use `setTimeout`, `setInterval`, or wall-clock time to drive presentation timing. Waiting for `readyState` before calling `play()` is not a violation.
- A page has no visible subtitles by default. If the user explicitly asks for on-screen captions, treat it as a documented contract change: record it in `visual-direction.md`, keep the SRT readable, and re-run the review. Do not add captions silently.
- In silent mode there is no unmute path at all: no `M` shortcut, sound button, volume control, audible mode, or code that can set `muted` to false or `volume` above 0.
- In audible mode the audible element's volume is fixed at load (0.72 in the reference project) and is never exposed as a user-facing control. Only one element may produce sound; never play two copies of the narration.
- `?sound=1` / `?sound=0` are URL parameters for review and recording, not UI. Do not build a sound toggle into the page.
- Do not synthesize TTS and do not modify source audio or captions. Do not render video inside this package: the MP4 path is a handoff to [`html-to-mp4-recording`](https://github.com/Rodegrs-lin/html-to-mp4-recording), and the page must expose `window.__rec` for it.
- Keep MP3, SRT, narration, PDF, Word, images, and linked source documents read-only.
- Build a fixed 1920 x 1080 stage with Vite, React, and TypeScript.
- Inspect and normalize only the materials the user actually provides. Missing optional material does not block the project.
- Treat text-heavy screenshots as document pages by default. Read and extract their content before deciding how the content appears in the PPT.
- When a full SOP or article is provided, derive the cover from the complete document. Do not use a source-document screenshot as the finished cover unless the user explicitly asks for that treatment.
- Build and pass a simple end-to-end playable skeleton before investing in full visual polish.
- Functional correctness, content correctness, and readability take priority over decorative refinement.
- Keep every runtime and recording path silent so the source MP3 and SRT can be added separately in the editor.

## Workflow router

1. Before content work, read [references/INPUT-SPEC.md](references/INPUT-SPEC.md). Normalize and classify the materials that were provided.
2. Read [references/TASKBOOK.md](references/TASKBOOK.md) for the complete workflow, checkpoints, and deliverables.
3. Before implementation, read [references/THEME-SELECTION.md](references/THEME-SELECTION.md). Analyze the complete narration and supplied assets first, then shortlist suitable templates and verified visual references. Show the user same-content opening, evidence, and procedure samples before asking for approval. Inspect installed theme JSON files dynamically; use `themes-gallery.html` as a browsing aid, not as a substitute for content-specific selection or a mandatory separate approval round. Record the chosen theme id and reference sources. Offer exactly five directions unless the user requests another count; do not invent uninspected templates or start the full deck before approval.
4. Before creating `timeline.json`, read [references/TIMELINE-SCHEMA.md](references/TIMELINE-SCHEMA.md). Decide `clock` (`mp3` for silent, `dh(video)` for audible) at this step. It is a hard constraint, not an implementation detail.
5. Before writing any playback clock or media element, read [references/CLOCK-AND-SYNC.md](references/CLOCK-AND-SYNC.md). Implement exactly one mode, and run the clock-ownership check for that mode before any visual polish.
6. Before writing any animation, read [references/MOTION-BASELINE.md](references/MOTION-BASELINE.md). This package builds a dynamic PPT, not a motion film: every page needs one real anchor and every beat needs a visible change, but **not** every sentence needs its own graphic. When the narration is dense enough that each sentence deserves its own graphic, hand the project to `anchor-driven-demo-page` instead of cramming density in here. Run `scripts/audit-motion.mjs` (M1/M5 at minimum) as soon as the skeleton plays; a dead page tail or a density that belongs to the other skill must be caught before visual polish.
7. Before visual implementation and again before delivery, read and execute [references/REVIEW-CHECKLIST.md](references/REVIEW-CHECKLIST.md).
8. When the user asks for an MP4 or a standalone sound-effects track, read [references/RECORDING-AND-SFX.md](references/RECORDING-AND-SFX.md) for the track, and hand the finished page to **[`html-to-mp4-recording`](https://github.com/Rodegrs-lin/html-to-mp4-recording)** (`record_vite.mjs`, form B) for the video. This package builds the page and the sound-effects track; it does not render video itself. Run `scripts/audit-motion.mjs` first — frame-by-frame capture records exactly what is there and never notices a dead page tail or an unchanged beat. The page must expose `window.__rec` for the recorder; see the recording handoff section in `references/TIMELINE-SCHEMA.md`.

## Content-first selection and evidence retrofit

Read [references/CONTENT-EVIDENCE-ITERATION.md](references/CONTENT-EVIDENCE-ITERATION.md) before visual selection, when adding source screenshots or masking account names, and before final release. This project's reusable workflow belongs here regardless of which clock mode the deliverable uses. Apply source-image inspection, page/asset/narration mapping, precise masking, UTF-8 front-loading, frozen-artifact testing, and isolated screenshot output directories. Never copy old PASS results into a new version or delete a failing assertion to claim success.

Audible output is a first-class mode, not a degraded derivative of the silent one. Choose the mode from how the deliverable will be used — recording and post-production favour silent mode; a file people double-click and watch directly favours audible mode. Record the choice in `timeline.json`, then run the matching clock-ownership check. Both modes keep the same page structure, beats, and evidence discipline. What must never appear in either mode: a volume or mute UI control, two elements producing sound at once, or a clock that is not the sound source.

## Required plan checkpoint

Before full visual implementation, present one combined checkpoint containing:

- Cover copy derived from the complete available source
- PPT structure, core message per page, and estimated page count
- Placement and role of each provided image or asset
- The user-chosen theme `id` (selected from `themes-gallery.html`) and how the five visual-direction previews are derived from or consistent with it
- Exactly five visual-direction previews using the same real content, anchored on the chosen theme
- `DESIGN_VARIANCE`, `MOTION_INTENSITY`, and `VISUAL_DENSITY`
- A text-density choice: `rich`, `concise`, or a user-defined custom level
- Any blocker found in provided material

Ask the user to approve the cover, structure, visual direction, design dials, text density, and asset usage together. Do not require optional materials the user did not provide.

## Execution discipline

- At session start, read existing `PROGRESS.md` and `BLOCKED.md` if present.
- Update `PROGRESS.md` after every completed phase.
- Put uncertain provided inputs in `BLOCKED.md` and continue unaffected work.
- Treat user-specified page counts, source ranges, and asset placements as hard constraints.
- When no `[PPT重点]` markers exist, extract core conclusions, procedures, data, cases, risks, misconceptions, and actions from the available source.
- Use page-level semantic scenes and intra-page beats. Prefer a beat reveal when it preserves continuity better than a page switch.
- Run deterministic scripts when available.
- Record actual commands, results, failures, repairs, and reruns in `review-report.md`.
- A P0 or P1 Review failure blocks a completed delivery claim. After three full repair rounds for the same failure, record it in `BLOCKED.md` and report the project as blocked or incomplete.

## Bundled scripts

```powershell
node scripts\parse-srt.mjs <captions.srt> --audio-duration <seconds>
node scripts\list-themes.mjs
node scripts\validate-timeline.mjs <timeline.json> --duration <seconds> --srt <captions.srt>
node scripts\validate-silent-runtime.mjs <presentation-src> --mode silent
node scripts\validate-silent-runtime.mjs <presentation-src> --mode sound
node scripts\audit-motion.mjs --timeline <timeline.json> --src <presentation-src> --exclude lab,backup
node scripts\audit-motion.mjs --timeline <timeline.json> --src <presentation-src> --url "http://127.0.0.1:4321/index.html?review=1"
```

`validate-silent-runtime.mjs` proves only what source text can prove. In `--mode sound` it also prints the three properties it cannot prove — clock ownership, single sound source, measured `BIAS` — which must be checked at runtime per `references/CLOCK-AND-SYNC.md`. It skips hidden directories; browser profiles such as `.edge-profile` contain minified driver JS that produces false positives.

`audit-motion.mjs` enforces `references/MOTION-BASELINE.md`. M1 (dead page tail) and M5 (page density) always run; M2/M3 need `--src`; M4 (a visible change per beat) needs `--url` plus playwright-core. **Always pass `--exclude` for any trial branch, reference implementation, or backup folder in the source tree** — unexcluded branches report their own defects as if they were this delivery's. **A `SKIP` is an unverified check, never a pass** — the report lists every skipped id separately.

Copy the scripts into the output project when repeatable local validation is useful. Create a project-specific browser playback test that follows the Review contract.

## Required delivery

Deliver `input-report.json`, `assets-manifest.json`, `source-map.md`, `cover-brief.md`, `timeline.json`, `outline.md`, `ppt-focus.md`, `visual-direction.md`, `review-report.md`, `review-results.json`, `PROGRESS.md`, `BLOCKED.md`, source code, review frames, a fixed recording URL, and a one-click Windows launcher. Omit source-derived files only when their corresponding optional input was not provided, and explain the omission.

Report actual evidence for duration, input validation, timeline validation, clock provenance, type checking, production build, HTTP checks, screenshot Review, controls, dedicated-browser autoplay, and full playback Review.


## 页边界必须按「真实开口」重排，不能直接用字幕时间（2026-10-27 实测）

字幕（ASR 或剪映导出）的句首普遍比真人/配音的**实际开口早**。直接拿 cue.start 当翻页时刻，观众会看到「话还没出来，画面已经换了」。

实测一条 392 秒的口播：16 页里有 4 页提前 0.8–1.3 秒（最大 −1.26s），另有 5 页几乎零偏差——**所以这不是整体偏移，逐页不同，不能靠加个常数解决**。

做法：

1. 从**实际出声的那条音轨**算 20ms 能量包络（不是字幕）。
2. 静音/发声分段：`thr_open = max(底噪×3.2, 峰值×6%)`，`thr_hold = thr_open×0.55`（滞回），静音持续 ≥120ms 才算「新起音」。
3. 每页 / 每拍的首句时间**吸附到最近的起音点**（窗口 ±1.2s）；吸附不到就保持不变（说明那句话没有停顿，属于连续语句，中途硬切是正常的）。
4. 页 end 取下一页 start；拍 end 取下一拍 start；保持首尾相接、无缝隙。
5. 首页强制从 0 开始（否则会算出负时间）。

验证脚本要输出「每个页/拍距离最近起音点多少秒」和「是否落在静音段里」。合格线：**不得有页或拍落在 >0.3s 的静音段中间**；落在语句内部的偏差是允许的（连续讲述中的正常切点）。

副产品：这套重排会顺带解决「有的地方停太长、有的地方停太短」——因为页面停留时长变成了真实气口长度，而不是字幕切分的残差。


## 页与口播的「内容对齐」必须单独验，时间对齐不等于内容对齐（2026-10-28 实测）

这是最容易漏、也最难发现的一类错误：**每一页的时间刻度都准，但这一页讲的根本不是口播当下在讲的事。**

实测一条 392 秒口播：16 页里前 8 页正确，**第 9 页起整体错位一页**——页面在讲「出片抽卡」，口播在讲「发给豆包出脚本」。因为页是按「六步」机械切的，而口播实际有 **12 个段落**（豆包出脚本 / 出片工具 / 抽卡 / 配音 / 音画对齐 / 剪辑 / 封面 / 养号 / 节奏 / 数据 / 实话 / 收尾）。

**症状**：用户只会说「音画对不上」，而你会一直去校时间（我修了三轮时间，全白费）。

**必须做的核对**（跑一次就够，但每次改页都要重跑）：

1. 从 timeline 打印每页 `pageNumber / id / narration`（口播文本），逐页读一遍；
2. 起服务后用 `?review=1&at=<页首+1.5s>` 抓每页 **渲染出来的标题**（`.page-title` 的 textContent）；
3. 把「页面标题」和「口播首句」并排打印，人工过一遍——出现「页面在讲 A、口播在讲 B」就是错位。

**判断段落边界的正确方法**：不要按自己的内容框架（六步/七步）切，要**按口播原文切**。把 SRT 全文导出来，从上到下读到话题真的变了再切一刀。切完数一下总页数，和原设计差多少就加/减多少页——这一条比时间校准重要一个数量级。

**顺带**：一处口播如果同时讲了两件不同的事（如「豆包练手」+「即梦正式出片」），宁可拆成两页，不要压成一页；反之两句在说同一件事，不要因为字数够就拆。

## 页面「空白感」来自三个不同原因，修法不同

用户说「等待太长 / 太空」时，先分清是哪一类：

| 症状 | 量化判据 | 修法 |
|---|---|---|
| 页内元素迟迟不出现，中间大片空白 | 每页「拍间最大间隔」> 5s | 给页内元素加**骨架占位**：未到时刻 opacity 0.10 而不是 0，页面从第一帧就是完整结构 |
| 最后一个元素出现后，画面静止等到页尾 | 末拍→页尾 > 4s | 把最后一拍的锚点推到该页最后一句 |
| 元素都出现了，但画面完全不动 | 该页无 Ken Burns / 进度 / 高亮 | 加页内进度线（细线随 t 推进）+ 列表页加「当前行高亮」 |

**注意**：骨架占位透明度别超过 0.12。0.15 时未到的文字已经能读出来，画面会像「重影」，比空白更脏。
