# Creator: The Race to Build It (digital)

**▶ Play it now: https://cmjarrett.github.io/DIgitalLegoCreatorBG/**

A fan-made digital version of the 1999 board game **LEGO Creator: The Race to Build It**
([BoardGameGeek](https://boardgamegeek.com/boardgame/7400/lego-creator)), plus themed packs of real LEGO
models that you build in 3D, piece by piece.

Roll the die, move around the board, collect bricks from the Brickyard, and be the first to finish your model.
2–4 players, any mix of people and computer players, on one screen.

## Building in 3D

In the themed packs, every player's card shows their model in 3D as a see-through "ghost".

- Pieces you collect wait in the tray under your model. **Tap one any time, even on someone else's turn**, and it
  drops into place. Point at a piece to see where it goes.
- Drag the model to spin it; scroll or pinch to zoom.
- The first player to **finish building** wins, so build as you go! Computer players build too.
- If someone takes a piece you've already built and you have no spare, it comes right off your model.

## Packs

| Pack | Card sets |
|---|---|
| 🧱 Original Game | The 20 model cards from the 1999 game (Sets 1–5) |
| 🚀 Space | Classic Space I & II, Futuron & Blacktron, Space Police & M:Tron, Ice Planet & Spyrius, Robots |
| ⭐ Star Wars Minis | Mini Starfighters, Mini Fleet |
| 🦖 Dinosaurs & Creatures | Dinosaurs, Creepy Crawlies |
| 🌴 Jungle & Safari | Safari, Jungle Adventurers |
| 🏎️ Cars | Tiny Turbos I & II, Drome Racers, Ferrari, Classic Racers |
| 🚒 Town & Rescue | Town Heroes (1978), Town Helpers (1981), Construction, City (2005–08) |
| ⛵ Boats & Planes | Speedboats, Water Racers, Up in the Sky, Creator 2001 |
| 🏰 Knights & Pirates | Knights, Pirates & Wild West |
| 🎃 Animals & Halloween | Fabuland Friends, Halloween |

Each card set is 4 official LEGO models. The Brickyard holds exactly the pieces those 4 models need, so (like the
original) every piece belongs to somebody's card. The board's five "Pick (color) Brick" spaces use the set's most
common brick colors, and sets with big models give out 2× pieces on Pick spaces so games stay about the same length.
Minifigures count as one piece.

## Running it locally

The 3D models are loaded with `fetch`, so the game needs to be served over http (opening `index.html` straight
from disk only works for the original game):

```bash
python tools/serve.py
```

then open <http://localhost:8123>. It needs an internet connection the first time to load three.js from a CDN.

## Making packs

Packs are built from the [LDraw Official Model Repository](https://library.ldraw.org/omr) (OMR) with
[`tools/ldraw-pack.mjs`](tools/ldraw-pack.mjs), using the card sets listed in
[`tools/packs.config.json`](tools/packs.config.json):

1. Download and unzip the LDraw parts library: <https://library.ldraw.org/library/updates/complete.zip>.
2. Download each model you want from `https://library.ldraw.org/library/omr/<set>.mpd` into one folder.
3. Add the card sets (4 models each) to `tools/packs.config.json` and run

   ```bash
   node tools/ldraw-pack.mjs path/to/ldraw path/to/omr-folder
   ```

   This writes `models/<set>.mpd` (each model with all its parts packed into one file), `packs/<pack>.js`
   and `ldraw/LDConfig.ldr`. Add a `<script>` line for any new pack file in `index.html`.

Small models of about 10–50 pieces play best.

## Files

```
index.html             page markup and script list
css/style.css          styles
js/colors.js           color table for the original game
js/art.js              drawing the original pieces, board icons and the die
js/packs.js            pack and card-set registry
js/original.js         the original game's pieces and 20 model cards
js/game.js             board, turns, rules, building, computer players, setup screen
js/build3d.js          3D models, piece pictures and build views (three.js)
packs/*.js             themed packs (generated)
models/*.mpd           packed 3D models (generated)
ldraw/LDConfig.ldr     LDraw color definitions
tools/                 pack builder and local test server
```

## Credits

Fan project for family play; not affiliated with or endorsed by the LEGO Group or Rose Art.
LEGO® is a trademark of the LEGO Group.

3D models come from the [LDraw](https://www.ldraw.org/) Official Model Repository and parts library, made by
the LDraw community and redistributed under their license (CCAL 2.0 / CC BY 4.0); each model and part file
lists its authors. 3D rendering by [three.js](https://threejs.org/). Set pictures in the setup screen come from
[BrickLink](https://www.bricklink.com/).
