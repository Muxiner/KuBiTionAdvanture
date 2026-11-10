#!/usr/bin/env node
/**
 * build_game.js —— 离线预编译（v0.54）
 *
 * 把 index.html 顺序加载器里的 22 个 JSX 源文件，用仓库自带的 Babel 5
 * （build/browser.min.js，预编译期依赖，不在浏览器运行）编译成一份 ES5 单文件
 * build/game.bundle.js。产物与源码同源、无需 npm、无需联网。
 *
 * 用法：
 *   node build_game.js            # 生成/更新 build/game.bundle.js
 *   node build_game.js --check     # 只检查产物是否最新（过期/缺失时退出码 1）
 *
 * 约定：
 *   - 生产/静态托管：index.html 直接加载 build/game.bundle.js（不再下载 1.33MB Babel、不再串行 fetch）。
 *   - 本地开发：dev_server.py 会注入 window.__DEV_SERVER__={useSource:true}，
 *     此时 index.html 走原来的"源码顺序加载 + 浏览器内 Babel"路径（改文件即刷新）。
 *   - 改完 src/ 下任何 JSX 文件后，提交前请运行一次 node build_game.js（dev_server 启动时也会自动构建）。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const INDEX = path.join(ROOT, 'index.html');
const OUT = path.join(ROOT, 'build', 'game.bundle.js');
const CHECK_ONLY = process.argv.includes('--check');

function fail(msg) {
  console.error('[build_game] ' + msg);
  process.exit(1);
}

// 读取 index.html 的 files 数组（与浏览器加载器保持同一份清单）
const html = fs.readFileSync(INDEX, 'utf8');
const listMatch = html.match(/var files = \[([\s\S]*?)\];/);
if (!listMatch) fail('index.html 中找不到 files 数组');
let files;
try {
  files = JSON.parse('[' + listMatch[1].replace(/\/\/.*$/gm, '').replace(/,\s*$/, '') + ']');
} catch (e) {
  fail('解析 files 数组失败: ' + e.message);
}
if (!files.length) fail('files 数组为空');

// 计算源码指纹（文件顺序 + 内容），用于判断产物是否过期
const hash = crypto.createHash('sha1');
const sources = [];
for (const rel of files) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) fail('源文件不存在: ' + rel);
  const src = fs.readFileSync(p, 'utf8');
  hash.update(rel + '\n' + src + '\n');
  sources.push({ rel, src, lines: src.split('\n').length });
}
const sourceHash = hash.digest('hex').slice(0, 16);

// 读取旧产物头部指纹
const exists = fs.existsSync(OUT);
let builtHash = null;
if (exists) {
  const head = fs.readFileSync(OUT, 'utf8').slice(0, 400);
  const m = head.match(/sources-hash:\s*([0-9a-f]+)/);
  builtHash = m ? m[1] : null;
}

if (CHECK_ONLY) {
  if (!exists) fail('缺少 build/game.bundle.js，请运行 node build_game.js');
  if (builtHash !== sourceHash) fail('build/game.bundle.js 已过期（源码 hash ' + sourceHash + '，产物 hash ' + builtHash + '），请运行 node build_game.js');
  console.log('[build_game] 产物是最新的 (hash ' + sourceHash + ')');
  process.exit(0);
}

// 编译：每个文件单独 Babel.transform，再按顺序拼接（保持原有全局变量共享语义）
const t0 = Date.now();
const Babel = require(path.join(ROOT, 'build', 'browser.min.js'));
let rawBytes = 0;
const parts = [];
for (const s of sources) {
  rawBytes += Buffer.byteLength(s.src);
  let code;
  try {
    // 生产产物：去注释 + 紧凑输出（开发期用 dev_server 走源码，不受影响）
    code = Babel.transform(s.src, { comments: false, compact: true }).code;
  } catch (e) {
    fail('编译失败 ' + s.rel + ': ' + e.message);
  }
  parts.push('/* ---- ' + s.rel + ' ---- */\n' + code + '\n');
}

const header = [
  '/*',
  ' * build/game.bundle.js —— 由 build_game.js 自动生成，请勿手改。',
  ' * sources: ' + sources.length + ' 个 JSX 文件（顺序同 index.html 的 files 数组）',
  ' * sources-hash: ' + sourceHash,
  ' * 说明：生产/静态托管由 index.html 直接加载本文件；本地开发用 dev_server.py 走源码热加载。',
  ' * 本文件为确定性产物（同一份源码重复构建字节一致），便于 git diff 与 CI 校验。',
  ' */',
  '(function () {',
  "'use strict';",
  ''
].join('\n');
const footer = '\n})();\n';
const bundle = header + parts.join('\n') + footer;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, bundle, 'utf8');
const outBytes = Buffer.byteLength(bundle);
const oldBytes = exists ? fs.statSync(OUT).size : 0;
console.log('[build_game] 完成：' + sources.length + ' 个源文件，' + Math.round(rawBytes / 1024) + ' KB JSX → ' +
  Math.round(outBytes / 1024) + ' KB ES5 bundle（' + (Date.now() - t0) + ' ms，hash ' + sourceHash + '）');
if (oldBytes && oldBytes !== outBytes) console.log('[build_game] 体积变化：' + Math.round(oldBytes / 1024) + ' KB → ' + Math.round(outBytes / 1024) + ' KB');
