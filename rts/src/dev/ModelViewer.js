import * as THREE from 'three';
import { CharacterModel } from '../render/CharacterModel.js';
import { SertaoBuildingModel } from '../render/SertaoBuildingModel.js';
import { TowerRenderer } from '../render/TowerRenderer.js';
import { PALETTE } from '../render/Palette.js';
import { hutSize } from '../settlement/HutDimensions.js';
import { UnitFactory } from '../rts/UnitFactory.js';
import { UNIT_TYPES, BUILDING_TYPES, LOOKS, CENTER, TOWER } from '../config/rts.js';

/* ===================== Visor de modelos e animações (só em localhost) ===================== */
// Uma janela por cima do jogo com cada boneco, prédio e a trincheira, e todas as
// animações, com a linha do tempo na mão: tocar, pausar, ir quadro a quadro, parar num
// instante exato do ciclo e girar a câmera em volta. Serve para revisar as animações de
// perto — e para a IA que ajuda a desenvolver, pela alça window.__visor:
//   __visor.open() / close() / list()
//   __visor.show({ model: 'unit:rifleman', anim: 'cycle', phase: .6, playing: false,
//                  yaw: .8, pitch: .35, dist: 46, levels: { power, range, scatter } })
//   __visor.state() → o que está na tela;  __visor.snapshot() → PNG (data URL)
// Abre com a tecla M.

const MOTION_ANIMS = [
  ['idle', 'Parado'], ['walk', 'Andando'], ['run', 'Correndo'], ['guard', 'Guarda (pronto)'],
  ['strike', 'Golpe / tiro'], ['reload', 'Recarga'], ['reloadMag', 'Recarga do pente'],
  ['cycle', 'Ciclo de combate (golpe + recarga)'], ['chop', 'Cortar lenha'], ['hammer', 'Martelar (obra)'],
  ['gather', 'Colher'], ['carryLog', 'Carregar tora'], ['carrySack', 'Carregar saco'], ['crouch', 'Tocaia'],
  ['panic', 'Fuga'], ['preach', 'Pregação'], ['hurt', 'Tranco (apanhou)'], ['sleep', 'Dormindo']
];
const TOWER_ANIMS = [['towerCycle', 'Ciclo do tiro'], ['towerIdle', 'Sem alvo'], ['towerBuild', 'Em obra']];
const BUILDING_ANIMS = [['static', 'Pronto'], ['build', 'Em obra']];
const ARMY = new Set(Object.entries(LOOKS).filter(([, look]) => look.army).map(([id]) => id));

export function installModelViewer() {
  const characters = new CharacterModel();
  const buildings = new SertaoBuildingModel();
  let nextId = 900000;
  const factory = new UnitFactory({ newId: () => nextId++ });

  // ---------- a janela ----------
  const root = document.createElement('div');
  root.style.cssText = 'position:fixed;inset:0;z-index:9999;display:none;background:#1b1712;color:#efe6d4;' +
    'font:13px/1.35 system-ui,sans-serif;grid-template-columns:270px 1fr;';
  root.innerHTML = `
    <aside style="overflow:auto;padding:12px;border-right:1px solid #3a3128;background:#221d17">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <strong style="font-size:14px">Visor de modelos</strong>
        <button data-close style="background:#3a3128;color:#efe6d4;border:0;padding:4px 10px;cursor:pointer">Fechar (M)</button>
      </div>
      <label style="display:block;margin:8px 0 4px;color:#b8a888">Modelo</label>
      <select data-model size="14" style="width:100%;background:#15110d;color:#efe6d4;border:1px solid #3a3128"></select>
      <label style="display:block;margin:10px 0 4px;color:#b8a888">Animação</label>
      <select data-anim size="10" style="width:100%;background:#15110d;color:#efe6d4;border:1px solid #3a3128"></select>
      <div data-levels style="margin-top:10px"></div>
      <label style="display:block;margin:10px 0 4px;color:#b8a888">Instante do ciclo: <span data-phase-text></span></label>
      <input data-phase type="range" min="0" max="1" step="0.001" value="0" style="width:100%">
      <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">
        <button data-play style="flex:1">Pausar</button>
        <button data-step="-1">◂ quadro</button>
        <button data-step="1">quadro ▸</button>
      </div>
      <label style="display:block;margin:10px 0 4px;color:#b8a888">Velocidade</label>
      <select data-speed style="width:100%">
        <option value="0.1">0,1×</option><option value="0.25">0,25×</option><option value="0.5">0,5×</option>
        <option value="1" selected>1×</option><option value="2">2×</option>
      </select>
      <label style="display:flex;gap:6px;align-items:center;margin-top:10px"><input data-turn type="checkbox"> Girar sozinho</label>
      <label style="display:flex;gap:6px;align-items:center;margin-top:4px"><input data-grid type="checkbox" checked> Grade no chão</label>
      <p style="color:#8a7d66;margin-top:12px">Arrastar: girar · roda: aproximar · botão direito / Shift+arrastar: deslocar.
      No console: <code>__visor.show({...})</code>, <code>__visor.snapshot()</code>.</p>
    </aside>
    <main style="position:relative;overflow:hidden">
      <canvas data-canvas style="width:100%;height:100%;display:block"></canvas>
      <div data-info style="position:absolute;left:12px;top:10px;background:rgba(0,0,0,.45);padding:6px 9px;border-radius:4px;pointer-events:none"></div>
    </main>`;
  document.body.appendChild(root);
  const $ = sel => root.querySelector(sel);
  const canvas = $('[data-canvas]');

  // ---------- a cena do visor ----------
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.sky);
  scene.add(new THREE.HemisphereLight(0xf4efe2, 0x8a6a48, 1.15));
  const sun = new THREE.DirectionalLight(0xfff2dc, 1.6);
  sun.position.set(40, 70, 30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 200 });
  scene.add(sun);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(140, 48).rotateX(-Math.PI / 2),
    new THREE.MeshLambertMaterial({ color: PALETTE.clearing }));
  ground.receiveShadow = true;
  scene.add(ground);
  const grid = new THREE.GridHelper(120, 24, 0x7a5e40, 0xb8955f);
  grid.position.y = .02;
  scene.add(grid);
  const stage = new THREE.Group();
  scene.add(stage);
  const camera = new THREE.PerspectiveCamera(32, 1, .5, 800);
  const orbit = { yaw: .7, pitch: .32, dist: 46, target: new THREE.Vector3(0, 8, 0) };

  // ---------- o catálogo ----------
  const models = [];
  for (const [id, stats] of Object.entries(UNIT_TYPES)) models.push({ id: `unit:${id}`, label: `Unidade · ${stats.label}`, kind: 'unit', type: id });
  models.push({ id: 'tower', label: 'Prédio · Trincheira', kind: 'tower' });
  for (const id of ['hall', 'house', 'lodge', 'curral', 'igrejanova']) {
    if (BUILDING_TYPES[id]) models.push({ id: `building:${id}`, label: `Prédio · ${BUILDING_TYPES[id].label}`, kind: 'building', type: id });
  }
  const modelSelect = $('[data-model]');
  for (const m of models) modelSelect.add(new Option(m.label, m.id));

  const current = { model: null, anim: null, view: null, unit: null, tower: null, towerView: null, building: null,
    t: 0, playing: true, speed: 1, phase: 0, levels: { power: 0, range: 0, scatter: 0 }, progress: .5 };

  function clearStage() {
    while (stage.children.length) stage.remove(stage.children[0]);
    current.view = current.unit = current.tower = current.towerView = current.building = null;
  }

  function animsFor(model) {
    if (model.kind === 'tower') return TOWER_ANIMS;
    if (model.kind === 'building') return BUILDING_ANIMS;
    return MOTION_ANIMS;
  }

  function setModel(id) {
    const model = models.find(m => m.id === id) ?? models[0];
    clearStage();
    current.model = model;
    modelSelect.value = model.id;
    if (model.kind === 'unit') {
      const stats = UNIT_TYPES[model.type];
      const unit = factory.create(ARMY.has(stats.look) ? 'enemy' : 'player', model.type, 0, 0, Math.PI / 2);
      const view = characters.create(unit.sex === 'female');
      characters.equip(view, unit.look);
      characters.dress(view, unit.color, unit.outfit, unit.trousers);
      view.scale.setScalar(unit.size / 10);
      view.traverse(o => { if (o.isMesh) o.castShadow = true; });
      stage.add(view);
      current.view = view;
      current.unit = unit;
      orbit.target.set(0, 9 * unit.size / 10, 0);
      orbit.dist = 46;
    } else if (model.kind === 'tower') {
      const layer = new THREE.Group();
      stage.add(layer);
      const tower = { x: CENTER.x + 80, y: CENTER.y, seed: 7, levels: { ...current.levels }, built: true, progress: 1,
        aim: 0, cooldown: 0, stats: { interval: TOWER.interval } };
      const renderer3d = new TowerRenderer(layer, { toScene: () => ({ x: 0, z: 0 }) });
      current.tower = tower;
      current.towerView = { layer, renderer: renderer3d };
      renderer3d.sync([tower]);
      orbit.target.set(0, layer.children[0] ? layer.children[0].position.y + 6 : 6, 0);
      orbit.dist = 70;
    } else {
      current.building = model.type;
      rebuildBuilding();
      orbit.dist = model.type === 'igrejanova' || model.type === 'hall' ? 150 : 90;
      orbit.target.set(0, 10, 0);
    }
    fillAnims();
    fillLevels();
  }

  function rebuildBuilding() {
    while (stage.children.length) stage.remove(stage.children[0]);
    const kind = current.building, type = BUILDING_TYPES[kind];
    const built = current.anim !== 'build';
    const parts = buildings.build(kind, built ? 1 : Math.floor(current.progress * 10) / 10, built, hutSize(type.capacity));
    parts.group.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    stage.add(parts.group);
  }

  function fillAnims() {
    const select = $('[data-anim]');
    select.innerHTML = '';
    const list = animsFor(current.model);
    for (const [id, label] of list) select.add(new Option(label, id));
    const ranged = current.unit && current.unit.stats.ranged && !current.unit.stats.cannon;
    const wanted = list.some(([id]) => id === current.anim) ? current.anim : (ranged ? 'cycle' : list[0][0]);
    setAnim(wanted);
  }

  function setAnim(id) {
    current.anim = id;
    $('[data-anim]').value = id;
    current.t = 0;
    if (current.model.kind === 'building') rebuildBuilding();
  }

  function fillLevels() {
    const box = $('[data-levels]');
    box.innerHTML = '';
    if (current.model.kind === 'tower') {
      for (const [key, label, max] of [['power', 'Fuzis', 2], ['range', 'Jirau', 2], ['scatter', 'Bacamarte', 1]]) {
        const row = document.createElement('label');
        row.style.cssText = 'display:flex;justify-content:space-between;margin:3px 0';
        row.innerHTML = `<span>${label}</span><input type="range" min="0" max="${max}" step="1" value="${current.levels[key]}" style="width:120px">`;
        row.querySelector('input').addEventListener('input', e => {
          current.levels[key] = Number(e.target.value);
          if (current.tower) current.tower.levels = { ...current.levels };
        });
        box.appendChild(row);
      }
    }
    if (current.model.kind !== 'unit') {
      const row = document.createElement('label');
      row.style.cssText = 'display:flex;justify-content:space-between;margin:3px 0';
      row.innerHTML = `<span>Andamento da obra</span><input type="range" min="0" max="1" step="0.05" value="${current.progress}" style="width:120px">`;
      row.querySelector('input').addEventListener('input', e => {
        current.progress = Number(e.target.value);
        if (current.model.kind === 'building') rebuildBuilding();
      });
      box.appendChild(row);
    }
  }

  // Duração de um ciclo de cada animação (s), para a linha do tempo dar a volta.
  function cycleLength() {
    const u = current.unit;
    const swing = u ? u.stats.swing : 1, interval = u ? u.stats.interval : 2;
    switch (current.anim) {
      case 'strike': case 'hurt': return Math.max(.4, swing);
      case 'reload': return Math.max(.6, interval - swing);
      case 'reloadMag': return Math.max(.6, interval - swing + 1.6);
      case 'cycle': return interval * 5 + 1.6;                   // cinco tiros, o último com a recarga do pente
      case 'chop': case 'hammer': return 1.8;
      case 'towerCycle': return TOWER.interval * 3;
      default: return 4;
    }
  }

  // ---------- a pose do quadro (unidades): o mesmo `motion` que o jogo monta ----------
  function unitMotion(phase, time) {
    const u = current.unit;
    const weapon = u.weapon && u.weapon !== 'cannon' ? u.weapon : null;
    const m = {
      gait: 0, pace: 0, lean: 0, bellyScale: 1, animate: true, rest: 0, breath: 0, eyes: 1, seed: 1.37,
      elapsed: time, weapon: null, guard: false, strike: 0, strikeKind: null, reload: -1, reloadMag: false,
      pushing: Boolean(u.look?.cannon || u.look?.bigCannon)
    };
    const fight = () => { m.weapon = weapon; m.guard = true; };
    switch (current.anim) {
      case 'walk': m.pace = .9; m.gait = time * 6.2; m.weapon = u.armed ? weapon : null; break;
      case 'run': m.pace = 1.35; m.gait = time * 9.5; m.weapon = u.armed ? weapon : null; break;
      case 'guard': fight(); break;
      case 'strike': fight(); m.strike = 1 - phase; m.strikeKind = u.weapon; break;
      case 'reload': fight(); m.reload = phase; break;
      case 'reloadMag': fight(); m.reload = phase; m.reloadMag = true; break;
      case 'cycle': {
        // cinco tiros seguidos: golpe, recarga; a quinta recarga é a do pente (fuzil)
        fight();
        const swing = u.stats.swing, interval = u.stats.interval, mag = u.weapon === 'rifle';
        let t = phase * cycleLength();
        for (let shot = 0; shot < 5; shot++) {
          const last = shot === 4 && mag;
          const span = interval + (last ? 1.6 : 0);
          if (t < span || shot === 4) {
            if (t < swing) { m.strike = 1 - t / swing; m.strikeKind = u.weapon; }
            else { m.reload = Math.min(1, (t - swing) / (span - swing)); m.reloadMag = last; }
            break;
          }
          t -= span;
        }
        break;
      }
      case 'chop': m.chop = phase; break;
      case 'hammer': m.chop = phase; m.building = true; break;
      case 'gather': m.gathering = true; break;
      case 'carryLog': m.carrying = true; m.pace = .8; m.gait = time * 6; break;
      case 'carrySack': m.carryFood = true; m.pace = .8; m.gait = time * 6; break;
      case 'crouch': m.crouch = true; m.weapon = weapon; break;
      case 'panic': m.panic = true; m.pace = 1.35; m.gait = time * 9.5; break;
      case 'preach': m.preach = true; break;
      case 'hurt': m.hurt = 1 - phase; m.weapon = weapon; break;
      case 'sleep': m.rest = 1; m.breath = Math.sin(time * 1.4) * .5 + .5; m.eyes = .1; break;
      default: break;
    }
    return m;
  }

  // ---------- quadro a quadro ----------
  let last = performance.now(), raf = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000);
    last = now;
    if (current.playing) current.t += dt * current.speed;
    const length = cycleLength();
    current.phase = ((current.t / length) % 1 + 1) % 1;
    draw();
  }
  function draw() {
    const phase = current.phase, time = current.t;
    if (current.view) {
      characters.pose(current.view, unitMotion(phase, time));
    } else if (current.tower) {
      const tower = current.tower;
      tower.built = current.anim !== 'towerBuild';
      tower.progress = current.progress;
      if (current.anim === 'towerCycle') tower.cooldown = TOWER.interval * (1 - ((phase * 3) % 1)) || TOWER.interval;
      else tower.cooldown = 0;
      tower.aim = Math.sin(time * .3) * .5;
      current.towerView.renderer.sync([tower]);
    }
    if ($('[data-turn]').checked && current.playing) orbit.yaw += .004 * current.speed;
    grid.visible = $('[data-grid]').checked;
    const { yaw, pitch, dist, target } = orbit;
    camera.position.set(target.x + Math.sin(yaw) * Math.cos(pitch) * dist, target.y + Math.sin(pitch) * dist,
      target.z + Math.cos(yaw) * Math.cos(pitch) * dist);
    camera.lookAt(target);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.floor(w * devicePixelRatio) || canvas.height !== Math.floor(h * devicePixelRatio)) {
      renderer.setPixelRatio(devicePixelRatio);
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
    }
    renderer.render(scene, camera);
    $('[data-phase]').value = String(phase);
    $('[data-phase-text]').textContent = `${(phase * 100).toFixed(1)}% · ${(current.t % cycleLength()).toFixed(2)} s de ${cycleLength().toFixed(2)} s`;
    const animLabel = animsFor(current.model).find(([id]) => id === current.anim)?.[1] ?? current.anim;
    $('[data-info]').textContent = `${current.model.label} — ${animLabel} — ${(phase * 100).toFixed(1)}%${current.playing ? '' : ' (pausado)'}`;
  }

  // ---------- controles ----------
  modelSelect.addEventListener('change', () => setModel(modelSelect.value));
  $('[data-anim]').addEventListener('change', e => setAnim(e.target.value));
  $('[data-phase]').addEventListener('input', e => {
    current.playing = false;
    $('[data-play]').textContent = 'Tocar';
    current.t = Number(e.target.value) * cycleLength();
  });
  $('[data-play]').addEventListener('click', () => {
    current.playing = !current.playing;
    $('[data-play]').textContent = current.playing ? 'Pausar' : 'Tocar';
  });
  for (const button of root.querySelectorAll('[data-step]')) {
    button.addEventListener('click', () => {
      current.playing = false;
      $('[data-play]').textContent = 'Tocar';
      current.t += Number(button.dataset.step) / 30;
    });
  }
  $('[data-speed]').addEventListener('change', e => { current.speed = Number(e.target.value); });
  $('[data-close]').addEventListener('click', () => close());
  let drag = null;
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('pointerdown', e => {
    drag = { x: e.clientX, y: e.clientY, pan: e.button === 2 || e.shiftKey };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.x = e.clientX; drag.y = e.clientY;
    if (drag.pan) {
      const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
      const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
      orbit.target.addScaledVector(right, -dx * orbit.dist * .0016).addScaledVector(up, dy * orbit.dist * .0016);
    } else {
      orbit.yaw -= dx * .008;
      orbit.pitch = Math.max(-.2, Math.min(1.45, orbit.pitch + dy * .006));
    }
  });
  canvas.addEventListener('pointerup', () => { drag = null; });
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    orbit.dist = Math.max(8, Math.min(400, orbit.dist * Math.exp(e.deltaY * .001)));
  }, { passive: false });

  // ---------- abrir e fechar ----------
  function open() {
    if (root.style.display === 'grid') return;
    root.style.display = 'grid';
    if (!current.model) setModel(models[0].id);
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function close() {
    root.style.display = 'none';
    cancelAnimationFrame(raf);
  }
  window.addEventListener('keydown', e => {
    if (e.code !== 'KeyM' || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target && /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) && root.contains(e.target) && e.target.type !== 'range') return;
    if (root.style.display === 'grid') close(); else open();
  });

  // ---------- a alça para scripts e para a IA ----------
  window.__visor = {
    open, close,
    list: () => ({ models: models.map(m => ({ id: m.id, label: m.label, anims: animsFor(m).map(([id, label]) => ({ id, label })) })) }),
    // monta e para (ou toca) o que se pede; devolve o estado
    show({ model, anim, phase, playing, yaw, pitch, dist, levels, progress, speed } = {}) {
      open();
      if (model && model !== current.model?.id) setModel(model);
      if (levels) {
        Object.assign(current.levels, levels);
        if (current.tower) current.tower.levels = { ...current.levels };
        fillLevels();
      }
      if (progress !== undefined) { current.progress = progress; if (current.model.kind === 'building') rebuildBuilding(); }
      if (anim) setAnim(anim);
      if (phase !== undefined) current.t = phase * cycleLength();
      if (playing !== undefined) current.playing = Boolean(playing);
      if (speed !== undefined) current.speed = speed;
      if (yaw !== undefined) orbit.yaw = yaw;
      if (pitch !== undefined) orbit.pitch = pitch;
      if (dist !== undefined) orbit.dist = dist;
      $('[data-play]').textContent = current.playing ? 'Pausar' : 'Tocar';
      current.phase = ((current.t / cycleLength()) % 1 + 1) % 1;
      draw();
      return this.state();
    },
    state: () => ({
      model: current.model?.id, anim: current.anim, phase: current.phase, time: current.t,
      cycle: cycleLength(), playing: current.playing, camera: { ...orbit, target: orbit.target.toArray() },
      levels: { ...current.levels }
    }),
    snapshot() { draw(); return canvas.toDataURL('image/png'); }
  };
}
