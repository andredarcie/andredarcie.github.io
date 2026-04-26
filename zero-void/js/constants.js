// ── Canvas dimensions ─────────────────────────────────────────
const W = 460, H = 700;
const MAX_LIVES = 4;

// ── Wave duration ─────────────────────────────────────────────
const WAVE_DURATION = 1800; // frames (~30s at 60fps)
const INVASION_CHANCE = 0.55;

// ── Planets (Mercury → Neptune) ───────────────────────────────
//  patterns     : movement patterns available to enemies this wave
//  speedMult    : enemy base speed multiplier
//  groupMult    : scales how many enemies spawn per group
//  driftMult    : obstacle lateral drift multiplier
//  fallMult     : obstacle fall speed multiplier
//  obsSize      : [min, max] obstacle radius
//  lateralEntry : probability (0–1) of a spawn group entering from the sides
//  sineAmpMult  : sine/zigzag amplitude multiplier (Uranus)
//  pairBias     : favour paired spawns (Mars — two moons)
//  ringSpawn    : favour arc/ring formations (Saturn)
const PLANETS = [
  { name: 'MERCURY', r: 180, g: 172, b: 162, types: ['circle',  'tri'],
    patterns: ['straight', 'sine'],
    speedMult: 1.2,  groupMult: 0.7,  driftMult: 0.2,  fallMult: 1.25,
    obsSize: [7,  16], lateralEntry: 0 },

  { name: 'VENUS',   r: 235, g: 195, b:  80, types: ['pentagon','ring'],
    patterns: ['straight', 'zigzag'],
    speedMult: 0.72, groupMult: 1.5,  driftMult: 1.2,  fallMult: 0.6,
    obsSize: [18, 38], lateralEntry: 0.35 },

  { name: 'EARTH',   r:  40, g: 120, b: 220, types: ['diamond', 'tri'],
    patterns: ['straight', 'sine', 'zigzag', 'chase', 'bezier'],
    speedMult: 1.0,  groupMult: 1.0,  driftMult: 0.7,  fallMult: 1.0,
    obsSize: [13, 28], lateralEntry: 0 },

  { name: 'MARS',    r: 210, g:  65, b:  30, types: ['cross',   'diamond'],
    patterns: ['zigzag', 'zigzag', 'sine', 'straight'],
    speedMult: 1.0,  groupMult: 1.0,  driftMult: 2.8,  fallMult: 0.75,
    obsSize: [11, 24], lateralEntry: 0, pairBias: true },

  { name: 'JUPITER', r: 210, g: 135, b:  70, types: ['hex',     'octagon'],
    patterns: ['chase', 'chase', 'straight', 'sine'],
    speedMult: 1.0,  groupMult: 1.8,  driftMult: 0.35, fallMult: 1.55,
    obsSize: [20, 42], lateralEntry: 0 },

  { name: 'SATURN',  r: 215, g: 180, b:  85, types: ['ring',    'square', 'hex'],
    patterns: ['bezier', 'sine', 'straight'],
    speedMult: 0.9,  groupMult: 1.15, driftMult: 0.85, fallMult: 0.95,
    obsSize: [14, 30], lateralEntry: 0, ringSpawn: true },

  { name: 'URANUS',  r:  90, g: 205, b: 212, types: ['octagon', 'square'],
    patterns: ['sine', 'zigzag', 'straight'],
    speedMult: 1.05, groupMult: 1.1,  driftMult: 3.8,  fallMult: 0.8,
    obsSize: [12, 26], lateralEntry: 0.65, sineAmpMult: 2.4 },

  { name: 'NEPTUNE', r:  45, g:  85, b: 215, types: ['cross',   'hex', 'diamond', 'circle'],
    patterns: ['straight', 'sine', 'zigzag', 'chase', 'bezier'],
    speedMult: 1.3,  groupMult: 2.0,  driftMult: 3.0,  fallMult: 1.35,
    obsSize: [13, 32], lateralEntry: 0.28 },
];

// ── Bullet time ───────────────────────────────────────────────
const BT_DANGER_R = 100;
const BT_SAFE_R   = 145;

// ── Game mode ─────────────────────────────────────────────────
let gameMode = 'story'; // 'story' | 'arcade'
let arcadeHiScore = 0;

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

// ── Layout (responsive) ───────────────────────────────────────
let gx, gy, gs;
let touchX  = -1;
let touchHint = 90;

// ── Game objects ──────────────────────────────────────────────
let player, bullets, enemies, obstacles, sparks, shrapnel;
let lifePods;
let ball;
let warpLines;
let transmissionIndex;
