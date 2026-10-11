/* ================= Packs =================
 * A pack is a themed group of card sets (Dinosaurs, Space, ...). Every card set has exactly 4 models, and
 * the Brickyard for a game holds exactly the pieces those 4 models need.
 *
 * Pack files in packs/ call registerPack() with data made by tools/bricklink-pack-builder.js:
 *   registerPack({id, name, emoji, parts: {partKey: [description, category]}, sets: [{id, name, models: [{no, name, p}]}]})
 * where partKey is "<BrickLink part number>@<BrickLink color id>" ("@m" for a minifigure) and p is [[partKey, quantity], ...].
 */
const PIECES = {};  // every piece the game knows about, by id
const PACKS = [];   // {id, name, emoji, sets}
const SETS = [];    // every card set from every pack: {id, packId, name, color, colors, models, pickCount}

const MODEL_EMOJI = [
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

// Plain bricks, plates, tiles and slopes are drawn by the game; everything else (wheels, printed parts,
// see-through parts, minifigures, ...) is a "special piece" shown with its BrickLink picture.
function partFromBrickLink(key, [desc, category]) {
  const [no, cid] = key.split('@');
  if (cid === 'm') return {id: key, name: desc.split(' - ')[0], kind: 'special', img: `https://img.bricklink.com/ItemImage/MN/0/${no}.png`};
  const color = BL_COLORS[cid];
  const special = {id: key, name: desc, kind: 'special', color, img: `https://img.bricklink.com/ItemImage/PN/${cid}/${no}.png`};
  if (!color || /Decorated|Modified/.test(category)) return special;
  const rest = desc.slice(COLOR_NAME[color].length + 1);
  const shapes = [
    [/^(Brick|Plate|Tile) (\d+) x (\d+)(?: x \d+)?$/, m => ({shape: m[1].toLowerCase(), rows: +m[2], cols: +m[3]})],
    [/^Plate (\d+) x (\d+) Corner$/, m => ({shape: 'corner', rows: +m[1], cols: +m[2]})],
    [/^Slope (?:18|30|33|45|65|75) (\d+) x (\d+)(?: x [\d/]+)?$/, m => ({shape: 'slope', cols: +m[1], rows: +m[2]})],
    [/^Slope, Inverted (?:33|45|75) (\d+) x (\d+)(?: x \d+)?(?: with Flat Bottom Pin.*)?$/, m => ({shape: 'hole', cols: +m[1], rows: +m[2]})],
    [/^Slope, Curved (\d+) x (\d+)(?: x [\d/]+)?(?: No Studs)?$/, m => ({shape: 'curve', cols: +m[1], rows: +m[2]})],
    [/^(?:Brick|Plate), Round (\d) x \1$/, m => ({shape: 'round', rows: +m[1], cols: +m[1]})],
    [/^Brick, Round Corner 4 x 4 Full Brick$|^Brick, Round Corner 4 x 4$/, () => ({shape: 'quarter', rows: 4, cols: 4})],
    [/^Wedge 3 x 2 (Left|Right)$/, m => ({shape: 'wedge' + m[1][0], rows: 2, cols: 3})],
  ];
  for (const [re, f] of shapes) {
    const m = rest.match(re);
    if (m) return {id: key, name: desc, kind: 'brick', color, ...f(m)};
  }
  return special;
}

// Shared by both kinds of pack: add one card set and work out its board colors and pick size.
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

function registerPack({id, name, emoji, parts, sets}) {
  const pack = {id, name, emoji, sets: []};
  PACKS.push(pack);
  for (const s of sets) {
    const models = s.models.map(m => {
      const counts = {};
      for (const [k, q] of m.p) {
        counts[k] = (counts[k] || 0) + q;
        if (!PIECES[k]) PIECES[k] = partFromBrickLink(k, parts[k]);
      }
      return {name: m.name.toLowerCase(), emoji: emojiFor(m.name), parts: counts, no: m.no,
        tag: m.no.replace(/-1$/, ''), img: `https://img.bricklink.com/ItemImage/SN/0/${m.no}.png`};
    });
    addSet(pack, {id: s.id, name: s.name, models});
  }
}

const setById = id => SETS.find(s => s.id === id);
function startSupply(set) {
  const s = {};
  for (const m of set.models) for (const k in m.parts) s[k] = (s[k] || 0) + m.parts[k];
  return s;
}
