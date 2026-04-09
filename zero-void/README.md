# Zero Void

A geometric space shooter built with [p5.js](https://p5js.org/). Pure black and white — no images, no sprites, everything drawn with shapes and lines.

Play it at: [andredarcie.github.io/zero-void](https://andredarcie.github.io/zero-void)

---

## Concept

Zero Void blends two genres: a vertical shoot-em-up and a Breakout-style ball deflection game. You pilot a ship that fires automatically while also keeping a bouncing ball in play. Each wave is themed after a planet in the solar system, introducing new enemy shapes and color palettes. Survive all eight waves to escape the solar system.

---

## Controls

| Input | Action |
|---|---|
| `←` / `→` or `A` / `D` | Move ship horizontally |
| Click / Tap | Start or restart the game |
| Drag | Move ship on touch screens |

The ship fires automatically — no shoot button needed.

---

## Rules

### Objective
Survive all 8 planetary waves and escape the solar system with the highest score possible.

### Lives
You start with **3 lives**. You lose a life when:
- An enemy collides with your ship
- An obstacle collides with your ship

After taking a hit you have a brief **invincibility window** (the ship blinks).

### Waves
Each wave lasts **~30 seconds** and is themed after a planet. When a wave ends, the next one begins automatically — enemies become faster and more varied as you progress.

| Wave | Planet | Enemy shapes |
|---|---|---|
| 1 | Mercury | Circle, Triangle |
| 2 | Venus | Pentagon, Ring |
| 3 | Earth | Diamond, Triangle |
| 4 | Mars | Cross, Diamond |
| 5 | Jupiter | Hexagon, Octagon |
| 6 | Saturn | Ring, Square, Hexagon |
| 7 | Uranus | Octagon, Square |
| 8 | Neptune | Cross, Hexagon, Diamond, Circle |

### Enemies
Enemies move in different patterns:

- **Straight** — fall directly downward
- **Sine** — side-to-side wave motion
- **Zigzag** — sharp lateral movement
- **Chase** — slowly track your horizontal position
- **Bezier** — sweep along a curved path

**Heavy enemies** (hexagons) have **3 HP**, move slower, and only appear from wave 2 onwards.

### Obstacles
Geometric shapes drift down the screen. They **cannot be destroyed** by bullets — only avoided. They wobble as they fall and deal damage on contact with the ship.

### The Ball
A bouncing ball is always in play, working like a Breakout paddle mechanic:

- The ball bounces off the **top and side walls**
- Your ship acts as the **paddle** — the angle of deflection depends on where on the ship the ball hits
- The ball **destroys enemies** on contact, dealing **2 damage**
- The ball **bounces off obstacles** without destroying them
- If the ball **falls off the bottom**, it respawns above your ship after ~3 seconds

### Scoring
Points are awarded for each enemy killed:

```
points = 10 × current_wave + combo_bonus
```

Building a **combo** (killing enemies in quick succession) adds `combo × 3` bonus points per kill.

Letting an enemy exit the bottom of the screen **resets your combo**.

### Bullet Time
When an enemy or obstacle gets close to your ship, the game enters **bullet time** — everything slows down to give you a moment to react. A dashed line points toward the threat and pulsing rings appear around your ship. The game returns to normal speed once the danger passes.

### Winning
Survive all 8 waves and your ship escapes the solar system. Your final score is shown on the escape screen before returning to the menu.

---

## Project Structure

```
zero-void/
├── index.html
├── style.css
└── js/
    ├── constants.js   # game dimensions, planet data, state variables
    ├── helpers.js     # utility functions (shake, poly, bezier, planet helpers)
    ├── particles.js   # sparks and shrapnel effects
    ├── player.js      # ship rendering, bullets, hit detection
    ├── enemies.js     # enemy spawning, movement patterns, rendering
    ├── obstacles.js   # obstacle spawning and movement
    ├── ball.js        # breakout ball physics and rendering
    ├── ui.js          # HUD, menus, screens, CRT effect, bullet time
    ├── input.js       # keyboard and touch input handlers
    └── main.js        # p5.js lifecycle (setup, initGame, draw loop)
```

---

## Tech

- **[p5.js](https://p5js.org/) 1.9.4** — rendering and game loop
- No build tools, no dependencies beyond p5.js
- Runs entirely in the browser
