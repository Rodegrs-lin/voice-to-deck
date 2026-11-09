# themes/ 的来源与授权

## 来源

本目录下的 23 套主题（每套 `<id>/theme.json` + `<id>/tokens.css`）来自：

- 项目：**ConardLi / garden-skills**
- 路径：`skills/web-video-presentation/themes`
- 仓库：https://github.com/ConardLi/garden-skills
- 许可证：**MIT License**（全文见本目录 `LICENSE`，Copyright (c) 2026）

## 为什么要随包分发

原 Skill `web-video-presentation` 在多数安装方式里只带一份指向上游仓库的转发说明，主题库需要另外安装。为了让本包做到「装一个目录就能用」，这里把主题库内置一份，并按 MIT 要求保留原始版权与许可声明。

## 使用边界

- MIT 允许复制、修改、再分发、商用，**条件是保留版权声明与许可声明**。本目录的 `LICENSE` 与这份说明就是履行该条件。
- 因此可以随本包一起分发，但**不要把 themes/ 里的主题描述成自己的原创作品**。它们是 ConardLi 的设计资产。
- 主题是**数据资产**（`theme.json` 元数据 + `tokens.css` 设计令牌），不含上游的程序逻辑。本包不复制上游的任何流程、脚本或方法论文本。
- 若要升级主题：把新版 `themes/` 覆盖进来即可，`scripts/list-themes.mjs` 会自动枚举，无需改代码。用户也可以用自己的主题库：`node scripts/list-themes.mjs /path/to/themes`。

## 上游更新检查

- 主题是否新增或改名：看 https://github.com/ConardLi/garden-skills/tree/main/skills/web-video-presentation/themes
- 本包内置版本：23 套（截至 2026-11-09）
