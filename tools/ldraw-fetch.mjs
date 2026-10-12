#!/usr/bin/env node
/*
 * LDraw fetcher: fills a local cache folder for the other pack tools.
 *
 *   node tools/ldraw-fetch.mjs <cache-dir> [--library] [--themes "Train,Castle"] [--sets 6801-1,4016-1] [--config]
 *
 *   --library   download LDraw's complete parts library (complete.zip, about 146 MB) and unzip it to <cache>/ldraw
 *   --themes    download the OMR model file of every set whose theme starts with one of these names
 *               (themes and set numbers come from tools/omr-sets.json, a snapshot of https://library.ldraw.org/omr/sets)
 *   --sets      download these OMR model files
 *   --config    download every model named in tools/packs.config.json
 *
 * Model files go to <cache>/omr/<set>.mpd; files already there are skipped.
 */
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const args = process.argv.slice(2);
const cacheDir = args[0];
if (!cacheDir || cacheDir.startsWith('--')) {
  console.error('usage: node tools/ldraw-fetch.mjs <cache-dir> [--library] [--themes "Train,Castle"] [--sets 6801-1,...] [--config]');
  process.exit(1);
}
const opt = name => { const i = args.indexOf(name); return i < 0 ? null : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };
const toolsDir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'));
const omrDir = path.join(cacheDir, 'omr');
fs.mkdirSync(omrDir, {recursive: true});

async function download(url, file) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
}

if (opt('--library')) {
  const zip = path.join(cacheDir, 'complete.zip');
  if (!fs.existsSync(zip)) {
    console.log('Downloading the LDraw parts library (about 146 MB)…');
    await download('https://library.ldraw.org/library/updates/complete.zip', zip);
  }
  console.log('Unzipping…');
  try {
    execFileSync('tar', ['-xf', zip, '-C', cacheDir], {stdio: 'inherit'}); // tar reads zip files on Windows 10+, macOS and most Linux
  } catch {
    console.error(`Could not unzip automatically. Unzip ${zip} so that ${path.join(cacheDir, 'ldraw', 'LDConfig.ldr')} exists.`);
  }
}

const wanted = new Set();
const list = opt('--sets');
if (typeof list === 'string') list.split(',').map(s => s.trim()).filter(Boolean).forEach(s => wanted.add(s));
const themes = opt('--themes');
if (typeof themes === 'string') {
  const names = themes.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
  const {sets} = JSON.parse(fs.readFileSync(path.join(toolsDir, 'omr-sets.json'), 'utf8'));
  for (const [no, , theme] of sets) if (names.some(t => theme.toLowerCase().startsWith(t))) wanted.add(no);
}
if (opt('--config')) {
  const config = JSON.parse(fs.readFileSync(path.join(toolsDir, 'packs.config.json'), 'utf8'));
  for (const pack of config.packs) for (const set of pack.sets) for (const [no] of set.models) wanted.add(no);
}

let got = 0, had = 0, failed = 0;
const queue = [...wanted];
async function worker() {
  while (queue.length) {
    const no = queue.shift(), file = path.join(omrDir, `${no}.mpd`);
    if (fs.existsSync(file)) { had++; continue; }
    try { await download(`https://library.ldraw.org/library/omr/${no}.mpd`, file); got++; }
    catch (e) { failed++; console.warn(`  ${no}: ${e.message}`); }
  }
}
await Promise.all(Array.from({length: 6}, worker));
if (wanted.size) console.log(`Models: ${got} downloaded, ${had} already there, ${failed} failed (in ${omrDir})`);
