#!/usr/bin/env node
/*
 * Motion gate for the PPT-density contract (references/MOTION-BASELINE.md).
 *
 *   node audit-motion.mjs --timeline <timeline.json> [--src <presentation/src>]
 *                         [--url <http://...?review=1>] [--min-change 0.0015]
 *
 * Static checks always run. Frame checks need --url plus playwright-core; if it
 * is missing they report SKIP, and SKIP is never a pass.
 *
 * What this gate can prove, and what it cannot:
 *   M1 page tail is not a dead frame      — provable from timeline arithmetic
 *   M2 no CSS animation drives motion     — provable from source text
 *   M3 each page has a real anchor        — weak signal only (a graphic node exists)
 *   M4 each beat has a visible change     — provable by frame diff, needs a browser
 *   M5 page density matches this skill    — provable from beat counts
 *
 * "A quantity is advancing" (vs a whole block fading in) is NOT provable here.
 * That judgement stays with MOTION-BASELINE.md's two-frame comparison rule.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/* ---------- args ---------- */
const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : fallback;
};
const timelinePath = flag('--timeline');
const srcDir = flag('--src');
const url = flag('--url');
const minChange = Number(flag('--min-change', '0.0015'));
const tailLimit = Number(flag('--tail-limit', '4'));
const beatLimit = Number(flag('--beat-limit', '8'));
const limit = Number(flag('--limit', '0')); // 0 = 全测；>0 只测前 n 拍，用于冒烟
/* 扫描边界：试验支线、参考实现、备份目录一律排除。
   不设边界时，门禁会把别的分支的毛病算到这个项目头上——实测被 ovl/ 坑过一次。 */
const excludeDirs = new Set(
  (flag('--exclude', '') ?? '').split(',').map((s) => s.trim()).filter(Boolean),
);

/* playwright-core 多数时候装在全局 workspace 而不是包内，按几个常见位置依次找 */
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
      /* try next */
    }
  }
  return null;
}

if (!timelinePath) {
  console.error('usage: node audit-motion.mjs --timeline <timeline.json> [--src <src>] [--url <url>]');
  process.exit(2);
}

const results = [];
const add = (id, name, level, detail) => results.push({ id, name, level, detail });

/* ---------- timeline ---------- */
let timeline;
try {
  timeline = JSON.parse(fs.readFileSync(timelinePath, 'utf8'));
} catch (error) {
  console.error(`cannot read timeline: ${error.message}`);
  process.exit(2);
}
const pages = Array.isArray(timeline) ? timeline : timeline.pages;
if (!Array.isArray(pages) || pages.length === 0) {
  console.error('timeline has no pages');
  process.exit(2);
}

/* ---------- M1: page tail must not be dead ---------- */
{
  const dead = [];
  const tight = [];
  for (const page of pages) {
    const beats = Array.isArray(page.beats) ? page.beats : [];
    if (!beats.length) continue;
    const last = beats[beats.length - 1];
    /* 判据写成 !(x >= min) 而不是 x < min：拿不到值必须暴露，不能静默通过 */
    const lastEnd = Number(last.end);
    const pageEnd = Number(page.end);
    if (!Number.isFinite(lastEnd) || !Number.isFinite(pageEnd)) {
      add('M1', '页尾不是死画面', 'FAIL', `page ${page.id}: beat.end 或 page.end 不是数字`);
      continue;
    }
    const gap = pageEnd - lastEnd;
    if (!(gap <= tailLimit)) dead.push(`${page.id} 空 ${gap.toFixed(2)}s`);
    else if (gap > tailLimit * 0.6) tight.push(`${page.id} ${gap.toFixed(2)}s`);
  }
  if (dead.length) add('M1', '页尾不是死画面', 'FAIL', `>${tailLimit}s：` + dead.slice(0, 6).join(' / '));
  else if (tight.length) add('M1', '页尾不是死画面', 'WARN', `接近上限：` + tight.slice(0, 6).join(' / '));
  else add('M1', '页尾不是死画面', 'PASS', `${pages.length} 页全部 ≤ ${tailLimit}s`);
}

/* ---------- M5: page density must match this skill ---------- */
{
  let totalBeats = 0;
  const dense = [];
  for (const page of pages) {
    const n = Array.isArray(page.beats) ? page.beats.length : 0;
    totalBeats += n;
    if (n > beatLimit) dense.push(`${page.id}(${n})`);
  }
  const avg = (totalBeats / pages.length).toFixed(1);
  if (dense.length) {
    add('M5', '页密度属于 PPT 档', 'WARN',
      `${dense.length} 页超过 ${beatLimit} 个拍：${dense.slice(0, 5).join(' ')} — 这种密度可能更适合 anchor-driven-demo-page`);
  } else {
    add('M5', '页密度属于 PPT 档', 'PASS', `${pages.length} 页 / ${totalBeats} 拍 / 平均 ${avg} 拍每页`);
  }
}

/* ---------- M2 + M3: source scan ---------- */
if (srcDir) {
  const exts = new Set(['.ts', '.tsx', '.js', '.jsx', '.css']);
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      if (entry.name.startsWith('.')) continue;
      if (entry.isDirectory() && excludeDirs.has(entry.name)) continue;
      const target = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(target);
      else if (exts.has(path.extname(entry.name))) files.push(target);
    }
  };
  walk(path.resolve(srcDir));
  const texts = files.map((file) => ({ file, text: fs.readFileSync(file, 'utf8') }));

  /* M2 — CSS animation driving continuous motion */
  const cssHits = [];
  for (const { file, text } of texts) {
    text.split(/\r?\n/).forEach((line, i) => {
      if (/@keyframes/.test(line)) cssHits.push(`${path.basename(file)}:${i + 1} @keyframes`);
      else if (/^\s*(animation|animation-name)\s*:/.test(line)) cssHits.push(`${path.basename(file)}:${i + 1} animation`);
    });
  }
  if (cssHits.length) add('M2', '无 CSS 动画驱动运动', 'FAIL', cssHits.slice(0, 6).join(' / '));
  else add('M2', '无 CSS 动画驱动运动', 'PASS', `${files.length} 个源文件无 @keyframes / animation`);

  /* M3 — a real anchor per page (weak signal: a graphic node exists somewhere) */
  const graphic = /<img\b|<svg\b|<video\b|<canvas\b|backgroundImage/;
  const hasGraphic = texts.some(({ text }) => graphic.test(text));
  if (!hasGraphic) {
    add('M3', '每页有实物锚点', 'FAIL', '源码里找不到 img / svg / video / canvas / backgroundImage');
  } else {
    add('M3', '每页有实物锚点', 'WARN',
      '源码里有图形节点，但"每页至少一个"需要在渲染后逐页确认——本条只证明"用过图形"');
  }
} else {
  add('M2', '无 CSS 动画驱动运动', 'SKIP', '未传 --src');
  add('M3', '每页有实物锚点', 'SKIP', '未传 --src');
}

/* ---------- M4: each beat has a visible change (needs browser) ---------- */
if (!url) {
  add('M4', '每拍都有可见变化', 'SKIP', '未传 --url；SKIP 不等于通过');
} else {
  let chromium = null;
  const pw = loadPlaywright();
  if (pw) chromium = pw.chromium;
  if (!pw) {
    add('M4', '每拍都有可见变化', 'SKIP', '找不到 playwright-core；SKIP 不等于通过');
  }
  if (chromium) {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    const misses = [];
    const covered = [];
    try {
      await page.goto(url, { waitUntil: 'load' });
      await page.waitForTimeout(1200);
      const hasSetT = await page.evaluate(() => typeof window.__setT === 'function');
      if (!hasSetT) {
        add('M4', '每拍都有可见变化', 'FAIL', '页面未暴露 window.__setT(t)，无法逐帧推进');
      } else {
        let tested = 0;
        outer: for (const pg of pages) {
          for (const beat of pg.beats ?? []) {
            if (limit > 0 && tested >= limit) break outer;
            const t0 = Number(beat.start);
            const t1 = Number(beat.end);
            if (!Number.isFinite(t0) || !Number.isFinite(t1) || t1 - t0 < 0.4) continue;
            const at = t0 + (t1 - t0) * 0.25;
            await page.evaluate((v) => window.__setT(v), at);
            await page.waitForTimeout(140);
            const a = await page.screenshot({ clip: { x: 0, y: 0, width: 1920, height: 1080 } });
            await page.evaluate((v) => window.__setT(v), Math.min(at + 0.35, t1));
            await page.waitForTimeout(140);
            const b = await page.screenshot({ clip: { x: 0, y: 0, width: 1920, height: 1080 } });
            const ratio = byteDiffRatio(a, b);
            tested++;
            if (!(ratio >= minChange)) misses.push(`${pg.id}/${beat.id}(${(ratio * 100).toFixed(3)}%)`);
            else covered.push(beat.id);
          }
        }
        if (misses.length) {
          add('M4', '每拍都有可见变化', 'FAIL',
            `${misses.length} 拍几乎没变化（阈值 ${(minChange * 100).toFixed(2)}%）：${misses.slice(0, 6).join(' / ')}`);
        } else {
          add('M4', '每拍都有可见变化', 'PASS', `${covered.length} 拍全部超过 ${(minChange * 100).toFixed(2)}%`);
        }
        add('M4b', '变化是量在推移而非淡入', 'SKIP',
          '帧差只能证明"变了"，不能证明"是量在推移"；这一条按 MOTION-BASELINE.md 人工看两帧');
      }
    } catch (error) {
      add('M4', '每拍都有可见变化', 'ERROR', error.message);
    } finally {
      await browser.close();
    }
  }
}

/* PNG 截图逐字节差比。PNG 压缩后不能直接比，这里退化为「解压后字节差」的近似：
   只用于判断"有没有变化"，不用于判断变化幅度。 */
function byteDiffRatio(a, b) {
  const n = Math.min(a.length, b.length);
  if (!n) return 0;
  let diff = 0;
  for (let i = 0; i < n; i += 97) {
    if (a[i] !== b[i]) diff++;
  }
  return diff / Math.ceil(n / 97);
}

/* ---------- report ---------- */
const order = { FAIL: 0, ERROR: 1, WARN: 2, SKIP: 3, PASS: 4 };
results.sort((x, y) => order[x.level] - order[y.level]);

const pad = (s, n) => String(s).padEnd(n);
console.log(pad('id', 6) + pad('level', 8) + pad('name', 24) + 'detail');
for (const r of results) console.log(pad(r.id, 6) + pad(r.level, 8) + pad(r.name, 24) + r.detail);

const fails = results.filter((r) => r.level === 'FAIL' || r.level === 'ERROR');
const skips = results.filter((r) => r.level === 'SKIP');
const warns = results.filter((r) => r.level === 'WARN');

console.log('');
console.log(`FAIL ${fails.length} / WARN ${warns.length} / SKIP ${skips.length} / PASS ${results.length - fails.length - warns.length - skips.length}`);
if (skips.length) console.log(`SKIP 是未验证，不是通过。缺的检查：${skips.map((s) => s.id).join(', ')}`);

process.exit(fails.length ? 1 : 0);
