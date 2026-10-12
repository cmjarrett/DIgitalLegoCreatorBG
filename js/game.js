/* ================= Board spaces ================= */
const SPACES = {
  start:   {label: 'START', sub: 'Helicopter', icon: '🚁', act: [{t: 'heli'}], cls: 'corner start'},
  heli:    {label: 'Go to any space', icon: '🚁', act: [{t: 'heli'}], cls: 'heli'},
  brick:   {label: 'Pick 1 Brick', icon: 'any', act: [{t: 'pick', f: 'brick'}]},
  brick2:  {label: 'Pick 2 Bricks', icon: 'two', act: [{t: 'pick', f: 'brick'}, {t: 'pick', f: 'brick'}]},
  special: {label: 'Pick 1 Special Piece', icon: 'wheel', act: [{t: 'pick', f: 'special'}]},
  piece:   {label: 'Pick 1 Piece', icon: 'any', act: [{t: 'pick', f: 'piece'}]},
  piece2:  {label: 'Pick 2 Pieces', icon: 'two', act: [{t: 'pick', f: 'piece'}, {t: 'pick', f: 'piece'}]},
  take1:   {label: 'Take 1 Brick from Another', icon: '✋', act: [{t: 'take'}], cls: 'take'},
  take2:   {label: 'Take 2 Bricks from Another', icon: '✋✋', act: [{t: 'take'}, {t: 'take'}], cls: 'corner take'},
};
// c0–c4 are the color spaces; their colors come from the playset (red, green, yellow, blue, white on the original board).
const TRACK = ['start','brick','c0','brick2','special','brick','c1',
               'take2','c2','special','take1','c3','brick2','c4',
               'heli','c0','brick','special','take1','c2','c1',
               'heli','c3','brick2','c4','take1','special','brick'];
// House rules that keep the 3D card sets fair and not too long, found with the simulator (js/sim.js).
// Either can be switched off for testing: index.html?headstart=0&flexpick=0
const URL_RULES = new URLSearchParams(location.search);
const RULES = {headStart: URL_RULES.get('headstart') !== '0', flexPick: URL_RULES.get('flexpick') !== '0'};

function spaceAt(i) {
  const key = TRACK[i], slot = /^c(\d)$/.exec(key), set = G && setById(G.set);
  let sp = SPACES[key];
  // 3D models have many special pieces (wheels, printed parts, minifigures), so the plain "Pick Brick" spaces take any piece.
  if (set && set.ldraw && RULES.flexPick && (key === 'brick' || key === 'brick2')) sp = SPACES[key === 'brick' ? 'piece' : 'piece2'];
  if (slot) {
    const color = set && set.colors[+slot[1]];
    sp = color ? {label: `Pick 1 ${COLOR_NAME[color]} Brick`, icon: color, act: [{t: 'pick', f: color}]} : SPACES.brick;
  }
  // Sets with big models hand out several pieces per pick, and the board says so.
  const k = set ? set.pickCount : 1;
  if (k === 1 || !sp.act.some(a => a.t === 'pick')) return sp;
  const n = sp.act.length * k;
  return {...sp, act: sp.act.flatMap(a => Array(k).fill(a)),
    label: sp.label.replace(/Pick \d+ (.*?)(?:s?)$/, (_, what) => `Pick ${n} ${what}s`)};
}
const filterLabel = f => f === 'brick' ? '1 brick' : f === 'piece' ? '1 piece' : f === 'special' ? '1 special piece' : `1 ${COLOR_NAME[f].toLowerCase()} brick`;
const PAWN_COLORS = ['#d01012', '#0b5ed7', '#00852b', '#7b2cbf'];


/* ================= Board build ================= */
const $ = s => document.querySelector(s);
function cellRC(i) {
  if (i <= 7) return [7, 7 - i];
  if (i <= 14) return [7 - (i - 7), 0];
  if (i <= 21) return [0, i - 14];
  return [i - 21, 7];
}
function buildBoard() {
  let html = '';
  TRACK.forEach((key, i) => {
    const sp = spaceAt(i), [r, c] = cellRC(i);
    html += `<button class="cell ${sp.cls || ''}" id="cell${i}" data-cell="${i}" style="grid-area:${r + 1}/${c + 1}" tabindex="-1" aria-label="${sp.label}">
      <div class="si">${spaceIcon(sp)}</div><div class="sl">${sp.label}${sp.sub ? `<br><span style="font-weight:400">${sp.sub}</span>` : ''}</div>
      <div class="pawns"></div></button>`;
  });
  html += `<div class="center"><div class="yard" id="yard"></div></div>`;
  $('#board').innerHTML = html;
}
function renderYard() {
  const pd = G.pending, eligible = pd && pd.a.t === 'pick' ? pd.opts : [];
  const tile = id => {
    const n = G.supply[id];
    return `<button class="sup ${n ? '' : 'empty'} ${eligible.includes(id) ? 'eligible' : ''}" data-piece="${id}" title="${PIECES[id].name}: ${n} left">${icon(id)}<span class="cnt">${n}</span></button>`;
  };
  // Bricks sorted by color then size; special pieces in the inner circle.
  const ids = Object.keys(G.supply), order = Object.keys(COL);
  const size = id => (PIECES[id].rows || 0) * (PIECES[id].cols || 0);
  const bricks = ids.filter(id => PIECES[id].kind === 'brick')
    .sort((a, b) => order.indexOf(PIECES[a].color) - order.indexOf(PIECES[b].color) || size(b) - size(a));
  const specials = ids.filter(id => PIECES[id].kind === 'special');
  $('#yard').style.fontSize = ids.length > 34 ? '2.2cqw' : '';
  $('#yard').innerHTML = `<div class="yard-title">BRICKYARD</div>
    <div class="tiles">${bricks.map(tile).join('')}</div>
    <div class="specials"><div class="lbl">SPECIAL PIECES</div><div class="tiles">${specials.map(tile).join('')}</div></div>`;
}


/* ================= Game state ================= */
let G = null;
// index.html?sim=1 plays computer-only games as fast as it can (js/sim.js runs them): no waiting, no drawing.
const SIM = new URLSearchParams(location.search).has('sim');
const SIM_TURN_CAP = 400;
const sleep = ms => SIM ? Promise.resolve() : new Promise(r => setTimeout(r, ms));
// Hand control back to the browser between simulated turns, without the 4 ms minimum a timer would add.
const nextTask = () => new Promise(r => { const ch = new MessageChannel(); ch.port1.onmessage = () => r(); ch.port2.postMessage(0); });
const curP = () => G.players[G.cur];
const modelOf = p => setById(G.set).models[p.model];

function needOf(p) {
  const n = {...modelOf(p).parts};
  for (const id in p.hand) n[id] = (n[id] || 0) - p.hand[id];
  return n; // >0 still needed, <0 holding extras
}
function progress(p) {
  const parts = modelOf(p).parts;
  const total = Object.values(parts).reduce((a, b) => a + b, 0);
  let have = 0;
  for (const id in parts) have += Math.min(parts[id], p.hand[id] || 0);
  return [have, total];
}
// Pieces still to collect: head starts make "collected so far" a poor measure of who is winning.
const piecesLeft = p => { const [have, total] = progress(p); return total - have; };
const isComplete = p => { const [a, b] = progress(p); return a === b; };

// 3D card sets: collected pieces still have to be built onto the model, and the first finished model wins.
const is3D = () => !!(G && setById(G.set).ldraw);
const owned = (p, id) => Math.min(p.hand[id] || 0, modelOf(p).parts[id] || 0);
const unplaced = (p, id) => owned(p, id) - ((p.placed || {})[id] || 0);
const built = p => Object.values(p.placed || {}).reduce((a, b) => a + b, 0);
const hasWon = p => is3D() ? built(p) === progress(p)[1] : isComplete(p);
// Would taking one of these from q pull a piece off q's model (because q has no spare one in the tray)?
const knocksOff = (q, id) => ((q.placed || {})[id] || 0) > Math.min((q.hand[id] || 0) - 1, modelOf(q).parts[id] || 0);

function placePiece(pi, id) {
  const p = G.players[pi];
  if (!is3D() || G.winner || unplaced(p, id) <= 0) return;
  p.placed[id] = (p.placed[id] || 0) + 1;
  if (G.views) G.views[pi].place(id);
  render();
  if (hasWon(p)) win(p);
}
// Computer players snap one piece onto their model every so often, even during other players' turns.
function cpuBuild(g) {
  if (G !== g || G.winner) return clearInterval(g.timer);
  G.players.forEach((p, pi) => {
    if (!p.cpu) return;
    const ids = Object.keys(p.hand).filter(id => unplaced(p, id) > 0);
    if (ids.length) placePiece(pi, ids[Math.floor(Math.random() * ids.length)]);
  });
}

const build3dReady = new Promise((resolve, reject) => {
  if (window.Build3D) return resolve();
  addEventListener('build3d-ready', resolve, {once: true});
  setTimeout(() => reject(new Error('The 3D bricks did not load. Check the internet connection and reload.')), 30000);
});
function disposeViews() {
  if (!G) return;
  (G.views || []).forEach(v => v.dispose());
  if (G.winView) G.winView.dispose();
  if (G.timer) clearInterval(G.timer);
}
function setupCards3D() {
  $('#players').innerHTML = G.players.map((p, pi) => `<div class="mcard m3d" id="pcard${pi}" style="--setc:${setById(G.set).color}">
    <div class="mhead" id="phead${pi}"></div>
    <div class="view3d" id="view${pi}"><span class="vhint">drag to spin · scroll or pinch to zoom</span></div>
    <div class="tray" id="tray${pi}"></div>
    <div class="extras" id="extras${pi}"></div>
  </div>`).join('');
  G.views = G.players.map((p, pi) => Build3D.createView($('#view' + pi), modelOf(p)));
}
function renderPlayers3D() {
  const pd = G.pending;
  G.players.forEach((p, pi) => {
    const m = modelOf(p), [have, total] = progress(p), need = needOf(p);
    $('#pcard' + pi).classList.toggle('active', pi === G.cur && !G.winner);
    $('#phead' + pi).innerHTML = `<span class="mtitle">${m.tag} - ${m.name}</span> ${m.emoji}
      <span class="dot" style="background:${p.color}"></span>${p.name}${p.cpu ? ' <small>(computer)</small>' : ''}
      <span class="prog">built ${built(p)}/${total} · collected ${have}</span>`;
    const ids = Object.keys(p.hand).filter(id => unplaced(p, id) > 0);
    $('#tray' + pi).innerHTML = ids.length
      ? `<span class="traylbl">${p.cpu ? 'Building…' : 'Tap a piece to build it:'}</span>` + ids.map(id =>
        `<button class="tray-piece" data-owner="${pi}" data-piece="${id}" ${p.cpu ? 'disabled' : ''} title="${PIECES[id].name}">${icon(id)}${unplaced(p, id) > 1 ? `<b>×${unplaced(p, id)}</b>` : ''}</button>`).join('')
      : `<span class="traylbl">${built(p) === total ? 'Finished! 🎉' : 'Collect pieces on the board to build your model.'}</span>`;
    const extras = Object.keys(p.hand).filter(id => need[id] < 0);
    $('#extras' + pi).innerHTML = extras.length ? `Holding someone else's: ${extras.map(id =>
      `<span class="xpiece" title="${PIECES[id].name}">${icon(id)}${-need[id] > 1 ? `×${-need[id]}` : ''}</span>`).join('')}` : '';
  });
}
// "Take a piece from another player" picker for 3D sets.
function showTakeBox(opts) {
  const by = {};
  for (const o of opts) (by[o.owner] = by[o.owner] || []).push(o.id);
  $('#takeList').innerHTML = Object.entries(by).map(([owner, ids]) => {
    const q = G.players[owner];
    return `<div class="takerow"><div class="who"><span class="dot" style="background:${q.color}"></span>${q.name}</div><div class="takepieces">${ids.map(id =>
      `<button class="takepick" data-owner="${owner}" data-piece="${id}" title="${PIECES[id].name}">${icon(id)}${q.hand[id] > 1 ? `<b>×${q.hand[id]}</b>` : ''}${knocksOff(q, id) ? '<i>off the model!</i>' : ''}</button>`).join('')}</div></div>`;
  }).join('');
  $('#takeBox').hidden = false;
}

function log(msg) {
  G.log.unshift(msg);
  G.log = G.log.slice(0, 50);
  if (!SIM) $('#log').innerHTML = G.log.map(m => `<li>${m}</li>`).join('');
}

// Head start (a house rule): applied once when the game starts, never topped up later, so pieces stolen from a
// player with a head start are simply gone (a known downside).
// Models in a card set differ in size, and special pieces are harder to get than bricks (fewer
// spaces give them). Players with harder models start with some of their pieces, so everyone has about the
// same amount left to collect. A special piece counts double, unless flexible picks make them as easy as bricks.
function headStart() {
  const SPECIAL_WEIGHT = setById(G.set).ldraw && RULES.flexPick ? 1 : 2;
  const work = p => {
    const ids = [];
    for (const id in modelOf(p).parts) for (let k = 0; k < modelOf(p).parts[id]; k++) ids.push(id);
    return ids;
  };
  const score = ids => ids.reduce((a, id) => a + (PIECES[id].kind === 'special' ? SPECIAL_WEIGHT : 1), 0);
  const target = Math.min(...G.players.map(p => score(work(p))));
  for (const p of G.players) {
    const ids = work(p).sort(() => Math.random() - .5);
    let left = score(ids), given = 0;
    // Hand out special pieces first (they are the scarce ones), then bricks, until this player's work matches the easiest model.
    for (const kind of ['special', 'brick']) {
      for (const id of ids) {
        const w = kind === 'special' ? SPECIAL_WEIGHT : 1;
        if (PIECES[id].kind !== kind || left - w < target || !G.supply[id]) continue;
        G.supply[id]--; p.hand[id] = (p.hand[id] || 0) + 1; left -= w; given++;
      }
    }
    if (given) log(`Head start for ${p.name}: ${given} piece${given > 1 ? 's' : ''} for a bigger model.`);
  }
}

async function newGame(set, cfg) {
  disposeViews();
  G = null;
  $('#winBox').hidden = true;
  const s = setById(set);
  if (s.ldraw && !SIM) {
    $('#loadMsg').textContent = 'Unboxing the bricks…';
    $('#loading').hidden = false;
    try {
      await build3dReady;
      await Build3D.loadSet(s, (done, all) => $('#loadMsg').textContent = `Unboxing the bricks… ${done} of ${all} models`);
    } catch (e) {
      $('#loadMsg').textContent = e.message;
      return;
    }
    $('#loading').hidden = true;
  }
  G = {
    set, players: cfg.map((c, i) => ({...c, color: PAWN_COLORS[i], pos: 0, hand: {}, placed: {}})),
    supply: startSupply(s), cur: Math.floor(Math.random() * cfg.length), phase: 'roll',
    queue: [], pending: null, log: [], winner: null,
    turns: 0, stats: {turnsLost: 0, takes: 0, knockOffs: 0},
  };
  $('#log').innerHTML = '';
  buildBoard();
  if (s.ldraw && !SIM) {
    setupCards3D();
    const g = G;
    G.timer = setInterval(() => cpuBuild(g), 1000);
  }
  log(`New game with ${s.name} cards. First up: ${curP().name} (most colorful clothes)!`);
  if (RULES.headStart) headStart();
  if (s.ldraw) log('Build your model any time, even on other turns: tap a piece under your model. The first finished model wins!');
  render();
  startTurn();
}

function modelCard(p, pi, opts = {}) {
  const m = modelOf(p), set = setById(G.set), pd = G.pending;
  const [have, total] = progress(p);
  const grabbable = id => pd && pd.a.t === 'take' && pi !== G.cur && pd.opts.some(o => o.owner === pi && o.id === id);
  let n = 0;
  const slotsFor = kind => {
    let s = '';
    for (const id in m.parts) {
      if (PIECES[id].kind !== kind) continue;
      const got = Math.min(m.parts[id], p.hand[id] || 0);
      for (let k = 0; k < m.parts[id]; k++) {
        const ok = opts.full || k < got;
        s += `<button class="slot ${ok ? '' : 'miss'} ${ok && grabbable(id) ? 'eligible' : ''}" data-owner="${pi}" data-piece="${id}" style="animation-delay:${n++ * 90}ms" tabindex="${ok && grabbable(id) ? 0 : -1}">${icon(id)}</button>`;
      }
    }
    return s;
  };
  const need = needOf(p);
  const extras = Object.keys(p.hand).filter(id => need[id] < 0).map(id =>
    Array.from({length: -need[id]}, () => `<button class="slot ${grabbable(id) ? 'eligible' : ''}" data-owner="${pi}" data-piece="${id}">${icon(id)}</button>`).join('')).join('');
  return `<div class="mcard ${pi === G.cur && !G.winner && !opts.full ? 'active' : ''}" style="--setc:${set.color}">
    <div class="mhead"><span class="mtitle">${m.tag} - ${m.name}</span> ${m.emoji}
      ${opts.full ? '' : `<span class="dot" style="background:${p.color}"></span>${p.name}${p.cpu ? ' <small>(computer)</small>' : ''}<span class="prog">${have}/${total}</span>`}</div>
    <div class="piecerow">${m.img ? `<img class="mpic" src="${m.img}" alt="Finished ${m.name}" onerror="this.remove()">` : ''}<div class="slots">${slotsFor('brick')}</div><div class="slots sp">${slotsFor('special')}</div></div>
    ${extras ? `<div class="extras">Holding someone else's: <div class="slots">${extras}</div></div>` : ''}
  </div>`;
}

function render() {
  if (!G || SIM) return;
  document.querySelectorAll('.cell').forEach(c => { c.querySelector('.pawns').innerHTML = ''; c.classList.remove('hot', 'multi', 'target'); });
  G.players.forEach((p, i) => {
    const cell = $('#cell' + p.pos);
    cell.querySelector('.pawns').insertAdjacentHTML('beforeend', `<div class="pawn" style="border-color:${p.color}" title="${p.name}"></div>`);
    if (cell.querySelectorAll('.pawn').length > 2) cell.classList.add('multi');
    if (i === G.cur) cell.classList.add('hot');
  });
  if (G.pending && G.pending.a.t === 'heli') G.pending.opts.forEach(i => $('#cell' + i).classList.add('target'));
  renderYard();
  if (is3D()) renderPlayers3D();
  else $('#players').innerHTML = G.players.map((p, pi) => modelCard(p, pi)).join('');
  const p = curP();
  $('#who').innerHTML = `<span class="dot" style="background:${p.color}"></span>Turn: ${p.name}`;
  $('#rollBtn').disabled = !(G.phase === 'roll' && !p.cpu && !G.winner);
}
function setPrompt(text, skippable) {
  $('#prompt').textContent = text;
  $('#skipBtn').hidden = !skippable;
}


/* ================= Turn flow ================= */
function startTurn() {
  if (G.winner) return;
  const p = curP();
  G.phase = 'roll';
  setPrompt(p.cpu ? `${p.name} is rolling…` : 'Roll the die to move.', false);
  render();
  if (SIM) return simTurn();
  if (p.cpu) { const g = G; setTimeout(() => { if (G === g) roll(); }, 800); }
}
// One simulated turn. A real turn takes about 4 seconds and computer players place a piece every second, so 4 here.
function simTurn() {
  const g = G;
  G.turns++;
  if (is3D()) for (let k = 0; k < 4; k++) cpuBuild(g);
  if (G.winner) return;
  if (G.turns > SIM_TURN_CAP) { G.phase = 'over'; G.winner = {stuck: true}; return G.onEnd && G.onEnd('stuck'); }
  nextTask().then(() => { if (G === g) roll(); });
}

async function roll() {
  if (!G || G.phase !== 'roll' || G.winner) return;
  const g = G, p = curP();
  G.phase = 'moving';
  render();
  const die = $('#die');
  die.classList.add('rolling');
  for (let k = 0; k < 8; k++) { die.innerHTML = dieFace(1 + Math.floor(Math.random() * 6)); await sleep(60); }
  const n = 1 + Math.floor(Math.random() * 6);
  die.innerHTML = dieFace(n);
  die.classList.remove('rolling');
  if (G !== g) return;
  log(`${p.name} rolled a ${n}.`);
  setPrompt(`${p.name} moves ${n}…`, false);
  for (let s = 1; s <= n; s++) {
    await sleep(200);
    if (G !== g) return;
    p.pos = (p.pos + 1) % TRACK.length;
    render();
  }
  await sleep(250);
  if (G !== g) return;
  landOn(p);
}

function landOn(p) {
  const sp = spaceAt(p.pos);
  log(`${p.name} landed on <b>${sp.label}</b>.`);
  G.queue = sp.act.map(a => ({...a}));
  G.phase = 'acting';
  G.gotSomething = false;
  G.lostTurn = false;
  processQueue();
}

function matches(id, f) {
  const P = PIECES[id];
  if (f === 'piece') return true;
  if (f === 'special') return P.kind === 'special';
  if (f === 'brick') return P.kind === 'brick';
  return P.kind === 'brick' && P.color === f;
}
function options(a, p) {
  if (a.t === 'pick') {
    const need = needOf(p);
    return Object.keys(PIECES).filter(id => G.supply[id] > 0 && matches(id, a.f) && need[id] > 0);
  }
  if (a.t === 'take') {
    const o = [];
    G.players.forEach((q, qi) => { if (q !== p) for (const id in q.hand) if (q.hand[id] > 0) o.push({owner: qi, id}); });
    return o;
  }
  if (a.t === 'heli') return TRACK.map((k, i) => i).filter(i => !spaceAt(i).act.some(x => x.t === 'heli'));
  return [];
}
function promptText(a) {
  if (a.t === 'pick') return `Take ${filterLabel(a.f)} you need from the Brickyard.`;
  if (a.t === 'take') return "Take a piece from another player's card.";
  if (a.t === 'heli') return 'Helicopter! Click any space on the board to fly there.';
}

async function processQueue() {
  const g = G, p = curP();
  while (G === g && G.queue.length) {
    const a = G.queue.shift();
    const opts = options(a, p);
    if (!opts.length) {
      if (a.t === 'pick' && !G.gotSomething && !G.lostTurn) { G.lostTurn = true; log(`${p.name} doesn't need anything here and loses the turn.`); G.stats.turnsLost++; }
      else if (a.t === 'take') log(`Nobody has any pieces to take yet.`);
      await sleep(500);
      continue;
    }
    let choice;
    if (p.cpu) {
      setPrompt(`${p.name}: ${promptText(a)}`, false);
      await sleep(700);
      choice = cpuChoose(a, p, opts);
    } else {
      choice = await new Promise(res => {
        G.pending = {a, opts, resolve: res};
        setPrompt(promptText(a), true);
        render();
        if (a.t === 'take' && is3D()) showTakeBox(opts);
      });
    }
    if (G !== g || G.winner) return;
    if (applyAction(a, p, choice) === 'moved') return landOn(p);
    render();
    if (hasWon(p)) return win(p);
  }
  if (G !== g || G.winner) return;
  setPrompt('', false);
  G.cur = (G.cur + 1) % G.players.length;
  startTurn();
}

function applyAction(a, p, choice) {
  if (choice == null) { log(`${p.name} passed.`); return; }
  const add = (h, id, d) => h[id] = (h[id] || 0) + d;
  if (a.t === 'pick') {
    G.supply[choice]--; add(p.hand, choice, 1); G.gotSomething = true;
    log(`${p.name} took a ${PIECES[choice].name}.`);
  } else if (a.t === 'take') {
    const q = G.players[choice.owner];
    const offModel = is3D() && knocksOff(q, choice.id);
    add(q.hand, choice.id, -1); add(p.hand, choice.id, 1);
    G.stats.takes++;
    if (offModel) { q.placed[choice.id]--; G.stats.knockOffs++; if (G.views) G.views[choice.owner].unplace(choice.id); }
    log(`${p.name} took a ${PIECES[choice.id].name} ${offModel ? `right off ${q.name}'s model` : `from ${q.name}`}!`);
  } else if (a.t === 'heli') {
    p.pos = choice;
    log(`${p.name} flew to <b>${spaceAt(choice).label}</b>.`);
    render();
    return 'moved';
  }
}
function resolvePending(v) {
  const pd = G.pending;
  if (!pd) return;
  G.pending = null;
  $('#takeBox').hidden = true;
  setPrompt('', false);
  pd.resolve(v);
}


/* ================= Computer players ================= */
function cpuChoose(a, p, opts) {
  const need = needOf(p);
  const rnd = () => Math.random();
  const best = (list, score) => list.map(o => [o, score(o) + rnd()]).sort((x, y) => y[1] - x[1])[0][0];
  if (a.t === 'pick') return best(opts, id => 10 - G.supply[id]); // grab the scarcest piece first
  if (a.t === 'take') {
    // Reclaim pieces we need first; otherwise slow down whoever is closest to winning.
    return best(opts, o => (need[o.id] > 0 ? 100 : 0) + (60 - piecesLeft(G.players[o.owner])) * 3
      + (needOf(G.players[o.owner])[o.id] >= 0 ? 10 : 0));
  }
  if (a.t === 'heli') return best(opts, i => spaceValue(p, i));
}
function spaceValue(p, i) {
  let v = 0;
  for (const a of spaceAt(i).act) {
    const opts = options(a, p);
    if (a.t === 'pick') v += opts.length ? 10 + (a.f === 'special' ? 2 : 0) : 0;
    if (a.t === 'take') v += opts.some(o => needOf(p)[o.id] > 0) ? 14 : opts.length ? 6 : 0;
  }
  return v;
}


/* ================= Win ================= */
function win(p) {
  if (G.winner) return;
  G.winner = p;
  G.phase = 'over';
  if (G.pending) { G.pending = null; $('#takeBox').hidden = true; }
  const m = modelOf(p), pi = G.players.indexOf(p);
  log(`🏆 ${p.name} built the ${m.name}!`);
  if (SIM) return G.onEnd && G.onEnd('win');
  setPrompt(`${p.name} wins!`, false);
  render();
  $('#winTitle').textContent = `${p.name} built the ${m.name}! ${m.emoji}`;
  const link = m.no ? `<p><a href="https://www.bricklink.com/v2/catalog/catalogitem.page?S=${m.no}" target="_blank" rel="noopener">See the real set ${m.no} on BrickLink</a></p>` : '';
  if (is3D()) {
    G.views[pi].celebrate();
    $('#winModel').innerHTML = `<div class="view3d big" id="winView"></div>${link}`;
    setTimeout(() => {
      $('#winBox').hidden = false;
      G.winView = Build3D.createView($('#winView'), m, {autoRotate: true});
      G.winView.setPlaced(m.parts);
    }, 1200);
  } else {
    $('#winModel').innerHTML = modelCard(p, pi, {full: true}) + link;
    setTimeout(() => $('#winBox').hidden = false, 500);
  }
}


/* ================= Setup ================= */
let setupPack = 'original', setupSet = 'original/1';
let setup = [
  {name: 'You', cpu: false, model: 0},
  {name: 'Computer', cpu: true, model: 1},
];
function renderSetup() {
  $('#packPick').innerHTML = PACKS.map(p => `<option value="${p.id}" ${p.id === setupPack ? 'selected' : ''}>${p.emoji} ${p.name} (${p.sets.length} card set${p.sets.length > 1 ? 's' : ''})</option>`).join('');
  const pack = PACKS.find(p => p.id === setupPack);
  $('#setPick').innerHTML = pack.sets.map(s =>
    `<option value="${s.id}" ${s.id === setupSet ? 'selected' : ''}>${s.name}: ${s.models.map(m => m.name).join(', ')}</option>`).join('');
  const set = setById(setupSet), models = set.models;
  $('#setInfo').innerHTML = `<div class="setpics">${models.map(m => m.img ? `<img src="${m.img}" alt="${m.name}" title="${m.name}" onerror="this.remove()">` : `<span>${m.emoji}</span>`).join('')}</div>` +
    `${models.map(m => Object.values(m.parts).reduce((a, b) => a + b, 0)).join(' / ')} pieces per model` +
    (set.pickCount > 1 ? ` · big models, so Pick spaces give ${set.pickCount}× pieces` : '');
  $('#setupRows').innerHTML = setup.map((s, i) => `<div class="prow">
    <span class="dot" style="background:${PAWN_COLORS[i]}"></span>
    <input data-i="${i}" data-k="name" value="${s.name.replace(/"/g, '&quot;')}" maxlength="14" aria-label="Player ${i + 1} name">
    <select data-i="${i}" data-k="cpu" aria-label="Player type"><option value="0" ${!s.cpu ? 'selected' : ''}>Human</option><option value="1" ${s.cpu ? 'selected' : ''}>Computer</option></select>
    <select data-i="${i}" data-k="model" aria-label="Model">${models.map((m, mi) => `<option value="${mi}" ${mi === s.model ? 'selected' : ''}>${m.emoji} ${m.name}${m.no ? ` (${m.tag})` : ''}</option>`).join('')}</select>
    <button class="x" data-rm="${i}" ${setup.length <= 2 ? 'disabled style="visibility:hidden"' : ''} aria-label="Remove player">✕</button>
  </div>`).join('');
  $('#addP').disabled = setup.length >= 4;
}
$('#packPick').addEventListener('change', e => { setupPack = e.target.value; setupSet = PACKS.find(p => p.id === setupPack).sets[0].id; renderSetup(); });
$('#setPick').addEventListener('change', e => { setupSet = e.target.value; renderSetup(); });
$('#setupRows').addEventListener('change', e => {
  const t = e.target, i = +t.dataset.i, k = t.dataset.k;
  if (k === 'name') setup[i].name = t.value.trim() || `Player ${i + 1}`;
  if (k === 'cpu') setup[i].cpu = t.value === '1';
  if (k === 'model') {
    const v = +t.value, other = setup.findIndex((s, j) => j !== i && s.model === v);
    if (other >= 0) setup[other].model = setup[i].model; // models are unique: swap
    setup[i].model = v;
  }
  renderSetup();
});
$('#setupRows').addEventListener('click', e => {
  const rm = e.target.closest('[data-rm]');
  if (rm) { setup.splice(+rm.dataset.rm, 1); renderSetup(); }
});
$('#addP').onclick = () => {
  const used = setup.map(s => s.model);
  setup.push({name: `Computer ${setup.length}`, cpu: true, model: [0, 1, 2, 3].find(m => !used.includes(m))});
  renderSetup();
};
$('#startBtn').onclick = () => {
  document.querySelectorAll('#setupRows input').forEach(inp => setup[+inp.dataset.i].name = inp.value.trim() || `Player ${+inp.dataset.i + 1}`);
  $('#setup').hidden = true;
  newGame(setupSet, setup.map(s => ({...s})));
};


/* ================= Wiring ================= */
$('#rollBtn').onclick = roll;
$('#skipBtn').onclick = () => { if (G && G.pending) resolvePending(null); };
$('#newBtn').onclick = () => { renderSetup(); $('#setup').hidden = false; };
$('#againBtn').onclick = () => { $('#winBox').hidden = true; renderSetup(); $('#setup').hidden = false; };
$('#rulesBtn').onclick = () => $('#rules').hidden = false;
$('#rulesClose').onclick = () => $('#rules').hidden = true;
$('#takeSkip').onclick = () => { if (G && G.pending) resolvePending(null); };
document.addEventListener('click', e => {
  const tp = e.target.closest('.tray-piece');
  if (tp && G) return placePiece(+tp.dataset.owner, tp.dataset.piece);
  if (!G || !G.pending) return;
  const pd = G.pending;
  const pick = e.target.closest('.takepick');
  if (pick && pd.a.t === 'take') return resolvePending({owner: +pick.dataset.owner, id: pick.dataset.piece});
  const sup = e.target.closest('.sup');
  if (sup && pd.a.t === 'pick' && pd.opts.includes(sup.dataset.piece)) return resolvePending(sup.dataset.piece);
  const slot = e.target.closest('.slot');
  if (slot && pd.a.t === 'take') {
    const owner = +slot.dataset.owner, id = slot.dataset.piece;
    if (pd.opts.some(o => o.owner === owner && o.id === id)) return resolvePending({owner, id});
  }
  const cell = e.target.closest('.cell');
  if (cell && pd.a.t === 'heli' && pd.opts.includes(+cell.dataset.cell)) return resolvePending(+cell.dataset.cell);
});
// Pointing at a tray piece lights up where it goes on the model.
for (const [ev, on] of [['mouseover', true], ['focusin', true], ['mouseout', false], ['focusout', false]]) {
  document.addEventListener(ev, e => {
    const tp = e.target.closest && e.target.closest('.tray-piece');
    if (tp && G && G.views) G.views[+tp.dataset.owner].hint(on ? tp.dataset.piece : null);
  });
}
document.addEventListener('keydown', e => {
  if ((e.key === ' ' || e.key === 'Enter') && !$('#rollBtn').disabled && $('#setup').hidden && !['INPUT', 'SELECT', 'BUTTON'].includes(document.activeElement.tagName)) {
    e.preventDefault(); roll();
  }
});

$('#die').innerHTML = dieFace(1);
renderSetup();
// Placeholder state so the board renders behind the setup dialog
G = {set: SETS[0].id, players: [{name: '—', color: PAWN_COLORS[0], pos: 0, hand: {}, model: 0}], supply: startSupply(SETS[0]), cur: 0, phase: 'setup', pending: null, log: []};
buildBoard();
render();
