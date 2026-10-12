#!/usr/bin/env node
/*
 * LDraw candidate finder: which downloaded OMR models would make good card-set models?
 *
 *   node tools/ldraw-candidates.mjs <cache-dir> [--theme Train] [--min 10] [--max 50]
 *
 * Lists every model in <cache>/omr that has all its parts in the library and a piece count in range
 * (minifigures count as one piece), grouped by theme, with its year, pieces, build steps and minifigures.
 * Marks models already used in tools/packs.config.json, and models that are the same build as another one.
 */
import fs from 'node:fs';
import path from 'node:path';
import {openLibrary} from './ldraw-lib.mjs';

const args = process.argv.slice(2);
const cacheDir = args[0];
if (!cacheDir) { console.error('usage: node tools/ldraw-candidates.mjs <cache-dir> [--theme Train] [--min 10] [--max 50]'); process.exit(1); }
const opt = (name, dflt) => { const i = args.indexOf(name); return i < 0 ? dflt : args[i + 1]; };
const min = +opt('--min', 10), max = +opt('--max', 50), themeFilter = (opt('--theme', '') || '').toLowerCase();
const toolsDir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'));

const lib = openLibrary(path.join(cacheDir, 'ldraw'));
const info = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(toolsDir, 'omr-sets.json'), 'utf8')).sets.map(r => [r[0], r]));
const config = JSON.parse(fs.readFileSync(path.join(toolsDir, 'packs.config.json'), 'utf8'));
const used = new Map();
for (const pack of config.packs) for (const set of pack.sets) for (const [no] of set.models) used.set(no, `${pack.id}/${set.name}`);

const rows = [], bySignature = new Map();
for (const f of fs.readdirSync(path.join(cacheDir, 'omr')).sort()) {
  const no = f.replace(/\.mpd$/, '');
  const [, name = '?', theme = '?', year = ''] = info[no] || [];
  if (themeFilter && !theme.toLowerCase().startsWith(themeFilter)) continue;
  const m = lib.buildModel(fs.readFileSync(path.join(cacheDir, 'omr', f), 'latin1'));
  if (m.missing.length || m.total < min || m.total > max) continue;
  const twin = bySignature.get(m.signature);
  if (!twin) bySignature.set(m.signature, no);
  rows.push({no, name, theme, year, total: m.total, steps: m.steps, figs: m.figs.length, twin, used: used.get(no)});
}

const themes = [...new Set(rows.map(r => r.theme))].sort();
for (const t of themes) {
  const list = rows.filter(r => r.theme === t).sort((a, b) => a.total - b.total);
  console.log(`\n## ${t}  (${list.length} models, ${list.filter(r => !r.used && !r.twin).length} unused)`);
  for (const r of list) {
    const notes = [r.used && `used: ${r.used}`, r.twin && `same build as ${r.twin}`].filter(Boolean).join('; ');
    console.log(`  ${r.no.padEnd(10)} ${String(r.total).padStart(3)} pcs  ${String(r.steps).padStart(2)} steps  ${r.figs ? r.figs + ' fig ' : '      '} ${String(r.year).padEnd(5)} ${r.name.slice(0, 40).padEnd(40)} ${notes}`);
  }
}
console.log(`\n${rows.length} models with ${min}–${max} pieces and no missing parts.`);
