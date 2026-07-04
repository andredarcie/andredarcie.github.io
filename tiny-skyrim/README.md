# Tiny Skyrim

A tiny open-world 3D fantasy adventure that runs in the browser. First-person,
procedurally generated Nordic landscape, a village, a word wall, wolves, draugr
and one very angry dragon.

**Play:** open `index.html` on any static host (GitHub Pages).

## The quest

1. Speak with Elder Yngvar in Whitewind.
2. Trek north-east into the mountains and learn the Word of Power at the Old Wall
   (the draugr disagree).
3. Shout Korvaldr the Black out of the sky and slay him.
4. Absorb his soul. You are Dragonborn. Keep exploring if you like.

## Features

- Procedural terrain (deterministic noise), lakes, forests, snowline, border mountains
- Day/night cycle with sun, moon, stars, dusk colors and fog
- Sword combat, fireball spell, unlockable shout (VUS RO DAH) with knockback
- Wolves, draugr guardians and a dragon boss with fly/land/breath AI and a soul-absorb finale
- XP levels, gold, lootable chests (one hides an Ancient Blade)
- Skyrim-style HUD: compass with quest marker, fading stat bars, boss bar
- Procedural WebAudio soundtrack (drone + melody + wind) and all SFX synthesized
- Desktop (pointer lock, WASD) and mobile (virtual joystick + buttons)

## Tech

- Three.js (pinned via CDN in the import map), vanilla ES modules, no build step
- Cache-busting: every local module is mapped in the `index.html` import map with
  `?v=N`. On any `.js` change, replace ALL `?v=N` occurrences with the new number
  and update the `BUILD N` badge on the title screen to the same number.
- JS modules import each other by bare specifier (`import ... from 'world'`),
  never with a query string.
