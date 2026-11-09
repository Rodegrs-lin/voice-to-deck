# NOTICE · 来源与独立性声明

## 一、本包是独立的

本包**不依赖任何其他 Skill**。装这一个目录即可运行。

原始版本在任务开始前要求先读取两个外部 Skill：

| 原依赖 | 实测情况 | 本包的处理 |
|---|---|---|
| `web-video-presentation` | 其 `SKILL.md` 仅 2.4KB，主体是一句「去用 github.com/ConardLi/garden-skills 的上游指令」；真资产是 `themes/` 主题库 | 主题库按 MIT **内置**到 `themes/`；16:9 舞台、章节工艺、录屏模式由本包自己的 `references/` 承载；不再读取外部 SKILL.md |
| `design-taste-frontend` | 其 `SKILL.md` 仅 707 字节，全文是一句「去用 github.com/leonxlnx/taste-skill 的上游指令」，**本身不含任何内容** | 未复制其任何文本。设计审读流程与三个设计旋钮（`DESIGN_VARIANCE` / `MOTION_INTENSITY` / `VISUAL_DENSITY`）在 `references/THEME-SELECTION.md` 中以**本包自己的工作定义**（含 1/5/10 三档释义）给出 |

结论：本包**没有搬运任何上游的方法论文本或程序逻辑**；唯一随包分发的外部资产是 MIT 授权的主题库，见下。

## 二、themes/ 的授权

- 来源：ConardLi / garden-skills · `skills/web-video-presentation/themes`
- 许可：**MIT License, Copyright (c) 2026**，全文见 `themes/LICENSE`
- 详述与使用边界：`themes/_SOURCE.md`

MIT 要求保留版权与许可声明，本包已履行。这批主题**不是**本包的原创资产，分发与展示时请保留来源。

## 三、属于本包自身的内容

以下内容为本包自己的规程与实战沉淀，可自由引用：

- **时钟必须等于声源**：静音档（MP3 计时、不出声）与有声档（发声元素自己计时）两档契约；`BIAS` 实测补偿、0.3s 阈值跟随校正、`?sound` 参数与单文件默认值
- 页边界按音轨**真实起音**重排（能量包络 + 滞回 + 逐页吸附）及其量化判据
- 「页与口播的内容对齐必须单独验」的核对方法（时间对齐 ≠ 内容对齐）
- 页面「空白感」三因分类与对应修法
- 五方向 × 文字密度三档的**同一内容**样张选型门
- 交付物清单与逐项带证据的验收记录格式
- 三个设计旋钮在本包语境下的工作定义
- 检查器自身的两个坑：`undefined < x` 恒为假造成的假通过；浏览器 profile（`.edge-profile`）里的压缩 JS 造成的假阳性

## 四、本包不做什么

- 不做 TTS，不调用任何图像生成或语音 API，不需要 API Key
- 默认不在画面里渲染字幕；要字幕属于显式变更，需记录并重跑验收
- 不自己渲染 MP4；成片交接给 `html-to-mp4-recording`（页面需在 `?review=1` 下暴露 `window.__rec`）。音效轨见 `references/RECORDING-AND-SFX.md`
- 不做音量滑块、静音按钮这类运行时控件
- 不修改用户的任何源文件
