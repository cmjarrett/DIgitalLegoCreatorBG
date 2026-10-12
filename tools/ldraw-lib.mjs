/*
 * Shared LDraw helpers for the pack tools (ldraw-pack.mjs, ldraw-candidates.mjs).
 * openLibrary(libDir) reads the unzipped LDraw parts library (the folder with LDConfig.ldr, parts/ and p/).
 */
import fs from 'node:fs';
import path from 'node:path';

export const refsOf = text => text.split(/\r?\n/).map(l => l.trim()).filter(l => l.startsWith('1 '))
  .map(l => l.split(/\s+/).slice(14).join(' ').toLowerCase().replace(/\\/g, '/'));
export const descOf = text => (text.split(/\r?\n/).find(l => l.trim()) || '0 ?').trim().replace(/^0\s+/, '');
// Library files keep their geometry, the lines the loader reads (title, part type, BFC, category) and the
// author/license lines the LDraw license asks us to keep; comments and history are dropped to save space.
export const trimLib = text => text.split(/\r?\n/).filter((l, i) => {
  const t = l.trim();
  if (!t) return false;
  if (i === 0 || !t.startsWith('0')) return true;
  return /^0\s+(!LDRAW_ORG|BFC|!CATEGORY|Name:|Author:|!LICENSE)/.test(t);
}).join('\n');
// The three.js loader looks for sub-parts and hi-res primitives under these names, so embed them that way.
export const embedName = n => n.startsWith('s/') ? `parts/${n}` : n.startsWith('48/') ? `p/${n}` : n;

export function parseMpd(text) {
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
export const isFigModel = (name, lines) => {
  if (/minifig|figure|\bfig\b/i.test(name)) return true;
  const refs = refsOf(lines.join('\n'));
  return refs.length >= 3 && refs.some(r => /^973/.test(r)) && refs.filter(r => FIG_PART.test(r)).length / refs.length >= .6;
};

export function openLibrary(libDir) {
  const cache = new Map();
  function findLibFile(name) {
    const n = name.toLowerCase().replace(/\\/g, '/');
    if (cache.has(n)) return cache.get(n);
    const tries = [`parts/${n}`, `p/${n}`, n.startsWith('s/') ? `parts/${n}` : null, n.startsWith('48/') ? `p/${n}` : null, `models/${n}`]
      .filter(Boolean);
    let found = null;
    for (const t of tries) {
      const full = path.join(libDir, t);
      if (fs.existsSync(full)) { found = {full, text: fs.readFileSync(full, 'latin1')}; break; }
    }
    cache.set(n, found);
    return found;
  }
  // A library part's title, following "~Moved to <part>" redirects to the real part's title.
  function partDesc(ref, hops = 0) {
    const f = findLibFile(ref);
    if (!f) return ref;
    const d = descOf(f.text), moved = d.match(/^~Moved to (\S+)/i);
    return moved && hops < 4 ? partDesc(moved[1].toLowerCase().replace(/\.dat$/, '') + '.dat', hops + 1) : d;
  }

  const colors = {};
  for (const line of fs.readFileSync(path.join(libDir, 'LDConfig.ldr'), 'latin1').split(/\r?\n/)) {
    const m = line.match(/^0\s+!COLOUR\s+(\S+)\s+CODE\s+(\d+)\s+VALUE\s+#([0-9A-Fa-f]{6})/);
    if (m) colors[m[2]] = {name: m[1].replace(/_/g, ' ').replace(/Grey/g, 'Gray'), hex: '#' + m[3].toLowerCase(),
      trans: /ALPHA\s+\d+/.test(line), metal: /CHROME|PEARLESCENT|METAL|RUBBER|MATTE_METALLIC/.test(line)};
  }

  // Read one OMR model: its pieces (minifigures count as one), the library files it needs, and the packed file.
  function buildModel(text) {
    const {files, first} = parseMpd(text);
    const pieces = new Map();  // key -> {qty, desc, colorCode}
    const figs = new Set();
    const used = new Set();    // library files to embed
    const missing = new Set();
    let steps = 0;

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
    // minifig sub-models: embed their parts but count the figure as one piece
    const walkLibOnly = name => {
      for (const raw of files.get(name) || []) {
        const line = raw.trim();
        if (!line.startsWith('1 ')) continue;
        const ref = line.split(/\s+/).slice(14).join(' ').toLowerCase().replace(/\\/g, '/');
        if (files.has(ref)) walkLibOnly(ref); else addLib(ref);
      }
    };
    const walk = (name, inherited) => {
      for (const raw of files.get(name) || []) {
        const line = raw.trim();
        if (/^0\s+(ROT)?STEP/i.test(line)) steps++;
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
          addPiece(`${ref}@${color}`, partDesc(ref), color);
        }
      }
    };
    walk(first, '16');

    const packed = () => {
      let out = '';
      for (const [name, lines] of files) out += `0 FILE ${embedName(name)}\n${lines.join('\n').trim()}\n\n`;
      for (const name of used) out += `0 FILE ${embedName(name)}\n${trimLib(findLibFile(name).text)}\n\n`;
      return out;
    };
    const total = [...pieces.values()].reduce((a, p) => a + p.qty, 0);
    // Same signature = same parts in the same colors (a re-release of the same build).
    const signature = [...pieces].filter(([k]) => !k.startsWith('fig:')).map(([k, p]) => `${k}x${p.qty}`).sort().join(',');
    return {pieces, figs: [...figs], missing: [...missing], steps, total, signature, packed};
  }

  return {findLibFile, partDesc, colors, buildModel};
}
