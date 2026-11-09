#!/usr/bin/env node
/*
 * Reproducible showcase capture. Produces the stills used in README/docs.
 *
 *   # 按时间点截
 *   node capture-shots.cjs --url http://127.0.0.1:4321 --out docs --at 7,94.2,321.8
 *
 *   # 按 timeline 每页取中后段（推荐，跟页内容对得上）
 *   node capture-shots.cjs --url http://127.0.0.1:4321 --timeline timeline.json --out docs --limit 6
 *
 * 为什么要有这个脚本：README 里的成品图必须可复现，否则换个人下次改版就
 * 只能靠"找几张旧图凑"，图会慢慢跟产物对不上。这个脚本和截图一起入库。
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : fallback;
};

const url = flag('--url');
const outDir = flag('--out', 'docs');
const timelinePath = flag('--timeline');
const atList = flag('--at');
const limit = Number(flag('--limit', '0'));
const waitMs = Number(flag('--wait', '3200'));
const width = Number(flag('--width', '1920'));
const height = Number(flag('--height', '1080'));
const prefix = flag('--prefix', 'shot');

if (!url) {
  console.error('usage: node capture-shots.cjs --url <http://host:port> [--timeline tl.json | --at 1,2,3] [--out docs]');
  process.exit(2);
}

/* playwright-core 常装在全局 workspace，按几个位置找 */
function loadPlaywright() {
  const home = process.env.HOME ?? process.env.USERPROFILE ?? '';
  const candidates = [
    'playwright-core',
    process.env.NODE_PATH ? path.join(process.env.NODE_PATH, 'playwright-core') : null,
    home ? path.join(home, '.workbuddy', 'binaries', 'node', 'workspace', 'node_modules', 'playwright-core') : null,
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch {
      /* next */
    }
  }
  return null;
}

/* ---------- 决定要截哪些时刻 ---------- */
const shots = [];

if (atList) {
  atList.split(',').map((s) => Number(s.trim())).filter(Number.isFinite).forEach((at, i) => {
    shots.push({ name: `${prefix}-${String(i + 1).padStart(2, '0')}`, at });
  });
} else if (timelinePath) {
  const timeline = JSON.parse(fs.readFileSync(timelinePath, 'utf8'));
  const pages = Array.isArray(timeline) ? timeline : timeline.pages ?? [];
  const picked = limit > 0 ? pages.slice(0, limit) : pages;
  picked.forEach((page, i) => {
    const start = Number(page.start);
    const end = Number(page.end);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return;
    /* 取 62%：够后，元素基本都落定了，又不是页尾的死画面 */
    const at = start + (end - start) * 0.62;
    shots.push({ name: `${prefix}-${String(i + 1).padStart(2, '0')}-${page.id ?? 'page'}`, at });
  });
} else {
  console.error('需要一个时间来源：--at 7,94.2 或 --timeline timeline.json');
  process.exit(2);
}

if (!shots.length) {
  console.error('没有可截的时刻');
  process.exit(2);
}

const pw = loadPlaywright();
if (!pw) {
  console.error('找不到 playwright-core。先装：npm i -D playwright-core');
  process.exit(2);
}

fs.mkdirSync(outDir, { recursive: true });

(async () => {
  const browser = await pw.chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  let written = 0;

  for (const shot of shots) {
    const target = `${url.replace(/\/$/, '')}/index.html?at=${shot.at.toFixed(2)}`;
    await page.goto(target, { waitUntil: 'load' });
    await page.waitForTimeout(waitMs);
    const file = path.join(outDir, `${shot.name}.png`);
    await page.screenshot({ path: file });
    const kb = Math.round(fs.statSync(file).size / 1024);
    console.log(`shot ${shot.name} at=${shot.at.toFixed(2)}s -> ${file} (${kb} KB)`);
    written++;
  }

  await browser.close();
  console.log(`done: ${written} files in ${outDir}`);
})();
