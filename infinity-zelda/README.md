# Infinity Zelda — an endless, procedurally generated Zelda

A tiny homage to the 1986 NES original that rebuilds Hyrule from scratch every
time you play. Vanilla JavaScript/Canvas, no dependencies, no build step — just
open `index.html` in a browser.

Press Enter and a black screen greets you with **"GENERATING YOUR ZELDA…"** — the
overworld, the caves and the three dungeons are all placed at random (with a
displayed seed). The objectives never change; only the map does. Finish a run and
you loop back to the title for the next one — the **RUN** counter climbs forever.

## How to play

| Key | Action |
|---|---|
| Arrows / WASD | Move |
| Z or Space | Sword (A) |
| X | Use B item (bombs / bow) |
| C | Switch B item |
| Enter | Start / pause / continue |
| M | Mute |

## The quest (same every run, in a different world every run)

- 8×4 screen overworld, always fully connected so nothing is ever unreachable
- Find the **sword** in a cave — its screen moves every run
- **Level 1**: keys & a locked boss door · **Bow** · boss **Aquamentus** → Triforce piece
- **Level 2**: **Blue Ring** · bombs from the old man · boss **Dodongo** ("Dodongo
  dislikes smoke" — sword won't work!) → Triforce piece
- **Level 9**: sealed until you hold **2 Triforce pieces** · **Ganon** → rescue Zelda
- Shop (bombs / key / life), a heart-container cave, and bombable "secret to
  everybody" money caves — all scattered randomly
- Each dungeon is generated as a spine from entry to boss with a single
  key-locked boss door and a reachable key, so every run is guaranteed solvable
- Later runs mix in tougher enemies

## Tech

- `js/sprites.js` — all pixel art as character grids, NES palette
- `js/data.js` — the fixed pieces generation reuses (caves, room templates, items)
- `js/generate.js` — seeded procedural generator for the overworld + dungeons
- `js/entities.js` — player, 8 enemy types, 3 bosses, projectiles
- `js/game.js` — state machine, screen scrolling, combat, HUD, run loop
- `js/audio.js` — WebAudio square/triangle/noise chiptune (music + ~20 sfx)
