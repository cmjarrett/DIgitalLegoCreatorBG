/* ================= Colors =================
 * Each color has a short key used throughout the game. The BrickLink color id lets packs built from
 * BrickLink inventories map their parts onto these colors. Transparent and metallic colors are left out
 * on purpose: those parts become "special pieces" shown with their BrickLink picture.
 */
// [key, name, hex, BrickLink color id]
const COLOR_TABLE = [
  ['white', 'White', '#f4f4f4', 1], ['yellow', 'Yellow', '#f2cd37', 3], ['orange', 'Orange', '#fe8a18', 4],
  ['red', 'Red', '#c91a09', 5], ['green', 'Green', '#237841', 6], ['blue', 'Blue', '#0055bf', 7],
  ['brown', 'Brown', '#583927', 8], ['lgray', 'Light Gray', '#9ba19d', 9], ['dgray', 'Dark Gray', '#6d6e5c', 10],
  ['black', 'Black', '#2a2c2e', 11], ['tan', 'Tan', '#e4cd9e', 2], ['pink', 'Pink', '#fc97ac', 23],
  ['purple', 'Purple', '#81007b', 24], ['lyellow', 'Light Yellow', '#fbe696', 33], ['lime', 'Lime', '#bbe90b', 34],
  ['bgreen', 'Bright Green', '#4b9f4a', 36], ['mgreen', 'Medium Green', '#73dca1', 37], ['dturq', 'Dark Turquoise', '#008f9b', 39],
  ['mblue', 'Medium Blue', '#5a93db', 42], ['dpink', 'Dark Pink', '#c870a0', 47], ['sgreen', 'Sand Green', '#a0bcac', 48],
  ['vlgray', 'Very Light Gray', '#e6e3da', 49], ['sblue', 'Sand Blue', '#6074a1', 55], ['sred', 'Sand Red', '#d67572', 58],
  ['dred', 'Dark Red', '#720e0f', 59], ['lblue', 'Light Blue', '#b4d2e3', 62], ['dblue', 'Dark Blue', '#0a3463', 63],
  ['dorange', 'Dark Orange', '#a95500', 68], ['dtan', 'Dark Tan', '#958a73', 69], ['magenta', 'Magenta', '#923978', 71],
  ['mlime', 'Medium Lime', '#c7d23c', 76], ['dgreen', 'Dark Green', '#184632', 80], ['dbgray', 'Dark Bluish Gray', '#6c6e68', 85],
  ['lbgray', 'Light Bluish Gray', '#a0a5a9', 86], ['skyblue', 'Sky Blue', '#7dbfdd', 87], ['rbrown', 'Reddish Brown', '#582a12', 88],
  ['dpurple', 'Dark Purple', '#3f3691', 89], ['lnougat', 'Light Nougat', '#f6d7b3', 90], ['blyellow', 'Bright Light Yellow', '#fff03a', 103],
  ['bpink', 'Bright Pink', '#e4adc8', 104], ['blblue', 'Bright Light Blue', '#9fc3e9', 105], ['blorange', 'Bright Light Orange', '#f8bb3d', 110],
  ['dbrown', 'Dark Brown', '#352100', 120], ['mnougat', 'Medium Nougat', '#aa7d55', 150], ['laqua', 'Light Aqua', '#adc3c0', 152],
  ['dazure', 'Dark Azure', '#078bc9', 153], ['olive', 'Olive Green', '#9b9a5a', 155], ['mazure', 'Medium Azure', '#36aebf', 156],
  ['mlavender', 'Medium Lavender', '#ac78ba', 157], ['rorange', 'Reddish Orange', '#ca4c0b', 167], ['nougat', 'Nougat', '#d09168', 28],
  ['gray', 'Gray', '#a0a5a9'], // the original game's wheel holders
];
const COL = {}, DK = {}, COLOR_NAME = {}, BL_COLORS = {};
const darken = (hex, f = .55) => '#' + [1, 3, 5].map(i => Math.round(parseInt(hex.slice(i, i + 2), 16) * f).toString(16).padStart(2, '0')).join('');
for (const [key, name, hex, blId] of COLOR_TABLE) {
  COL[key] = hex;
  DK[key] = key === 'white' ? '#8e928e' : darken(hex);
  COLOR_NAME[key] = name;
  if (blId) BL_COLORS[blId] = key;
}
