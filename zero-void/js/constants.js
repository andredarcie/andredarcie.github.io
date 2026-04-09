// ── Dimensões do canvas de jogo ───────────────────────────────
const W = 460, H = 700;
const MAX_LIVES = 4;

// ── Duração de cada wave ──────────────────────────────────────
const WAVE_DURATION = 1800; // frames (~30s a 60fps)
const INVASION_CHANCE = 0.55;

// ── Planetas (Mercúrio → Netuno) ──────────────────────────────
const PLANETS = [
  { name: 'MERCURY', r: 180, g: 172, b: 162, types: ['circle',  'tri']                     },
  { name: 'VENUS',   r: 235, g: 195, b:  80, types: ['pentagon','ring']                    },
  { name: 'EARTH',   r:  40, g: 120, b: 220, types: ['diamond', 'tri']                     },
  { name: 'MARS',    r: 210, g:  65, b:  30, types: ['cross',   'diamond']                 },
  { name: 'JUPITER', r: 210, g: 135, b:  70, types: ['hex',     'octagon']                 },
  { name: 'SATURN',  r: 215, g: 180, b:  85, types: ['ring',    'square', 'hex']           },
  { name: 'URANUS',  r:  90, g: 205, b: 212, types: ['octagon', 'square']                  },
  { name: 'NEPTUNE', r:  45, g:  85, b: 215, types: ['cross',   'hex', 'diamond', 'circle']},
];

// ── Bullet time ───────────────────────────────────────────────
const BT_DANGER_R = 100;
const BT_SAFE_R   = 145;

// ── State ─────────────────────────────────────────────────────
let state; // 'menu' | 'play' | 'dead' | 'escape' | 'transmission' | 'finale' | 'waveTransition'
let score, hiScore, lives, wave, combo, comboTimer;
let shakeAmt, shakeDur, flashAmt;
let bgPulse;
let deathTimer;
let spawnClock, spawnRate, obsClock, obsRate;
let lifeClock, lifeRate;
let waveAnnounceTimer, lastWaveAnnounced, waveTimer;
let escapeTimer;
let escapeStartedAt, escapeDurationMs;
let finaleScene;
let transitionEcho, waveTransition;

// ── Bullet time state ─────────────────────────────────────────
let timeScale;
let btActive;
let btThreat;
let btRingPhase;

// ── Layout (responsivo) ───────────────────────────────────────
let gx, gy, gs;
let touchX  = -1;
let touchHint = 90;

// ── Objetos do jogo ───────────────────────────────────────────
let player, bullets, enemies, obstacles, sparks, shrapnel;
let lifePods;
let ball;
let warpLines;
let transmissionIndex;
