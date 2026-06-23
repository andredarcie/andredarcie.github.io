# HILLS

A **first-person** horror game with a **PSX** (32-bit) aesthetic — a homage to _Silent Hill_.
It runs entirely in the browser, with no build step and no installed dependencies: it uses
[Three.js](https://threejs.org/) loaded straight from a CDN (unpkg) via an `importmap`.

The goal is to cross the foggy town, find the keys and escape through the gate to the north —
running from whatever moves in the fog. No HUD, no combat. Just run.

## Running locally

The game uses **ES modules** (`import`) and loads local `.js` files, so you **can't just
double-click `index.html`** (the `file://` protocol blocks the modules due to CORS). You need
to serve the folder over HTTP. Pick **one** of the options below and run it from the `hills/`
folder:

### Option 1 — Node (npx, nothing to install)

```bash
npx serve
```

Open the URL printed in the terminal (usually `http://localhost:3000`).

### Option 2 — Python (ships with Windows/macOS/Linux)

```bash
python -m http.server 8000
```

Open `http://localhost:8000`.

### Option 3 — VS Code

Install the **Live Server** extension, right-click `index.html` and choose
**"Open with Live Server"**.

> **Important:** run the server from inside the `hills/` folder (where `index.html` lives),
> not from the repository root.

## Controls

### Keyboard + mouse

| Action                  | Key / button           |
| ----------------------- | ---------------------- |
| Move                    | `W` `A` `S` `D`        |
| Look                    | Mouse                  |
| Flashlight (toggle)     | `F`                    |
| Interact (gate)         | `E` or left click      |
| Pause                   | `Esc` (releases pointer lock) |
| Restart (death/victory) | `R`                    |

The mouse only controls the camera after you click **"start torture"** (the game locks the
pointer). Pressing `Esc` pauses.

### Touch (phone/tablet)

Touch controls appear automatically: the **left** stick to move, the **right** stick to turn
the camera, plus on-screen buttons for the flashlight and interaction.

## Structure

```
hills/
├── index.html      # entry point: importmap (cache-busting) + UI screens
├── main.js         # builds the scene, wires everything up and runs the main loop
├── boot.js         # "32-bit console boot" intro + title menu
├── world.js        # foggy town (streets, buildings, cars, gates, keys)
├── interior.js     # inner restroom (separate scene / safe room)
├── player.js       # player movement, camera and collision
├── entities.js     # monsters (AI, chasing)
├── audio.js        # procedural audio (footsteps, static, heartbeat, siren)
├── psx.js          # PSX render pipeline (vertex snap, grain, dithering, tint)
├── touch.js        # touch controls for mobile
├── models/         # 3D models (.glb) — see CREDITS.md
└── CREDITS.md      # credits for third-party assets
```

## Cache-busting convention (for contributors)

Cache-busting is handled centrally in the **import map** inside `index.html`: each local module
is mapped to its URL with `?v=N`. The `.js` files use imports **without** a query string.

On every change to any `.js`:

1. In `index.html`, replace **all** occurrences of `?v=N` with the new number (replace all).
2. Update the **"BUILD N"** badge to the **same** number.

> GitHub Pages caches for ~10 min. Check the BUILD number on the title screen before reporting
> that something "doesn't work".

## Credits

Third-party 3D models (Quaternius, via poly.pizza) are documented in
[`CREDITS.md`](./CREDITS.md). Game code and art by **André N. Darcie**.
