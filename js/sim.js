/* ================= Simulation runner =================
 * Open index.html?sim=1 (optionally &games=20&players=4&sets=space,cars or a full set id like space/robots).
 * Computer players then play every card set that many times, as fast as possible, and the page shows a report:
 * how long games take, which models win, and any game that crashed, hung or hit the turn cap.
 * Results are also in window.simResults (one row per game) for a closer look in the console.
 */
(function () {
  if (!SIM) return;
  const q = new URLSearchParams(location.search);
  const GAMES = +q.get('games') || 20, PLAYERS = Math.min(4, Math.max(2, +q.get('players') || 4));
  const pick = (q.get('sets') || '').split(',').filter(Boolean);
  const sets = SETS.filter(s => !pick.length || pick.some(x => s.id === x || s.packId === x));
  const HANG_MS = 20000;
  window.simResults = [];

  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const size = m => Object.values(m.parts).reduce((a, b) => a + b, 0);
  const median = xs => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };

  async function playOne(set) {
    const errors = [];
    const onErr = e => errors.push(String(e.message || e.reason));
    addEventListener('error', onErr);
    addEventListener('unhandledrejection', onErr);
    const models = shuffle([0, 1, 2, 3]).slice(0, PLAYERS);
    let outcome;
    try {
      const ended = new Promise(res => {
        newGame(set.id, models.map((m, i) => ({name: `CPU ${i + 1}`, cpu: true, model: m})));
        G.onEnd = res;
      });
      outcome = await Promise.race([ended, new Promise(r => setTimeout(() => r('hung'), HANG_MS))]);
    } catch (e) {
      errors.push(e.message);
      outcome = 'error';
    }
    removeEventListener('error', onErr);
    removeEventListener('unhandledrejection', onErr);
    if (errors.length && outcome === 'win') outcome = 'error';
    const w = G && G.winner && !G.winner.stuck ? G.winner : null;
    const row = {
      set: set.id, outcome, turns: G ? G.turns : 0, players: PLAYERS,
      winner: w ? modelOf(w).name : null, winnerSize: w ? size(modelOf(w)) : null,
      sizes: models.map(m => size(set.models[m])), ...(G ? G.stats : {}), errors,
    };
    if (G) G.winner = G.winner || {stuck: true}; // stop anything still running from this game
    window.simResults.push(row);
    return row;
  }

  function report() {
    const rows = window.simResults;
    const bySet = sets.map(set => {
      const r = rows.filter(x => x.set === set.id);
      const wins = {};
      for (const x of r) if (x.winner) wins[x.winner] = (wins[x.winner] || 0) + 1;
      const shares = set.models.map(m => ({name: m.name, size: size(m), share: r.length ? (wins[m.name] || 0) / r.length : 0}));
      const top = shares.reduce((a, b) => b.share > a.share ? b : a, shares[0]);
      const bad = r.filter(x => x.outcome !== 'win');
      return {set, r, shares, top, bad,
        turns: r.map(x => x.turns), lost: r.reduce((a, x) => a + (x.turnsLost || 0), 0) / Math.max(1, r.reduce((a, x) => a + x.turns, 0)),
        ok: !bad.length && top.share <= .4};
    });
    const passed = bySet.filter(b => b.ok).length;
    const pct = x => `${Math.round(x * 100)}%`;
    $('#simReport').innerHTML = `<h2>Simulation: ${rows.length} games, ${PLAYERS} computer players each</h2>
      <p><b>${passed} of ${bySet.length} card sets pass</b> (every game finishes; no model wins more than 40%).
      Turn cap ${SIM_TURN_CAP}. Model sizes are pieces per model.</p>
      <table class="simtable"><thead><tr><th>Card set</th><th>Games</th><th>Turns (median / max)</th><th>Turns lost</th>
      <th>Win share by model (pieces)</th><th>Problems</th></tr></thead><tbody>${bySet.map(b => `<tr class="${b.ok ? '' : 'bad'}">
        <td>${b.set.id}</td><td>${b.r.length}</td><td>${median(b.turns)} / ${Math.max(0, ...b.turns)}</td><td>${pct(b.lost)}</td>
        <td>${b.shares.map(s => `<span class="${s === b.top && s.share > .4 ? 'hot' : ''}">${s.name} (${s.size}) ${pct(s.share)}</span>`).join('<br>')}</td>
        <td>${b.bad.length ? b.bad.map(x => `${x.outcome}${x.errors.length ? ': ' + x.errors[0] : ''}`).slice(0, 3).join('<br>') : ''}</td></tr>`).join('')}
      </tbody></table>`;
  }

  async function run() {
    document.querySelectorAll('.overlay').forEach(o => o.hidden = true);
    document.body.insertAdjacentHTML('beforeend', '<section id="simReport" class="card simreport"><h2>Simulating…</h2></section>');
    const t0 = performance.now();
    for (const set of sets) {
      for (let i = 0; i < GAMES; i++) {
        await playOne(set);
        $('#simReport h2').textContent = `Simulating… ${window.simResults.length} of ${sets.length * GAMES} games`;
      }
    }
    report();
    window.simDone = {games: window.simResults.length, seconds: Math.round((performance.now() - t0) / 1000)};
    console.log('Simulation finished', window.simDone);
  }
  addEventListener('load', () => setTimeout(run, 0));
})();
