#!/usr/bin/env node
/*
 * Static contract check for the runtime clock and audio policy.
 *
 *   node validate-silent-runtime.mjs <presentation-src> [--mode silent|sound] [--exclude <dir>]
 *
 * silent (default): MP3 is the clock, nothing is audible, there is no unmute path.
 * sound:            the element that makes sound is the clock; the silent MP3 only maps time.
 *
 * This script only proves the source is self-consistent with the chosen mode.
 * It cannot prove the clock is the sound source — that is a runtime property.
 * Run the clock-ownership check in references/CLOCK-AND-SYNC.md for that.
 */
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const root = argv[0];
const readFlag = (name) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : undefined;
};
const mode = readFlag('--mode') ?? 'silent';
const excludeDirs = new Set(
  (readFlag('--exclude') ?? '').split(',').map((s) => s.trim()).filter(Boolean),
);

if (!root) {
  console.error('usage: node validate-silent-runtime.mjs <presentation-src> [--mode silent|sound] [--exclude dir1,dir2]');
  process.exit(2);
}
if (mode !== 'silent' && mode !== 'sound') {
  console.error(`unknown --mode ${mode}; expected silent or sound`);
  process.exit(2);
}

const extensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.html', '.css']);
const files = [];

function walk(folder) {
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    /* 隐藏目录（.edge-profile / .git / .vite 等）里是浏览器与工具链的临时产物，
       扫进来会产生假阳性——实测 .edge-profile 里的 edge_driver.js 让两项契约误报 FAIL */
    if (entry.name.startsWith('.')) continue;
    if (entry.isDirectory() && excludeDirs.has(entry.name)) continue;
    const target = path.join(folder, entry.name);
    if (entry.isDirectory()) walk(target);
    else if (extensions.has(path.extname(entry.name))) files.push(target);
  }
}

walk(path.resolve(root));

const texts = files.map((file) => ({ file, lines: fs.readFileSync(file, 'utf8').split(/\r?\n/) }));
const source = texts.map(({ file, lines }) => `\n/* ${file} */\n${lines.join('\n')}`).join('');

/* 两种模式都不允许：运行时切换静音、声音快捷键 */
const sharedForbidden = [
  ['M audio shortcut', /KeyM/],
  ['runtime muted toggle', /setMuted\s*\(|\.muted\s*=\s*(?:false|!)/],
];

/* 字幕默认不做；要做得走显式变更流程，不能悄悄加 */
const captionForbidden = [
  ['caption query parameter', /[?&]captions?=/i],
  ['HTML text track', /<track\b/i],
  ['caption or subtitle UI', /(?:className|class)\s*=\s*["'`][^"'`]*(?:caption|subtitle)|data-(?:caption|subtitle)/i],
];

const hits = new Map();
const record = (label, pattern) => {
  for (const { file, lines } of texts) {
    lines.forEach((line, i) => {
      if (pattern.test(line)) {
        const rel = path.relative(path.resolve(root), file).replace(/\\/g, '/');
        if (!hits.has(label)) hits.set(label, []);
        hits.get(label).push(`${rel}:${i + 1}`);
      }
    });
  }
};

for (const [label, pattern] of [...sharedForbidden, ...captionForbidden]) record(label, pattern);

const positives = [...source.matchAll(/\.volume\s*=\s*([0-9]*\.?[0-9]+)/g)].map((m) => Number(m[1]));
const hasMuted = /\bmuted\b/.test(source);
const hasZeroVolume = positives.some((v) => v === 0);
const fail = (label, detail) => {
  if (!hits.has(label)) hits.set(label, []);
  if (detail) hits.get(label).push(detail);
};

if (mode === 'silent') {
  if (!/data-ppt-clock/.test(source)) fail('missing data-ppt-clock audio hook');
  if (!hasMuted) fail('missing muted audio declaration');
  if (!hasZeroVolume) fail('missing hard volume 0 assignment');
  if (positives.some((v) => v > 0)) fail('positive runtime volume in silent mode', `volumes=${positives.join(',')}`);
} else {
  if (!/__DEFAULT_SOUND__|sound\s*=/i.test(source)) fail('missing sound-mode switch');
  if (!hasMuted) fail('missing muted reference track declaration');
  if (!hasZeroVolume) fail('silent reference track must be set to volume 0');
  if (!positives.some((v) => v > 0 && v <= 1)) fail('audible source must set a volume in (0, 1]', `volumes=${positives.join(',')}`);
  if (positives.some((v) => v > 1)) fail('volume above 1', `volumes=${positives.join(',')}`);
}

if (mode === 'silent' && /有声|取消静音|打开声音|unmute|sound on/i.test(source)) {
  fail('audible control copy in silent mode');
}

const failures = [...hits.keys()];
if (failures.length) {
  console.error(`FAIL runtime contract (mode=${mode}):`);
  for (const label of failures) {
    const where = hits.get(label).slice(0, 4);
    console.error(`- ${label}${where.length ? `  @ ${where.join('  ')}` : ''}`);
  }
  if (mode === 'sound') {
    console.error('NOT COVERED BY THIS CHECK (verify at runtime):');
    console.error('- clock ownership (sound=1 sample in references/CLOCK-AND-SYNC.md)');
    console.error('- only one media element produces sound');
    console.error('- BIAS measured, not guessed');
  }
  process.exit(1);
}

console.log(`PASS static runtime contract mode=${mode} files=${files.length}`);
if (mode === 'sound') {
  console.log('NOT COVERED BY THIS CHECK (verify at runtime):');
  console.log('- clock ownership (sound=1 sample in references/CLOCK-AND-SYNC.md)');
  console.log('- only one media element produces sound');
  console.log('- BIAS measured, not guessed');
}
