#!/usr/bin/env node
/*
 * LDraw pack builder
 * ------------------
 * Builds the game's 3D packs from LDraw's Official Model Repository (OMR) and parts library.
 *
 *   node tools/ldraw-pack.mjs <ldraw-library-dir> <omr-models-dir> [tools/packs.config.json]
 *
 *   <ldraw-library-dir>  the unzipped LDraw library (https://library.ldraw.org/library/updates/complete.zip),
 *                        i.e. the folder that contains LDConfig.ldr, parts/ and p/
 *   <omr-models-dir>     a folder of OMR model files named <set>.mpd, downloaded from
 *                        https://library.ldraw.org/library/omr/<set>.mpd
 *
 * For every model it writes models/<set>.mpd: the model plus every part and primitive it uses, packed into
 * one file so the browser can load it in a single request. For every pack it writes packs/<pack>.js with the
 * card sets, the piece list of each model and the colors used. It also writes ldraw/LDConfig.ldr.
 *
 * Minifigures (sub-models named like "...Minifig...") count as one piece.
 */
import fs from 'node:fs';
import path from 'node:path';

const [libDir, omrDir, configFile = 'tools/packs.config.json'] = process.argv.slice(2);
if (!libDir || !omrDir) {
  console.error('usage: node tools/ldraw-pack.mjs <ldraw-library-dir> <omr-models-dir> [config]');
  process.exit(1);
}
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));

/* ---------- LDraw library lookup ---------- */
const libFileCache = new Map();
function findLibFile(name) {
  const n = name.toLowerCase().replace(/\\/g, '/');
  if (libFileCache.has(n)) return libFileCache.get(n);
  const tries = [`parts/${n}`, `p/${n}`, n.startsWith('s/') ? `parts/${n}` : null, n.startsWith('48/') ? `p/${n}` : null, `models/${n}`]
    .filter(Boolean);
  let found = null;
  for (const t of tries) {
    const full = path.join(libDir, t);
    if (fs.existsSync(full)) { found = {full, text: fs.readFileSync(full, 'latin1')}; break; }
  }
  libFileCache.set(n, found);
  return found;
}
const refsOf = text => text.split(/\r?\n/).map(l => l.trim()).filter(l => l.startsWith('1 '))
  .map(l => l.split(/\s+/).slice(14).join(' ').toLowerCase().replace(/\\/g, '/'));
// Library files keep their geometry, the lines the loader reads (title, part type, BFC, category) and the
// author/license lines the LDraw license asks us to keep; comments and history are dropped to save space.
const trimLib = text => text.split(/\r?\n/).filter((l, i) => {
  const t = l.trim();
  if (!t) return false;
  if (i === 0 || !t.startsWith('0')) return true;
  return /^0\s+(!LDRAW_ORG|BFC|!CATEGORY|Name:|Author:|!LICENSE)/.test(t);
}).join('\n');
const descOf = text => (text.split(/\r?\n/).find(l => l.trim()) || '0 ?').trim().replace(/^0\s+/, '');

/* ---------- Colors (LDConfig.ldr) ---------- */
const COLORS = {};
for (const line of fs.readFileSync(path.join(libDir, 'LDConfig.ldr'), 'latin1').split(/\r?\n/)) {
  const m = line.match(/^0\s+!COLOUR\s+(\S+)\s+CODE\s+(\d+)\s+VALUE\s+#([0-9A-Fa-f]{6})/);
  if (m) COLORS[m[2]] = {name: m[1].replace(/_/g, ' ').replace(/Grey/g, 'Gray'), hex: '#' + m[3].toLowerCase(),
    trans: /ALPHA\s+\d+/.test(line), metal: /CHROME|PEARLESCENT|METAL|RUBBER|MATTE_METALLIC/.test(line)};
}

/* ---------- Model files ---------- */
function parseMpd(text) {
  const files = new Map(); let cur = null, first = null;
  for (const raw of text.split(/\r?\n/)) {
    const m = raw.trim().match(/^0\s+FILE\s+(.+)$/i);
    if (m) { cur = m[1].trim().toLowerCase().replace(/\\/g, '/'); files.set(cur, []); first = first || cur; continue; }
    if (!cur) { cur = '__main.ldr'; files.set(cur, []); first = cur; }
    files.get(cur).push(raw);
  }
  return {files, first};
}
// A sub-model is a minifigure if it says so in its name, or if it is (mostly) made of minifig parts.
const FIG_PART = /^(973|3626|3815|3816|3817|3818|3819|3820|970|971|972|976|3624|3833|3834|3842|3844|3896|4485|2446|30170|3901|6093|4530|3625|3629|4449|30167|30562|2338|2339|3823|4499|6131|x104|u9|30608)/;
const isFigModel = (name, lines) => {
  if (/minifig|figure|\bfig\b/i.test(name)) return true;
  const refs = refsOf(lines.join('\n'));
  return refs.length >= 3 && refs.some(r => /^973/.test(r)) && refs.filter(r => FIG_PART.test(r)).length / refs.length >= .6;
};
// The loader looks for sub-parts and hi-res primitives under these names, so embed them that way.
const embedName = n => n.startsWith('s/') ? `parts/${n}` : n.startsWith('48/') ? `p/${n}` : n;

function buildModel(setNo) {
  const text = fs.readFileSync(path.join(omrDir, `${setNo}.mpd`), 'latin1');
  const {files, first} = parseMpd(text);
  const pieces = new Map();  // key -> {qty, desc, colorCode}
  const figs = new Set();
  const used = new Set();    // library files to embed
  const missing = new Set();

  const addLib = name => {
    if (used.has(name)) return;
    const f = findLibFile(name);
    if (!f) { missing.add(name); return; }
    used.add(name);
    for (const r of refsOf(f.text)) addLib(r);
  };
  const addPiece = (key, desc, colorCode) => {
    const p = pieces.get(key) || {qty: 0, desc, colorCode};
    p.qty++; pieces.set(key, p);
  };
  const walk = (name, inherited) => {
    for (const raw of files.get(name) || []) {
      const line = raw.trim();
      if (!line.startsWith('1 ')) continue;
      const parts = line.split(/\s+/);
      let color = parts[1];
      if (color === '16') color = inherited;
      const ref = parts.slice(14).join(' ').toLowerCase().replace(/\\/g, '/');
      if (files.has(ref) && ref.endsWith('.dat')) {
        // a part defined inside the model file itself
        walkLibOnly(ref);
        addPiece(`${ref}@${color}`, descOf(files.get(ref).join('\n')), color);
      } else if (files.has(ref)) {
        if (isFigModel(ref, files.get(ref))) { figs.add(ref); addPiece(`fig:${ref}`, 'Minifigure', color); walkLibOnly(ref); }
        else walk(ref, color);
      } else {
        addLib(ref);
        const f = findLibFile(ref);
        addPiece(`${ref}@${color}`, f ? descOf(f.text) : ref, color);
      }
    }
  };
  // minifig sub-models: embed their parts but count the figure as one piece
  const walkLibOnly = name => {
    for (const raw of files.get(name) || []) {
      const line = raw.trim();
      if (!line.startsWith('1 ')) continue;
      const ref = line.split(/\s+/).slice(14).join(' ').toLowerCase().replace(/\\/g, '/');
      if (files.has(ref)) walkLibOnly(ref); else addLib(ref);
    }
  };
  walk(first, '16');

  // Packed file: the model's own files first (main model first), then every library file it uses.
  let out = '';
  for (const [name, lines] of files) out += `0 FILE ${name}\n${lines.join('\n').trim()}\n\n`;
  for (const name of used) out += `0 FILE ${embedName(name)}\n${trimLib(findLibFile(name).text)}\n\n`;
  return {packed: out, pieces, figs: [...figs], missing: [...missing]};
}

/* ---------- Packs ---------- */
fs.mkdirSync(path.join(root, 'models'), {recursive: true});
fs.mkdirSync(path.join(root, 'ldraw'), {recursive: true});
fs.copyFileSync(path.join(libDir, 'LDConfig.ldr'), path.join(root, 'ldraw', 'LDConfig.ldr'));

for (const pack of config.packs) {
  const parts = {}, usedColors = {};
  const sets = pack.sets.map(set => ({
    id: set.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    name: set.name,
    models: set.models.map(([no, name]) => {
      const m = buildModel(no);
      if (m.missing.length) console.warn(`  ${no}: missing ${m.missing.join(', ')}`);
      fs.writeFileSync(path.join(root, 'models', `${no}.mpd`), m.packed);
      const p = [];
      for (const [key, {qty, desc, colorCode}] of m.pieces) {
        const c = COLORS[colorCode];
        parts[key] = [desc, +colorCode];
        if (c) usedColors[colorCode] = [c.name, c.hex, c.trans || c.metal ? 1 : 0];
        p.push([key, qty]);
      }
      const total = p.reduce((a, [, q]) => a + q, 0);
      console.log(`${pack.id} / ${set.name} / ${no} ${name}: ${total} pieces, ${(m.packed.length / 1024).toFixed(0)} KB`);
      return {no, name, file: `models/${no}.mpd`, figs: m.figs, p};
    }),
  }));
  const q = JSON.stringify;
  const js = `// ${pack.emoji} ${pack.name} pack (3D). Generated by tools/ldraw-pack.mjs from the LDraw Official Model Repository.
// Models are in models/<set>.mpd. Piece key = "<part file>@<LDraw color code>" or "fig:<minifig sub-model>".
registerLDrawPack({
  id: ${q(pack.id)}, name: ${q(pack.name)}, emoji: ${q(pack.emoji)},
  colors: ${q(usedColors)},
  parts: {
${Object.keys(parts).sort().map(k => `    ${q(k)}: ${q(parts[k])},`).join('\n')}
  },
  sets: [
${sets.map(s => `    {id: ${q(s.id)}, name: ${q(s.name)}, models: [\n${s.models.map(m => `      {no: ${q(m.no)}, name: ${q(m.name)}, file: ${q(m.file)}, figs: ${q(m.figs)}, p: ${q(m.p)}},`).join('\n')}\n    ]},`).join('\n')}
  ],
});
`;
  fs.writeFileSync(path.join(root, 'packs', `${pack.id}.js`), js);
}
