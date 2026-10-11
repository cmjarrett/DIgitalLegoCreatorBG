/* ================= Packs =================
 * A pack is a themed group of card sets (Dinosaurs, Space, ...). Every card set has exactly 4 models, and
 * the Brickyard for a game holds exactly the pieces those 4 models need.
 *
 * The original game is in js/original.js; the themed 3D packs in packs/ call registerLDrawPack() below.
 */
const PIECES = {};  // every piece the game knows about, by id
const PACKS = [];   // {id, name, emoji, sets}
const SETS = [];    // every card set from every pack: {id, packId, name, color, colors, models, pickCount}

const MODEL_EMOJI = [
  [/tie |starfighter|slave i|interceptor|arc-170|cruiser|destroyer/i, '⭐'], [/knight|monarch|jousting|horse/i, '🛡️'],
  [/pirate|treasure/i, '🏴‍☠️'], [/chief|wheelgun|bandit/i, '🤠'], [/pumpkin/i, '🎃'], [/ghost/i, '👻'], [/\bbat\b/i, '🦇'],
  [/wreath/i, '🎄'], [/cow/i, '🐄'], [/hog|pig/i, '🐷'], [/crocodile/i, '🐊'], [/scorpion/i, '🦂'], [/butterfly/i, '🦋'],
  [/pteranodon|apatosaurus/i, '🦕'], [/tractor|digger|loader|dumper|shovel|tipper/i, '🚜'], [/jet-ski/i, '🚤'],
  [/motorcycle/i, '🏍️'], [/builder/i, '👷'], [/satellite|up-link/i, '🛰️'], [/k-9|bot\b|robot/i, '🤖'], [/biplane/i, '🛩️'],
  [/shuttle|rocket|lander/i, '🚀'], [/ufo|saucer/i, '🛸'], [/astronaut|satellite/i, '👩‍🚀'], [/ambulance/i, '🚑'], [/police/i, '🚓'],
  [/fire/i, '🚒'], [/tow|tipper|truck/i, '🚚'], [/buggy|rover|atv|quad/i, '🚙'], [/van/i, '🚐'], [/gyro|whirler|helicopter/i, '🚁'],
  [/racer|racing|race car|dragster|sports car|car/i, '🏎️'], [/plane|aircraft|striker|jet|glider/i, '✈️'], [/eagle/i, '🦅'],
  [/submarine/i, '🐟'], [/ship|boat|scooter/i, '🚤'], [/diver/i, '🤿'], [/duck/i, '🦆'], [/owl/i, '🦉'], [/parrot|toucan|kingfisher|bird/i, '🐦'],
  [/raptor|dino|rex|triceratops|stegosaurus/i, '🦖'], [/dragon/i, '🐉'], [/giraffe/i, '🦒'], [/lion/i, '🦁'], [/elephant/i, '🐘'],
  [/gorilla|monkey/i, '🦍'], [/frog/i, '🐸'], [/lizard|snake/i, '🦎'], [/snail/i, '🐌'], [/mouse/i, '🐭'], [/cat/i, '🐱'], [/dog/i, '🐶'],
  [/deer|moose/i, '🦌'], [/whale|narwhal/i, '🐳'], [/shark/i, '🦈'], [/crab/i, '🦀'], [/fish/i, '🐠'], [/bee/i, '🐝'], [/hedgehog/i, '🦔'],
  [/ladybird/i, '🐞'], [/fox/i, '🦊'], [/polar bear/i, '🐻‍❄️'], [/penguin/i, '🐧'], [/snowman/i, '⛄'], [/igloo/i, '🧊'], [/santa/i, '🎅'],
  [/witch/i, '🧙'], [/monster/i, '🧟'], [/scarecrow/i, '🎃'], [/robot/i, '🤖'], [/explorer/i, '🧭'],
];
const emojiFor = name => (MODEL_EMOJI.find(([re]) => re.test(name)) || [, '🧱'])[1];

// Add one card set and work out its board colors and pick size.
function addSet(pack, set) {
  const count = {};
  for (const m of set.models) for (const k in m.parts) if (PIECES[k].kind === 'brick') count[PIECES[k].color] = (count[PIECES[k].color] || 0) + m.parts[k];
  // The five most common brick colors become this set's "Pick (color) Brick" spaces, unless the set says otherwise.
  set.colors = set.colors || Object.keys(count).sort((a, b) => count[b] - count[a]).slice(0, 5);
  set.color = set.color || COL[set.colors.find(c => c !== 'white')] || '#d01012';
  // Big models make long games, so Pick spaces hand out more pieces at once (about 17 pieces per pick-size, like the original).
  const sizes = set.models.map(m => Object.values(m.parts).reduce((a, b) => a + b, 0));
  set.pickCount = set.pickCount || Math.max(1, Math.round(sizes.reduce((a, b) => a + b, 0) / sizes.length / 17));
  set.packId = pack.id;
  set.id = `${pack.id}/${set.id}`;
  pack.sets.push(set);
  SETS.push(set);
}

/* 3D packs (packs/*.js made by tools/ldraw-pack.mjs). Pieces are LDraw parts: "<part file>@<LDraw color code>",
 * or "fig:<sub-model>" for a whole minifigure. Their pictures are rendered by js/build3d.js when a game starts. */
const SPECIAL_COLOR = {}; // transparent / metallic LDraw colors: those pieces are always special pieces
function registerLDrawPack({id, name, emoji, colors, parts, sets}) {
  for (const code in colors) {
    const [cname, hex, special] = colors[code], key = `ld${code}`;
    if (COL[key]) continue;
    COL[key] = hex; DK[key] = darken(hex); COLOR_NAME[key] = cname; SPECIAL_COLOR[key] = !!special;
  }
  for (const key in parts) {
    if (PIECES[key]) continue;
    const [desc, code] = parts[key], color = `ld${code}`;
    const fig = key.startsWith('fig:');
    const clean = desc.replace(/^[~=_|]+/, '').replace(/\s+/g, ' ').trim();
    const regular = !fig && !SPECIAL_COLOR[color] && /^(Brick|Plate|Tile|Slope|Wedge)\b/i.test(clean) && !/Pattern|Sticker/i.test(clean);
    PIECES[key] = {id: key, kind: regular ? 'brick' : 'special', color, ldraw: true,
      name: fig ? 'Minifigure' : `${COLOR_NAME[color] && code !== 16 ? COLOR_NAME[color] + ' ' : ''}${clean}`};
  }
  const pack = {id, name, emoji, sets: []};
  PACKS.push(pack);
  for (const s of sets) {
    const models = s.models.map(m => {
      const counts = {};
      for (const [k, q] of m.p) counts[k] = (counts[k] || 0) + q;
      return {name: m.name.toLowerCase(), emoji: emojiFor(m.name), parts: counts, no: m.no, file: m.file, figs: m.figs, ldraw: true,
        tag: m.no.replace(/-1$/, ''), img: `https://img.bricklink.com/ItemImage/SN/0/${m.no}.png`};
    });
    addSet(pack, {id: s.id, name: s.name, models, ldraw: true});
  }
}

const setById = id => SETS.find(s => s.id === id);
function startSupply(set) {
  const s = {};
  for (const m of set.models) for (const k in m.parts) s[k] = (s[k] || 0) + m.parts[k];
  return s;
}
