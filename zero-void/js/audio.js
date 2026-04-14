// ═══════════════════════════════════════════════════════════════
//  AUDIO — procedural retro sounds via Web Audio API
// ═══════════════════════════════════════════════════════════════

let _ac = null;

function _getAC() {
  if (!_ac) _ac = new (window.AudioContext || window.webkitAudioContext)();
  return _ac;
}

// Resume context on first user interaction (browser autoplay policy)
function audioUnlock() {
  let ac = _getAC();
  if (ac.state === 'suspended') ac.resume();
}

// ── Core helpers ──────────────────────────────────────────────

function _osc(type, freq, startTime, duration, gainPeak, ac) {
  let g = ac.createGain();
  g.connect(ac.destination);
  g.gain.setValueAtTime(0, startTime);
  g.gain.linearRampToValueAtTime(gainPeak, startTime + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  let o = ac.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, startTime);
  o.connect(g);
  o.start(startTime);
  o.stop(startTime + duration + 0.01);
}

function _oscSweep(type, freqStart, freqEnd, startTime, duration, gainPeak, ac) {
  let g = ac.createGain();
  g.connect(ac.destination);
  g.gain.setValueAtTime(gainPeak, startTime);
  g.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  let o = ac.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freqStart, startTime);
  o.frequency.exponentialRampToValueAtTime(freqEnd, startTime + duration);
  o.connect(g);
  o.start(startTime);
  o.stop(startTime + duration + 0.01);
}

function _noise(startTime, duration, gainPeak, ac) {
  let bufSize = ac.sampleRate * duration;
  let buf = ac.createBuffer(1, bufSize, ac.sampleRate);
  let data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

  let g = ac.createGain();
  g.connect(ac.destination);
  g.gain.setValueAtTime(gainPeak, startTime);
  g.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  let src = ac.createBufferSource();
  src.buffer = buf;
  src.connect(g);
  src.start(startTime);
  src.stop(startTime + duration + 0.01);
}

// ── Sound effects ─────────────────────────────────────────────

// ── Sound effects ─────────────────────────────────────────────

let _lastShootTime = 0;
function sndShoot() {
  try {
    let ac = _getAC();
    let t = ac.currentTime;
    if (t - _lastShootTime < 0.09) return; // throttle to avoid saturation
    _lastShootTime = t;
    _oscSweep('square', 880, 220, t, 0.08, 0.06, ac);
  } catch(e) {}
}

function sndEnemyKill() {
  try {
    let ac = _getAC();
    let t = ac.currentTime;
    _noise(t, 0.07, 0.18, ac);
    _oscSweep('square', 440, 110, t, 0.09, 0.09, ac);
  } catch(e) {}
}

function sndObstacleHit() {
  try {
    let ac = _getAC();
    let t = ac.currentTime;
    _oscSweep('sawtooth', 280, 140, t, 0.10, 0.11, ac);
    _noise(t, 0.05, 0.08, ac);
  } catch(e) {}
}

function sndPlayerHit() {
  try {
    let ac = _getAC();
    let t = ac.currentTime;
    _oscSweep('sawtooth', 200, 60, t, 0.28, 0.22, ac);
    _noise(t, 0.14, 0.12, ac);
  } catch(e) {}
}

function sndBallBounceWall() {
  try {
    let ac = _getAC();
    let t = ac.currentTime;
    _oscSweep('square', 320, 260, t, 0.06, 0.10, ac);
  } catch(e) {}
}

function sndBallDeflect() {
  try {
    let ac = _getAC();
    let t = ac.currentTime;
    _oscSweep('square', 520, 420, t, 0.07, 0.13, ac);
  } catch(e) {}
}

function sndBallLost() {
  try {
    let ac = _getAC();
    let t = ac.currentTime;
    _oscSweep('sawtooth', 300, 80, t, 0.22, 0.15, ac);
  } catch(e) {}
}

function sndWaveUp() {
  try {
    let ac = _getAC();
    let t = ac.currentTime;
    let notes = [330, 440, 550, 660];
    notes.forEach((freq, i) => {
      _osc('square', freq, t + i * 0.07, 0.12, 0.10, ac);
    });
  } catch(e) {}
}

function sndLifePickup() {
  try {
    let ac = _getAC();
    let t = ac.currentTime;
    _osc('sine', 660,  t,        0.10, 0.18, ac);
    _osc('sine', 880,  t + 0.08, 0.12, 0.15, ac);
    _osc('sine', 1100, t + 0.16, 0.14, 0.12, ac);
  } catch(e) {}
}

function sndGameOver() {
  try {
    let ac = _getAC();
    let t = ac.currentTime;
    _oscSweep('sawtooth', 440, 55, t, 0.90, 0.20, ac);
    _noise(t, 0.18, 0.08, ac);
  } catch(e) {}
}

// Combo milestone (every 5 hits)
function sndCombo() {
  try {
    let ac = _getAC();
    let t = ac.currentTime;
    _osc('square', 660, t,        0.07, 0.13, ac);
    _osc('square', 880, t + 0.06, 0.07, 0.11, ac);
  } catch(e) {}
}

// Bullet time activation — low drone entering slow-mo
let _btWasActive = false;
function sndBulletTimeCheck(active) {
  try {
    if (active && !_btWasActive) {
      let ac = _getAC();
      let t = ac.currentTime;
      _oscSweep('sine', 180, 90, t, 0.35, 0.08, ac);
    }
    _btWasActive = active;
  } catch(e) {}
}

// Transmission incoming alert — two short beeps
function sndTransmissionIncoming() {
  try {
    let ac = _getAC();
    let t = ac.currentTime;
    _osc('square', 1200, t,        0.06, 0.12, ac);
    _osc('square', 1200, t + 0.14, 0.06, 0.12, ac);
    _osc('square', 1600, t + 0.28, 0.07, 0.14, ac);
  } catch(e) {}
}

// Typewriter tick — one character appearing
let _lastTickTime = 0;
function sndTypewriterTick() {
  try {
    let ac = _getAC();
    let t = ac.currentTime;
    if (t - _lastTickTime < 0.04) return;
    _lastTickTime = t;
    _oscSweep('square', 900, 700, t, 0.03, 0.025, ac);
  } catch(e) {}
}

// Dialogue line complete — soft chime cue
function sndDialogueReady() {
  try {
    let ac = _getAC();
    let t = ac.currentTime;
    _osc('sine', 440, t,        0.09, 0.07, ac);
    _osc('sine', 550, t + 0.07, 0.09, 0.05, ac);
  } catch(e) {}
}

// ── Menu ambient ──────────────────────────────────────────────

let _menuPadNodes  = null;
let _menuNoteFrame = 0;
const _MENU_NOTE_SEQ = [440, 550, 495, 660, 550, 440, 495, 330];

function sndMenuAmbientStart() {
  if (_menuPadNodes) return;
  try {
    let ac = _getAC();
    let doStart = () => {
      if (_menuPadNodes) return; // guard against double-start if called twice
      try {
        let t = ac.currentTime;
        let osc1 = ac.createOscillator();
        let osc2 = ac.createOscillator();
        let g    = ac.createGain();
        osc1.type = 'sine'; osc1.frequency.value = 220;
        osc2.type = 'sine'; osc2.frequency.value = 221.8;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.045, t + 0.3);
        osc1.connect(g); osc2.connect(g); g.connect(ac.destination);
        osc1.start(t); osc2.start(t);
        _menuPadNodes  = { osc1, osc2, g };
        _menuNoteFrame = 0;
      } catch(e) {}
    };
    // ac.resume() is async on iOS — use .then() so we start only after context is running
    if (ac.state === 'running') {
      doStart();
    } else {
      ac.resume().then(doStart).catch(() => {});
    }
  } catch(e) {}
}

function sndMenuAmbientStop() {
  if (!_menuPadNodes) return;
  try {
    let ac = _getAC();
    let t  = ac.currentTime;
    _menuPadNodes.g.gain.cancelScheduledValues(t);
    _menuPadNodes.g.gain.setValueAtTime(_menuPadNodes.g.gain.value, t);
    _menuPadNodes.g.gain.linearRampToValueAtTime(0.0001, t + 0.6);
    _menuPadNodes.osc1.stop(t + 0.7);
    _menuPadNodes.osc2.stop(t + 0.7);
  } catch(e) {}
  _menuPadNodes = null;
}

// Called every frame from menuFrame — fires a gentle note every ~3s (180 frames)
function sndMenuAmbientTick() {
  if (!_menuPadNodes) return;
  _menuNoteFrame++;
  if (_menuNoteFrame % 185 !== 0) return;
  try {
    let ac   = _getAC();
    let t    = ac.currentTime;
    let freq = _MENU_NOTE_SEQ[(_menuNoteFrame / 185 - 1) % _MENU_NOTE_SEQ.length];
    _osc('sine', freq,       t,        0.55, 0.038, ac);
    _osc('sine', freq * 2.0, t + 0.04, 0.35, 0.018, ac); // soft octave
  } catch(e) {}
}

// Menu button click — soft confirm tick
function sndMenuClick() {
  try {
    let ac = _getAC();
    let t = ac.currentTime;
    _osc('square', 660, t,        0.06, 0.10, ac);
    _osc('square', 880, t + 0.05, 0.05, 0.08, ac);
  } catch(e) {}
}

// Enemy hit but not killed (heavy enemy) — metallic clank
function sndEnemyHit() {
  try {
    let ac = _getAC();
    let t = ac.currentTime;
    _oscSweep('square', 360, 280, t, 0.07, 0.09, ac);
  } catch(e) {}
}

// Ball hits enemy — hard impact bounce
function sndBallHitEnemy() {
  try {
    let ac = _getAC();
    let t = ac.currentTime;
    _oscSweep('square', 600, 300, t, 0.08, 0.14, ac);
    _noise(t, 0.04, 0.09, ac);
  } catch(e) {}
}

// Ball hits obstacle — lower thud bounce
function sndBallHitObstacle() {
  try {
    let ac = _getAC();
    let t = ac.currentTime;
    _oscSweep('square', 400, 240, t, 0.07, 0.11, ac);
  } catch(e) {}
}

// Ball respawn — chime reappearing
function sndBallRespawn() {
  try {
    let ac = _getAC();
    let t = ac.currentTime;
    _oscSweep('sine', 220, 660, t, 0.16, 0.12, ac);
    _osc('sine', 880, t + 0.12, 0.10, 0.09, ac);
  } catch(e) {}
}

// Wave transition to event (invasion/transmission) — whoosh sweep
function sndWaveTransition() {
  try {
    let ac = _getAC();
    let t = ac.currentTime;
    _oscSweep('sawtooth', 600, 60, t, 0.55, 0.12, ac);
  } catch(e) {}
}

// Finale ambient — audible across the full ~12s animation
function sndFinaleAmbient() {
  try {
    let ac = _getAC();
    let t = ac.currentTime;

    // Pad: two detuned sawtooths fading in then out over 11s
    let pad1 = ac.createOscillator();
    let pad2 = ac.createOscillator();
    let padG  = ac.createGain();
    pad1.type = 'sawtooth'; pad1.frequency.setValueAtTime(220, t);
    pad1.frequency.linearRampToValueAtTime(260, t + 11);
    pad2.type = 'sawtooth'; pad2.frequency.setValueAtTime(223, t);
    pad2.frequency.linearRampToValueAtTime(264, t + 11);
    padG.gain.setValueAtTime(0.0001, t);
    padG.gain.linearRampToValueAtTime(0.08, t + 2.0);
    padG.gain.linearRampToValueAtTime(0.08, t + 9.0);
    padG.gain.linearRampToValueAtTime(0.0001, t + 11.5);
    pad1.connect(padG); pad2.connect(padG); padG.connect(ac.destination);
    pad1.start(t); pad1.stop(t + 12);
    pad2.start(t); pad2.stop(t + 12);

    // Pulse notes — ascending sequence spread over the animation
    let pulseNotes = [330, 440, 550, 440, 660, 550, 770, 660];
    pulseNotes.forEach((freq, i) => {
      _osc('square', freq, t + 1.2 + i * 1.1, 0.6, 0.06, ac);
    });

    // Rising climax near the end
    _oscSweep('sine', 330, 880, t + 9.5, 1.8, 0.12, ac);
    _osc('square', 880, t + 10.5, 0.8, 0.10, ac);
  } catch(e) {}
}

// Escape — engine hum rising as ship flies away
function sndEscape() {
  try {
    let ac = _getAC();
    let t = ac.currentTime;
    _oscSweep('sawtooth', 80,  200, t, 4.5, 0.09, ac);
    _oscSweep('sawtooth', 85,  210, t, 4.5, 0.06, ac);
    _oscSweep('sine',     160, 440, t + 2.0, 2.5, 0.08, ac);
  } catch(e) {}
}

// Transmission dialogue box opening
function sndTransmissionOpen() {
  try {
    let ac = _getAC();
    let t = ac.currentTime;
    _oscSweep('sine', 220, 440, t, 0.18, 0.10, ac);
  } catch(e) {}
}

// ── Invasion sounds ───────────────────────────────────────────

// Invasion gameplay starts — low impact thud + rising tone
function sndInvasionStart() {
  try {
    let ac = _getAC();
    let t = ac.currentTime;
    _noise(t, 0.12, 0.22, ac);
    _oscSweep('sawtooth', 80, 220, t, 0.30, 0.18, ac);
    _osc('square', 440, t + 0.18, 0.10, 0.12, ac);
  } catch(e) {}
}

// "SHIP INVADED" alarm — harsh repeating pulse
function sndInvasionAlarm() {
  try {
    let ac = _getAC();
    let t = ac.currentTime;
    for (let i = 0; i < 3; i++) {
      _oscSweep('sawtooth', 440, 380, t + i * 0.18, 0.12, 0.18, ac);
      _noise(t + i * 0.18, 0.05, 0.06, ac);
    }
  } catch(e) {}
}

// Astronaut footstep — soft click per cell
let _lastStepTime = 0;
function sndAstStep() {
  try {
    let ac = _getAC();
    let t = ac.currentTime;
    if (t - _lastStepTime < 0.08) return;
    _lastStepTime = t;
    _oscSweep('square', 260, 200, t, 0.05, 0.055, ac);
  } catch(e) {}
}

// Dot eaten — short high blip (alternating pitch)
let _dotPitch = true;
function sndDotEat() {
  try {
    let ac = _getAC();
    let t = ac.currentTime;
    _osc('square', _dotPitch ? 700 : 900, t, 0.04, 0.07, ac);
    _dotPitch = !_dotPitch;
  } catch(e) {}
}

// Power pellet — energized burst
function sndPelletEat() {
  try {
    let ac = _getAC();
    let t = ac.currentTime;
    _oscSweep('square', 300, 900, t, 0.14, 0.18, ac);
    _osc('square', 1100, t + 0.10, 0.08, 0.12, ac);
  } catch(e) {}
}

// Frightened mode activated — wobbly descending tone
function sndFrightened() {
  try {
    let ac = _getAC();
    let t = ac.currentTime;
    _oscSweep('sawtooth', 600, 120, t, 0.38, 0.14, ac);
  } catch(e) {}
}

// Frightened ending warning — rapid warning beeps
function sndFrightenedWarning() {
  try {
    let ac = _getAC();
    let t = ac.currentTime;
    for (let i = 0; i < 4; i++) {
      _osc('square', 880, t + i * 0.09, 0.05, 0.08, ac);
    }
  } catch(e) {}
}

// Alien killed while frightened — retro zap
function sndAlienKill() {
  try {
    let ac = _getAC();
    let t = ac.currentTime;
    _oscSweep('square', 1200, 200, t, 0.14, 0.16, ac);
    _noise(t, 0.06, 0.10, ac);
  } catch(e) {}
}

// Astronaut hit by alien — heavy thud
function sndAstHit() {
  try {
    let ac = _getAC();
    let t = ac.currentTime;
    _oscSweep('sawtooth', 180, 55, t, 0.24, 0.20, ac);
    _noise(t, 0.10, 0.14, ac);
  } catch(e) {}
}

// Invasion repelled — rising victory sequence
function sndInvasionWin() {
  try {
    let ac = _getAC();
    let t = ac.currentTime;
    let notes = [330, 440, 550, 660, 880];
    notes.forEach((freq, i) => {
      _osc('square', freq, t + i * 0.08, 0.14, 0.12, ac);
    });
  } catch(e) {}
}

// Invasion failed — descending droop
function sndInvasionFail() {
  try {
    let ac = _getAC();
    let t = ac.currentTime;
    _oscSweep('sawtooth', 440, 110, t, 0.55, 0.18, ac);
    _oscSweep('sawtooth', 330, 82,  t + 0.10, 0.45, 0.12, ac);
  } catch(e) {}
}
