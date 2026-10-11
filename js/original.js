/* ================= The original game (LEGO Creator: The Race to Build It, 1999) =================
 * 49 regular bricks and 19 special pieces from the instruction booklet, and the 20 model cards
 * (5 colored sets of 4). Each set's four models use every piece exactly once.
 */
// [id, name, color, shape, rows, cols, quantity, decoration]
const REGULAR = [
  ['red12',      'Red 1×2 brick',            'red',   'brick', 1, 2, 1],
  ['redgrille',  'Red 1×2 grille',           'red',   'grille',1, 2, 1],
  ['red14',      'Red 1×4 brick',            'red',   'brick', 1, 4, 2],
  ['red24',      'Red 2×4 brick',            'red',   'brick', 2, 4, 2],
  ['red28',      'Red 2×8 brick',            'red',   'brick', 2, 8, 2],
  ['redcurve',   'Red 2×2 curved brick',     'red',   'curve', 2, 2, 2],
  ['redslope',   'Red 2×2 printed slope',    'red',   'slope', 2, 2, 1, 'tri'],
  ['yellow22',   'Yellow 2×2 brick',         'yellow','brick', 2, 2, 3],
  ['yellowhole', 'Yellow 2×2 brick w/ holes','yellow','hole',  2, 2, 2],
  ['yellowround','Yellow 2×2 round brick',   'yellow','round', 2, 2, 2],
  ['yellowslope','Yellow 2×2 printed slope', 'yellow','slope', 2, 2, 1, 'zig'],
  ['yellow18',   'Yellow 1×8 plate',         'yellow','plate', 1, 8, 2],
  ['blue14',     'Blue 1×4 brick',           'blue',  'brick', 1, 4, 4],
  ['blue22',     'Blue 2×2 brick',           'blue',  'brick', 2, 2, 1],
  ['blue24',     'Blue 2×4 brick',           'blue',  'brick', 2, 4, 1],
  ['bluehole',   'Blue 2×2 brick w/ holes',  'blue',  'hole',  2, 2, 4],
  ['blueslope',  'Blue 2×2 star slope',      'blue',  'slope', 2, 2, 1, 'star'],
  ['bluewedge',  'Blue wedge plate',         'blue',  'wedge', 3, 6, 1],
  ['green24',    'Green 2×4 brick',          'green', 'brick', 2, 4, 5],
  ['green26',    'Green 2×6 brick',          'green', 'brick', 2, 6, 2],
  ['green44',    'Green 4×4 plate',          'green', 'plate', 4, 4, 1],
  ['white12',    'White 1×2 brick',          'white', 'brick', 1, 2, 1],
  ['whiteslope', 'White 2×2 slope',          'white', 'slope', 2, 2, 2],
  ['whiteblack', 'White/black 2×3 slope',    'white', 'slope', 2, 3, 1, 'black'],
  ['black22',    'Black 2×2 brick',          'black', 'brick', 2, 2, 1],
  ['black26',    'Black 2×6 brick',          'black', 'brick', 2, 6, 1],
  ['grayaxle',   'Gray wheel holder',        'gray',  'axle',  2, 2, 2],
];
const SPECIAL = [
  ['windscreen', 'Windscreen', 3], ['smallscreen', 'Small windscreen', 1], ['rotor', 'Rotor', 1],
  ['clip', 'Yellow clip plate', 1], ['antenna', 'Antenna', 1], ['propeller', 'Propeller', 1],
  ['propmount', 'Propeller holder', 1], ['stick', 'Control stick', 2], ['headlight', 'Headlight brick', 2],
  ['wheel', 'Wheel', 4], ['redround', 'Red round plate', 1], ['greenround', 'Green round plate', 1],
];
for (const [id, name, color, shape, rows, cols, qty, deco] of REGULAR)
  PIECES[id] = {id, name, kind: 'brick', color, shape, rows, cols, qty, deco};
for (const [id, name, qty] of SPECIAL) PIECES[id] = {id, name, kind: 'special', qty};


/* Model cards (the 20 cards, 5 sets of 4) */
const ORIGINAL_SETS = [
  {id: '1', name: 'Set 1', color: '#d01012', models: [
    {name: 'robot', emoji: '🤖', parts: {red12:1, red28:1, redcurve:2, yellowround:2, green24:3, bluehole:4, headlight:2, stick:2}},
    {name: 'car', emoji: '🏎️', parts: {windscreen:1, wheel:4, yellowslope:1, red28:1, green26:1, black22:1, green24:1, grayaxle:2, redgrille:1, yellow22:1, blue22:1, red14:2}},
    {name: 'helicopter', emoji: '🚁', parts: {clip:1, rotor:1, windscreen:1, greenround:1, blue14:4, green44:1, yellow18:2, redslope:1, yellow22:1, yellowhole:2, black26:1, blue24:1}},
    {name: 'submarine', emoji: '🐟', parts: {windscreen:1, smallscreen:1, propmount:1, redround:1, propeller:1, antenna:1, white12:1, whiteslope:2, whiteblack:1, yellow22:1, green26:1, green24:1, red24:2, bluewedge:1, blueslope:1}},
  ]},
  {id: '2', name: 'Set 2', color: '#0b5ed7', models: [
    {name: 'robot', emoji: '🤖', parts: {rotor:1, clip:1, smallscreen:1, headlight:2, red14:2, redcurve:2, bluehole:2, yellow22:1, yellowround:2, blue22:1, green44:1, green24:1}},
    {name: 'car', emoji: '🏎️', parts: {windscreen:1, wheel:4, antenna:1, blueslope:1, yellowhole:1, blue24:1, yellow22:2, whiteblack:1, grayaxle:2, green24:2, red28:1}},
    {name: 'sled', emoji: '🛷', parts: {stick:2, greenround:1, redround:1, windscreen:1, bluewedge:1, black26:1, black22:1, red12:1, yellowslope:1, yellow18:2, whiteslope:2, bluehole:1, green24:1, red28:1}},
    {name: 'boat', emoji: '🚤', parts: {windscreen:1, propmount:1, propeller:1, white12:1, redslope:1, green26:2, bluehole:1, yellowhole:1, green24:1, red24:2, blue14:4, redgrille:1}},
  ]},
  {id: '3', name: 'Set 3', color: '#00852b', models: [
    {name: 'flying boat', emoji: '🛩️', parts: {windscreen:1, clip:1, rotor:1, bluehole:2, red14:1, green24:3, green44:1, yellow18:2, blue14:2, blueslope:1, whiteblack:1, redcurve:1}},
    {name: 'airplane', emoji: '✈️', parts: {windscreen:1, propmount:1, wheel:2, propeller:1, white12:1, yellowhole:1, redslope:1, yellow22:2, grayaxle:1, blue14:2, green26:2, redgrille:1, red28:1}},
    {name: 'robot', emoji: '🤖', parts: {wheel:2, headlight:2, stick:2, yellowround:2, whiteslope:2, red24:2, green24:1, redcurve:1, grayaxle:1, blue22:1, bluewedge:1}},
    {name: 'boat', emoji: '🚤', parts: {windscreen:1, smallscreen:1, greenround:1, redround:1, antenna:1, yellowhole:1, blue24:1, red12:1, yellow22:1, yellowslope:1, green24:1, red14:1, black22:1, bluehole:2, black26:1, red28:1}},
  ]},
  {id: '4', name: 'Set 4', color: '#f2c200', models: [
    {name: 'small boat', emoji: '🚤', parts: {windscreen:1, wheel:2, greenround:1, antenna:1, bluewedge:1, green24:1, yellowhole:2, red12:1, blueslope:1, grayaxle:1, yellow22:1, black22:1, red24:2, black26:1}},
    {name: 'robot', emoji: '🤖', parts: {stick:2, headlight:2, green24:2, red14:2, redgrille:1, blue24:1, yellowround:2, bluehole:2, redcurve:2, green26:1}},
    {name: 'helicopter', emoji: '🚁', parts: {windscreen:1, rotor:1, redround:1, smallscreen:1, clip:1, red28:1, yellowslope:1, whiteslope:2, bluehole:2, white12:1, blue22:1, green44:1, green26:1, yellow18:2}},
    {name: 'big boat', emoji: '🛳️', parts: {windscreen:1, propmount:1, wheel:2, propeller:1, redslope:1, whiteblack:1, green24:2, blue14:4, grayaxle:1, yellow22:2, red28:1}},
  ]},
  {id: '5', name: 'Set 5', color: '#2a2c2e', models: [
    {name: 'robot', emoji: '🤖', parts: {headlight:2, red24:2, yellowround:2, green24:1, green26:1, whiteblack:1, black22:1, blueslope:1, white12:1, redcurve:2, blue14:1, whiteslope:2}},
    {name: 'hovercraft', emoji: '🛸', parts: {windscreen:1, propmount:1, stick:1, rotor:1, red14:1, redgrille:1, green26:1, yellowslope:1, yellow22:1, green24:2, yellowhole:2, green44:1, blue14:1, black26:1, blue24:1}},
    {name: 'flying boat', emoji: '🛩️', parts: {windscreen:1, clip:1, propeller:1, greenround:1, redround:1, smallscreen:1, antenna:1, bluewedge:1, bluehole:2, blue14:2, yellow18:2, red14:1, red28:1, green24:1}},
    {name: 'car', emoji: '🏎️', parts: {windscreen:1, stick:1, wheel:4, grayaxle:2, bluehole:2, yellow22:2, red12:1, redslope:1, blue22:1, red28:1, green24:1}},
  ]},
];
{
  const pack = {id: 'original', name: 'Original Game', emoji: '🧱', sets: []};
  PACKS.push(pack);
  for (const s of ORIGINAL_SETS) {
    for (const m of s.models) m.tag = `set ${s.id}`;
    addSet(pack, {...s, colors: ['red', 'green', 'yellow', 'blue', 'white'], pickCount: 1});
  }
  // Sanity check: each set's four models together use the booklet's full inventory exactly once.
  for (const s of ORIGINAL_SETS) {
    const used = {};
    for (const m of s.models) for (const id in m.parts) used[id] = (used[id] || 0) + m.parts[id];
    for (const id in PIECES) if (PIECES[id].qty && (used[id] || 0) !== PIECES[id].qty) console.warn(`${s.name}: ${id} used ${used[id] || 0}, inventory ${PIECES[id].qty}`);
  }
}
