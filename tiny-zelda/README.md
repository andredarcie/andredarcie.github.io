# Tiny Zelda — The Legend of Zelda (NES) demake

A complete, tiny homage to the 1986 NES original, in vanilla JavaScript/Canvas.
No dependencies, no build step — just open `index.html` in a browser.

## How to play

| Key | Action |
|---|---|
| Arrows / WASD | Move |
| Z or Space | Sword (A) |
| X | Use B item (bombs / bow) |
| C | Switch B item |
| Enter | Start / pause / continue |
| M | Mute |

## The quest

- 8×4 screen overworld: fields, forest, lake, river, Death Mountain
- Get the **sword** from the old man in the cave on the start screen
- **Level 1** (lake island): stalfos, keese, zols · keys & locked doors · **Bow** · boss **Aquamentus** → Triforce piece
- **Level 2** (Death Mountain east): **Blue Ring** · boss **Dodongo** — "Dodongo dislikes smoke" (sword won't work!) → Triforce piece
- **Level 9** (Death Mountain west): sealed until you hold **2 Triforce pieces** · **Ganon** → rescue Zelda
- Shop (southeast coast): bombs 20 · key 15 · life 10 rupees
- Secrets: bomb suspicious rocks ("it's a secret to everybody"), hidden heart container cave
- Sword beam at full health · arrows cost 1 rupee each · bosses drop heart containers

## Tech

- `js/sprites.js` — all pixel art as character grids, NES palette
- `js/data.js` — overworld screens, caves, dungeon layouts as text maps
- `js/entities.js` — player, 8 enemy types, 3 bosses, projectiles
- `js/game.js` — state machine, screen scrolling, combat, HUD
- `js/audio.js` — WebAudio square/triangle/noise chiptune (music + ~20 sfx)
