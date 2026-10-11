# Creator: The Race to Build It (digital)

**▶ Play it now: https://cmjarrett.github.io/DIgitalLegoCreatorBG/**

A fan-made digital version of the 1999 board game **LEGO Creator: The Race to Build It**
([BoardGameGeek](https://boardgamegeek.com/boardgame/7400/lego-creator)), plus themed packs built from real small LEGO sets.

Roll the die, move around the board, collect bricks from the Brickyard, and be the first to finish your model.
2–4 players, any mix of people and computer players, on one screen.

## Playing

Open `index.html` in a browser. It needs an internet connection for the pictures of models and special pieces
(they load from BrickLink); without one the game still works but shows plain tiles instead.

To run it from a local web server instead (handy while editing):

```bash
python -m http.server 8123
```

then open <http://localhost:8123>. It can also be hosted as-is on GitHub Pages.

## Packs

| Pack | Card sets |
|---|---|
| 🧱 Original Game | The 20 model cards from the 1999 game (Sets 1–5) |
| 🦖 Dinosaurs | Brick Dinos, Little Dinos, Raptor Rescue |
| 🚀 Space | Classic Space (1979–84), Space Port (1999), City Astronauts, Shuttles & UFOs |
| 🌴 Jungle | Jungle Animals, Jungle Explorers, Tiny Jungle |
| 🏎️ Cars | Tiny Turbos, Classic Racers, Rescue & Work, Drome Racers |
| ✈️ Sky | Motion Flyers (1989), Fly High |
| 🐳 Ocean | Sea Creatures, Under the Sea |
| 🐾 Animals | Animal Friends (1987), Japan Animals, Garden Critters, Woodland |
| 🎄 Holidays | Holiday Friends (Advent 2003), Winter Fun, Spooky |
| 🚗 Classic Vehicles | Creator Polybags (2001), Kellogg's Promo (1998), Basic Vehicles (1999), Building Sets A–D (1986), Space & Rescue, Robot & Racers |

Each card set is 4 models. The Brickyard holds exactly the pieces those 4 models need, so (like the original)
every piece belongs to somebody's card. For the themed packs:

- The board's five "Pick (color) Brick" spaces use the set's most common brick colors.
- Plain bricks, plates, tiles and slopes are drawn by the game; anything else (wheels, printed parts,
  see-through parts, minifigures) is a **special piece** shown with its BrickLink picture.
- Sets with big models (30+ pieces) give out 2× pieces on Pick spaces so games stay about the same length.

## Adding a pack

Packs are made from BrickLink set inventories with [`tools/bricklink-pack-builder.js`](tools/bricklink-pack-builder.js).
BrickLink blocks scripted downloads, so the builder runs in your browser's developer console on bricklink.com;
the instructions are at the top of the file. Save the result in `packs/` and add a `<script>` line for it in `index.html`.

Small sets of about 10–45 pieces work best: Creator polybags, promotional sets, Advent calendar days, and
LEGO Store "Monthly Mini Model" builds are good places to look.

## Files

```
index.html            page markup and script list
css/style.css         styles
js/colors.js          color table (with BrickLink color ids)
js/art.js             drawing pieces, board icons and the die
js/packs.js           pack/card-set registry and BrickLink part handling
js/original.js        the original game's pieces and 20 model cards
js/game.js            board, turns, rules, computer players, setup screen
packs/*.js            themed packs (generated)
tools/                pack builder
```

## Credits

Fan project for family play; not affiliated with or endorsed by the LEGO Group or Rose Art.
LEGO® is a trademark of the LEGO Group. Set inventories and part/set pictures come from
[BrickLink](https://www.bricklink.com/).
