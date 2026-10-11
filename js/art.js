/* ================= Piece art (top-down, 1 stud = 1em) ================= */
const C = 10;
const svgBox = (x, y, w, h, body, title) =>
  `<svg viewBox="${x} ${y} ${w} ${h}" style="width:${w / C}em;height:${h / C}em" role="img" aria-label="${title}"><title>${title}</title>${body}</svg>`;
const stud = (x, y, f, d) => `<circle cx="${x}" cy="${y}" r="3.1" fill="${f}" stroke="${d}" stroke-width=".7"/><circle cx="${x - .9}" cy="${y - .9}" r=".9" fill="#fff" opacity=".4"/>`;

function icon(id) {
  const p = PIECES[id];
  if (p.img) return `<img class="pimg" src="${p.img}" alt="${p.name}" title="${p.name}" loading="lazy" onerror="pieceImgFail(this)">`;
  if (p.ldraw) return svgBox(0, 0, 28, 28, `<rect x="1" y="1" width="26" height="26" rx="4" fill="${COL[p.color] || '#ccc'}" stroke="#555"/>`, p.name);
  if (p.kind === 'special') return specialIcon(id);
  const W = p.cols * C, H = p.rows * C, f = COL[p.color], d = DK[p.color];
  const studs = (cols, rows = [...Array(p.rows).keys()], ff = f, dd = d) =>
    cols.flatMap(i => rows.map(j => stud((i + .5) * C, (j + .5) * C, ff, dd))).join('');
  const all = [...Array(p.cols).keys()];
  const base = (fill = f) => `<rect x=".4" y=".4" width="${W - .8}" height="${H - .8}" rx="1.2" fill="${fill}" stroke="${d}" stroke-width=".8"/>`;
  let b = '', pad = 1;
  switch (p.shape) {
    case 'brick': b = base() + studs(all); break;
    case 'plate': b = base() + `<rect x="1.5" y="1.5" width="${W - 3}" height="${H - 3}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width=".6"/>` + studs(all); break;
    case 'hole': b = base() + `<rect x="${W / 2}" y=".4" width="${W / 2 - .4}" height="${H - .8}" fill="${d}" opacity=".35"/>` + studs(all); break;
    case 'curve': b = base() + `<path d="M${W / 2},.4 H${W - 3} Q${W - .4},.4 ${W - .4},${H / 2} V${H - .4} H${W / 2}Z" fill="#fff" opacity=".25"/>` + studs([0]); break;
    case 'round': b = `<circle cx="${W / 2}" cy="${H / 2}" r="${W / 2 - .4}" fill="${f}" stroke="${d}" stroke-width=".8"/>` + studs(all) +
      (p.cols > 1 ? `<path d="M${W / 2 - 2},${H / 2}h4M${W / 2},${H / 2 - 2}v4" stroke="${d}" stroke-width="1.2"/>` : ''); break;
    case 'tile': b = base() + `<rect x="1.6" y="1.6" width="${W - 3.2}" height="${H - 3.2}" rx="1" fill="#fff" opacity=".18"/>`; break;
    case 'corner': b = `<path d="M.4,.4 H${W - .4} V${H - .4} H${W / 2} V${H / 2} H.4Z" fill="${f}" stroke="${d}" stroke-width=".8"/>` +
      stud(5, 5, f, d) + stud(15, 5, f, d) + stud(15, 15, f, d); break;
    case 'quarter': b = `<path d="M.4,.4 H${W - .4} V${H / 2} A${W / 2 - .4},${H / 2 - .4} 0 0 1 ${W / 2},${H - .4} H.4Z" fill="${f}" stroke="${d}" stroke-width=".8"/>` +
      studs(all).replace(stud(35, 35, f, d), ''); break;
    case 'wedgeL': b = `<polygon points=".4,.4 ${W - .4},.4 ${W - .4},${H - .4} ${C},${H - .4}" fill="${f}" stroke="${d}" stroke-width=".8"/>` + studs(all, [0]) + studs([1, 2], [1]); break;
    case 'wedgeR': b = `<polygon points=".4,.4 ${W - .4},.4 ${W - C},${H - .4} .4,${H - .4}" fill="${f}" stroke="${d}" stroke-width=".8"/>` + studs(all, [0]) + studs([0, 1], [1]); break;
    case 'grille': b = base() + [2.5, 5, 7.5].map(y => `<line x1="2" x2="${W - 2}" y1="${y}" y2="${y}" stroke="${d}" stroke-width="1"/>`).join(''); break;
    case 'axle': pad = 5; b = `<rect x="-4.5" y="${H / 2 - 1.5}" width="${W + 9}" height="3" rx="1" fill="#7c8184"/>` + base() + studs(all); break;
    case 'wedge': b = `<polygon points=".4,.4 ${W - .4},.4 ${W - 2 * C},${H - .4} ${2 * C},${H - .4}" fill="${f}" stroke="${d}" stroke-width=".8"/>` +
      studs(all, [0]) + studs([1, 2, 3, 4], [1]) + studs([2, 3], [2]); break;
    case 'slope': {
      const studCols = p.deco === 'black' ? [0, 1] : [0];
      const sx = studCols.length * C;
      b = base() + `<rect x="${sx}" y=".4" width="${W - sx - .4}" height="${H - .8}" fill="#fff" opacity=".22"/>`;
      for (let y = 2; y < H; y += 2.5) b += `<line x1="${sx + 1}" x2="${W - 1}" y1="${y}" y2="${y}" stroke="${d}" stroke-opacity=".2" stroke-width=".4"/>`;
      if (p.deco === 'star') b += [[13, 6, 4], [16, 14, 2.6], [11, 15, 2]].map(([x, y, r]) => starPath(x, y, r)).join('');
      if (p.deco === 'tri') b += `<path d="M11,2 L19,5 L11,8Z M11,12 L19,15 L11,18Z" fill="#23a03a"/>`;
      if (p.deco === 'zig') b += `<path d="M11,3 L19,6 L13,10 L19,14 L11,17Z" fill="#23a03a"/><path d="M12.5,6 L16,7.5 L12.5,10Z M12.5,10 L16,12.5 L12.5,14Z" fill="#d01012"/>`;
      if (p.deco === 'black') b += `<rect x=".4" y=".4" width="${sx}" height="${H - .8}" rx="1.2" fill="${COL.black}"/>` + studs([0, 1], undefined, COL.black, '#000');
      else b += studs(studCols);
      break;
    }
  }
  return svgBox(-pad, -pad, W + 2 * pad, H + 2 * pad, b, p.name);
}
function starPath(cx, cy, r) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="#e3242b"/>`;
}
function specialIcon(id) {
  const p = PIECES[id], glass = 'rgba(175,220,250,.85)', gs = '#5b8db5';
  const art = {
    windscreen: [20, 20, `<rect x=".5" y=".5" width="19" height="19" rx="1.5" fill="${glass}" stroke="${gs}"/><path d="M8,1 Q18,4 19,19" fill="none" stroke="#fff" stroke-width="1.2" opacity=".8"/>${stud(5, 5, glass, gs)}${stud(5, 15, glass, gs)}`],
    smallscreen: [10, 20, `<rect x=".5" y=".5" width="9" height="19" rx="1.5" fill="#f4f4f4" stroke="#8e928e"/><rect x="2" y="2" width="6" height="16" rx="1" fill="${glass}"/>`],
    rotor: [30, 30, `<g transform="rotate(45 15 15)"><rect x="12" y="0" width="6" height="30" rx="3" fill="#8c9194" stroke="#5e6366" stroke-width=".6"/><rect x="0" y="12" width="30" height="6" rx="3" fill="#8c9194" stroke="#5e6366" stroke-width=".6"/></g>${[[15, 15, 2.2], [8, 8, 1.4], [22, 22, 1.4], [22, 8, 1.4], [8, 22, 1.4], [4.5, 4.5, 1.4], [25.5, 25.5, 1.4], [25.5, 4.5, 1.4], [4.5, 25.5, 1.4]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#333"/>`).join('')}`],
    clip: [20, 20, `<rect x=".5" y=".5" width="19" height="19" rx="1" fill="${COL.yellow}" stroke="${DK.yellow}"/><rect x="5" y="7" width="12" height="6" rx="3" fill="none" stroke="${DK.yellow}"/><circle cx="14" cy="10" r="2.4" fill="#222"/>`],
    antenna: [60, 8, `<rect x="1" y="3" width="52" height="2" rx="1" fill="#f4f4f4" stroke="#8e928e" stroke-width=".5"/><rect x="52" y=".5" width="7" height="7" rx="1.5" fill="#f4f4f4" stroke="#8e928e" stroke-width=".6"/>`],
    propeller: [30, 30, `${[0, 120, 240].map(a => `<ellipse cx="15" cy="7" rx="4.6" ry="7" fill="#222" transform="rotate(${a} 15 15)"/>`).join('')}<circle cx="15" cy="15" r="4" fill="#3a3a3a" stroke="#666"/><path d="M13,15h4M15,13v4" stroke="#999" stroke-width="1"/>`],
    propmount: [26, 20, `<rect x="0" y="8.5" width="7" height="3" fill="#7c8184"/><rect x="6.5" y=".5" width="19" height="19" rx="1.2" fill="${COL.blue}" stroke="${DK.blue}"/>${stud(16, 5, COL.blue, DK.blue)}${stud(16, 15, COL.blue, DK.blue)}`],
    stick: [10, 30, `<rect x="1" y="20" width="8" height="9.5" rx="2" fill="#2b2f6b"/><rect x="4.2" y="4" width="1.6" height="17" fill="${COL.yellow}" stroke="${DK.yellow}" stroke-width=".3"/><circle cx="5" cy="4" r="3" fill="${COL.yellow}" stroke="${DK.yellow}" stroke-width=".5"/>`],
    headlight: [10, 10, `<rect x=".5" y=".5" width="9" height="9" rx="1" fill="${COL.yellow}" stroke="${DK.yellow}"/>${stud(5, 5, COL.yellow, DK.yellow)}<rect x="7" y="2.5" width="2.5" height="5" fill="${DK.yellow}"/>`],
    wheel: [22, 22, `${Array.from({length: 12}, (_, i) => `<rect x="10" y=".2" width="2" height="3" fill="#111" transform="rotate(${i * 30} 11 11)"/>`).join('')}<circle cx="11" cy="11" r="9.4" fill="#222"/><circle cx="11" cy="11" r="5" fill="#e8e8e8" stroke="#999" stroke-width=".5"/><path d="M11,6.5v9M6.5,11h9" stroke="#999" stroke-width="1.6"/><circle cx="11" cy="11" r="1.6" fill="#666"/>`],
    redround: [10, 10, `<circle cx="5" cy="5" r="4.3" fill="#f07060" stroke="${DK.red}" stroke-width=".7"/><circle cx="5" cy="5" r="2.3" fill="#f07060" stroke="${DK.red}" stroke-width=".5"/>`],
    greenround: [10, 10, `<circle cx="5" cy="5" r="4.3" fill="#58b368" stroke="${DK.green}" stroke-width=".7"/><circle cx="5" cy="5" r="2.3" fill="#58b368" stroke="${DK.green}" stroke-width=".5"/>`],
  }[id];
  return svgBox(-1, -1, art[0] + 2, art[1] + 2, art[2], p.name);
}
// Offline (or a missing picture): show a plain labeled tile instead of a broken image.
function pieceImgFail(img) {
  const label = img.alt.replace(/^(Trans-\S+|Light Bluish Gray|Dark Bluish Gray|Light Gray|Dark Gray|Medium Blue|Dark Turquoise|\S+) /, '').split(/[ ,]/)[0];
  img.outerHTML = svgBox(0, 0, 28, 28, `<rect x="1" y="1" width="26" height="26" rx="4" fill="#ddd" stroke="#888"/><text x="14" y="17" font-size="6" text-anchor="middle" fill="#333">${label}</text>`, img.alt);
}

function spaceIcon(sp) {
  const ic = sp.icon;
  const mini = c => `<svg viewBox="-1 -1 22 22"><rect x=".4" y=".4" width="19.2" height="19.2" rx="1.2" fill="${COL[c]}" stroke="${DK[c]}" stroke-width=".8"/>${stud(5, 5, COL[c], DK[c])}${stud(15, 5, COL[c], DK[c])}${stud(5, 15, COL[c], DK[c])}${stud(15, 15, COL[c], DK[c])}</svg>`;
  if (COL[ic]) return mini(ic);
  if (ic === 'any') return `<svg viewBox="0 0 22 22"><rect x="1" y="1" width="9" height="9" rx="1" fill="${COL.red}"/><rect x="12" y="1" width="9" height="9" rx="1" fill="${COL.blue}"/><rect x="1" y="12" width="9" height="9" rx="1" fill="${COL.black}"/><rect x="12" y="12" width="9" height="9" rx="1" fill="${COL.gray}"/></svg>`;
  if (ic === 'two') return mini('yellow') + mini('green');
  if (ic === 'wheel') return `<svg viewBox="0 0 22 22"><circle cx="11" cy="11" r="10" fill="#222"/><circle cx="11" cy="11" r="5" fill="#e8e8e8"/><path d="M11,6.5v9M6.5,11h9" stroke="#999" stroke-width="1.6"/></svg>`;
  return ic;
}
function dieFace(n) {
  const on = {1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8]}[n] || [];
  return Array.from({length: 9}, (_, i) => `<i class="${on.includes(i) ? 'on' : ''}"></i>`).join('');
}

