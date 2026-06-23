// boot.js — sequencia de abertura estilo "boot de console 32-bit" (homenagem ORIGINAL).
// Modulo ES vanilla, sem imports, sem three.js. Cria a propria DOM e injeta CSS.
// NADA de marcas registradas: simbolo geometrico proprio + microtexto ficticio.

export function runIntro(onStart) {
  // --- injeta o CSS uma unica vez ---
  injectStyle();

  // --- overlay raiz (acima do canvas do jogo) ---
  const overlay = document.createElement('div');
  overlay.className = 'hills-intro';

  // canvas do boot (cena 1: simbolo girando sobre branco)
  const canvas = document.createElement('canvas');
  canvas.className = 'hills-boot-canvas';
  overlay.appendChild(canvas);

  // camada de texto/cenas em DOM (microtexto, credito, menu)
  const layer = document.createElement('div');
  layer.className = 'hills-layer';
  overlay.appendChild(layer);

  document.body.appendChild(overlay);

  // ---------- camada de FX PSX (mesmo "filtro" do jogo) por cima de TUDO ----------
  // grão animado + dither ordenado + scanlines + vinheta, em blend modes, cobrindo
  // boot/credito/menu pra que a abertura combine com o look PS1 do jogo.
  let fxRaf = 0, fxGrainCanvas = null, fxGrainCtx = null, fxGrainImg = null;
  function resizeFX() {
    if (!fxGrainCanvas) return;
    const ratio = window.innerHeight / Math.max(1, window.innerWidth);
    const W = 240, H = Math.max(2, Math.round(W * ratio));
    fxGrainCanvas.width = W; fxGrainCanvas.height = H;
    fxGrainImg = fxGrainCtx.createImageData(W, H);
    const d = fxGrainImg.data;
    for (let i = 3; i < d.length; i += 4) d[i] = 255;   // alpha fixo; só o RGB muda por frame
  }
  function setupFX() {
    // dither ordenado (matriz de Bayer 4x4) como textura tileável de 4px
    const bay = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    const bc = document.createElement('canvas'); bc.width = bc.height = 4;
    const bx = bc.getContext('2d'); const bimg = bx.createImageData(4, 4);
    for (let i = 0; i < 16; i++) { const v = 110 + (bay[i] / 15) * 36 | 0; const o = i * 4; bimg.data[o] = bimg.data[o + 1] = bimg.data[o + 2] = v; bimg.data[o + 3] = 255; }
    bx.putImageData(bimg, 0, 0);

    const dith = document.createElement('div'); dith.className = 'hills-fx-dither';
    dith.style.backgroundImage = 'url(' + bc.toDataURL() + ')';
    const scan = document.createElement('div'); scan.className = 'hills-fx-scan';
    const vig = document.createElement('div'); vig.className = 'hills-fx-vig';
    fxGrainCanvas = document.createElement('canvas'); fxGrainCanvas.className = 'hills-fx-grain';
    fxGrainCtx = fxGrainCanvas.getContext('2d');
    overlay.appendChild(dith);
    overlay.appendChild(fxGrainCanvas);
    overlay.appendChild(scan);
    overlay.appendChild(vig);
    resizeFX();
    (function paintGrain() {
      if (fxGrainImg) { const d = fxGrainImg.data; for (let i = 0; i < d.length; i += 4) { const v = Math.random() * 255 | 0; d[i] = d[i + 1] = d[i + 2] = v; } fxGrainCtx.putImageData(fxGrainImg, 0, 0); }
      fxRaf = requestAnimationFrame(paintGrain);
    })();
  }
  setupFX();

  // estado interno
  let stage = 0;            // 0 boot, 1 credito, 2 menu
  let rafId = 0;
  let timers = [];
  let cleaned = false;

  // voltando de um game over? pula a intro inteira e cai direto no menu/titulo.
  let skipIntro = false;
  try {
    skipIntro = sessionStorage.getItem('hills-skip-intro') === '1';
    if (skipIntro) sessionStorage.removeItem('hills-skip-intro');
  } catch (e) { /* sessionStorage indisponivel: roda a intro normal */ }

  // A intro e TOTALMENTE SILENCIOSA: nenhum audio aqui. O som do jogo so
  // comeca depois, no proprio jogo (GameAudio), apos o botao "start torture".

  const ctx = canvas.getContext('2d');
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // ---------- util de timers cancelaveis ----------
  function later(fn, ms) {
    const id = setTimeout(fn, ms);
    timers.push(id);
    return id;
  }
  function clearTimers() {
    timers.forEach(clearTimeout);
    timers = [];
  }

  // ---------- ajuste de resolucao do canvas ----------
  function resizeCanvas() {
    // backing store em BAIXA resolução -> upscale pixelado: chunky igual ao jogo
    const ih = 260;
    const iw = Math.max(2, Math.round((window.innerWidth / window.innerHeight) * ih));
    canvas.width = iw;
    canvas.height = ih;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    // desenha em coordenadas de CSS px; o transform mapeia pro backing baixo
    if (ctx) ctx.setTransform(iw / window.innerWidth, 0, 0, ih / window.innerHeight, 0, 0);
    resizeFX();
  }

  // =====================================================================
  // CENA 1 — BOOT, SATIRA da tela branca classica (nada de marcas reais):
  //   CENA 0) fundo BRANCO + "AGONY" (azul, serifado) + diamante laranja/amarelo
  //           com o "S" recortado + "COMPUTER ENTERTAINMENT (TM)" (azul). Som grave.
  //   CENA B) fade pro preto -> logo colorido (P vermelho + S listrado deitado)
  //           "PainStation" + licenca + a chime ascendente.
  // =====================================================================
  function startBoot() {
    stage = 0;
    layer.style.opacity = '1';
    layer.className = 'hills-layer hills-boot-ps';
    layer.innerHTML = '';

    let running = true;
    let glowT0 = 0;             // instante em que o logo colorido surge (p/ o brilho)
    const t0 = performance.now();

    const C0_FADE = 3000;       // quando o branco comeca a virar preto
    const C0_END = 3600;        // corte pra cena B
    const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

    function frame(now) {
      const t = now - t0;
      const w = window.innerWidth;
      const h = window.innerHeight;

      if (t < C0_END) {
        // ===== CENA 0: tela BRANCA (o diamante AGONY vem em DOM por cima) =====
        ctx.fillStyle = '#f6f6f2';        // branco chapado, limpo (sem grao)
        ctx.fillRect(0, 0, w, h);

        // fade pro preto no fim, p/ emendar na cena do logo colorido
        if (t > C0_FADE) {
          const a = clamp01((t - C0_FADE) / (C0_END - C0_FADE));
          ctx.fillStyle = 'rgba(0,0,0,' + a + ')';
          ctx.fillRect(0, 0, w, h);
        }
      } else {
        // ===== CENA B: fundo preto + brilho + vinheta + grao/scanlines =====
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);

        if (glowT0) {
          const g = Math.min(1, (now - glowT0) / 700);
          const pulse = 0.85 + 0.15 * Math.sin(now / 600);
          const r = Math.min(w, h) * (0.20 + 0.18 * g);
          const grd = ctx.createRadialGradient(w / 2, h * 0.46, 0, w / 2, h * 0.46, r);
          grd.addColorStop(0, 'rgba(70,90,150,' + (0.22 * g * pulse).toFixed(3) + ')');
          grd.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = grd;
          ctx.fillRect(0, 0, w, h);
        }

        const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
        vg.addColorStop(0, 'rgba(0,0,0,0)');
        vg.addColorStop(1, 'rgba(0,0,0,0.55)');
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, w, h);

        // grão/scanlines agora vêm da camada global de FX PSX (hills-fx-*)
      }

      if (running) rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);

    // --- CENA 0 (DOM): AGONY + diamante + COMPUTER ENTERTAINMENT ---
    const sce = document.createElement('div');
    sce.className = 'hills-sce-diamond';
    sce.innerHTML =
      '<div class="hills-sce-top">AGONY</div>' +
      DIAMOND_SVG +
      '<div class="hills-sce-bot">COMPUTER<br>ENTERTAINMENT <sup>&trade;</sup></div>';
    layer.appendChild(sce);
    requestAnimationFrame(() => sce.classList.add('on'));
    later(() => sce.classList.add('out'), C0_FADE);     // some junto com o fade pro preto
    later(() => { if (sce.parentNode) sce.remove(); }, C0_END);

    // --- CENA B (DOM): logo colorido PainStation (satira) ---
    later(() => {
      glowT0 = performance.now();
      const ps = document.createElement('div');
      ps.className = 'hills-ps';
      ps.innerHTML = PS_LOGO_SVG +
        '<div class="hills-ps-word">PainStation</div>' +
        '<div class="hills-ps-lic">Licensed by<br>Agony Computer Entertainment Inc.</div>';
      layer.appendChild(ps);
      requestAnimationFrame(() => ps.classList.add('on'));
    }, C0_END);

    // fim do boot -> credito
    later(() => {
      running = false;
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      startCredit();
    }, C0_END + 3300);
  }

  // (grão e scanlines do boot agora são feitos pela camada global de FX PSX)

  // =====================================================================
  // CENA 2 — CREDITO (~2s): fundo preto, texto serifado fade in/out.
  // =====================================================================
  function startCredit() {
    stage = 1;
    // limpa o canvas pra preto e para de desenhar
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    layer.style.opacity = '1';
    layer.className = 'hills-layer hills-credit';
    layer.innerHTML = '<div class="hills-credit-text">Andr&eacute; N. Darcie presents</div>';

    const el = layer.querySelector('.hills-credit-text');
    // fade in
    requestAnimationFrame(() => { el.style.opacity = '1'; });
    // fade out depois de ~1.4s, e segue pro menu
    later(() => { el.style.opacity = '0'; }, 1400);
    later(startMenu, 2000);
  }

  // =====================================================================
  // CENA 3 — MENU minimalista: titulo "HILLS" + "start torture" com flicker.
  // =====================================================================
  function startMenu() {
    stage = 2;
    layer.style.opacity = '1';
    layer.className = 'hills-layer hills-menu';
    layer.innerHTML =
      '<div class="hills-fog"></div>' +
      '<h1 class="hills-title">DOOM<br>HILLS</h1>' +
      '<button type="button" class="hills-start">start torture</button>';

    const btn = layer.querySelector('.hills-start');
    // botao do menu chama begin() (que dispara onStart de forma SINCRONA)
    btn.addEventListener('click', (e) => { e.stopPropagation(); begin(); });
    btn.addEventListener('touchend', (e) => { e.stopPropagation(); e.preventDefault(); begin(); }, { passive: false });
  }

  // =====================================================================
  // A intro NAO pode ser pulada: toque/clique/tecla nao avancam nada.
  // A sequencia roda inteira sozinha ate o menu; quem inicia o jogo e o
  // botao "start torture". (Handlers ficam como no-op so p/ o cleanup.)
  // =====================================================================
  function onKey() {}
  function onTap() {}

  overlay.addEventListener('click', onTap);
  overlay.addEventListener('touchstart', onTap, { passive: true });
  window.addEventListener('keydown', onKey);

  // =====================================================================
  // BEGIN — esconde overlay e chama onStart SINCRONAMENTE (gesto do usuario).
  // =====================================================================
  function begin() {
    if (cleaned) return;
    cleaned = true;

    // remove listeners e timers
    clearTimers();
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    if (fxRaf) { cancelAnimationFrame(fxRaf); fxRaf = 0; }
    window.removeEventListener('resize', resizeCanvas);
    window.removeEventListener('keydown', onKey);
    overlay.removeEventListener('click', onTap);
    overlay.removeEventListener('touchstart', onTap);

    // esconde a overlay ANTES de chamar onStart (libera o canvas do jogo)
    overlay.style.display = 'none';

    // chama de forma sincrona dentro do evento de clique/toque
    if (typeof onStart === 'function') onStart();

    // remove a overlay do DOM no proximo tick (ja escondida)
    setTimeout(() => { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 0);
  }

  // arranca a sequencia (ou pula direto pro titulo se voltou de um game over)
  if (skipIntro) startMenu();
  else startBoot();
}

// ----------------------------------------------------------------------
// Logo "PS" desenhado em SVG (homenagem): P vermelho em pe + S deitado
// com listras (azul-escuro -> azul -> verde-agua -> amarelo, de baixo p/ cima).
// ----------------------------------------------------------------------
const PS_LOGO_SVG = `
<svg class="hills-ps-mark" viewBox="0 0 380 250" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="hillsPsS" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#26408f"/>
      <stop offset="0.28" stop-color="#26408f"/>
      <stop offset="0.28" stop-color="#2f7fc8"/>
      <stop offset="0.5" stop-color="#2f7fc8"/>
      <stop offset="0.5" stop-color="#36b6a8"/>
      <stop offset="0.72" stop-color="#36b6a8"/>
      <stop offset="0.72" stop-color="#f4c01f"/>
      <stop offset="1" stop-color="#f4c01f"/>
    </linearGradient>
  </defs>
  <g font-family="'Arial Black',Impact,'Arial Narrow',sans-serif" font-weight="900">
    <text x="73" y="209" font-size="240" fill="#5c0a0e">P</text>
    <text x="70" y="205" font-size="240" fill="#e2222b">P</text>
    <g transform="rotate(-90 228 186)">
      <text x="228" y="186" text-anchor="middle" dominant-baseline="central" font-size="186" fill="url(#hillsPsS)">S</text>
    </g>
  </g>
</svg>`;

// ----------------------------------------------------------------------
// Diamante "AGONY" em SVG (satira da tela branca): losango com gradiente
// laranja->amarelo->laranja e dois recortes brancos formando um "S".
// O branco dos recortes casa com o fundo (#f6f6f2).
// ----------------------------------------------------------------------
const DIAMOND_SVG = `
<svg class="hills-diamond" viewBox="0 0 420 420" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="hillsDia" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ef5410"/>
      <stop offset="0.4" stop-color="#fcab10"/>
      <stop offset="0.58" stop-color="#ffd61a"/>
      <stop offset="0.78" stop-color="#fbb016"/>
      <stop offset="1" stop-color="#f3941a"/>
    </linearGradient>
  </defs>
  <polygon points="210,40 380,210 210,380 40,210" fill="url(#hillsDia)"/>
  <!-- recortes brancos = o "S" (bahia superior-direita + inferior-esquerda) -->
  <polygon points="208,112 300,208 208,208" fill="#f6f6f2"/>
  <polygon points="212,308 120,212 212,212" fill="#f6f6f2"/>
</svg>`;

// ----------------------------------------------------------------------
// CSS injetado via JS — estetica terror/minimalista, serifada, tracking alto.
// ----------------------------------------------------------------------
function injectStyle() {
  if (document.getElementById('hills-intro-style')) return;
  const css = `
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
.hills-intro{
  position:fixed; inset:0; z-index:2147483000;
  background:#000; overflow:hidden;
  font-family:Georgia,"Times New Roman",Times,serif;
  -webkit-user-select:none; user-select:none;
  -webkit-tap-highlight-color:transparent; cursor:pointer;
}
.hills-boot-canvas{ position:absolute; inset:0; display:block; image-rendering:pixelated; }
.hills-layer{
  position:absolute; inset:0;
  display:flex; align-items:center; justify-content:center;
  flex-direction:column; pointer-events:none;
}
/* microtexto do boot, rodape sobre o branco */
.hills-boot-text{ justify-content:flex-end; }
.hills-micro{
  margin-bottom:6vh; color:#222; font-size:10px;
  letter-spacing:.28em; text-transform:uppercase; opacity:.7;
  text-align:center; padding:0 6vw;
}
/* ---- BOOT de console 32-bit (satira) ---- */
.hills-boot-ps{ justify-content:center; }
/* CENA 0: tela branca classica — AGONY + diamante + COMPUTER ENTERTAINMENT */
.hills-sce-diamond{
  display:flex; flex-direction:column; align-items:center;
  opacity:0; transition:opacity .8s ease;
}
.hills-sce-diamond.on{ opacity:1; }
.hills-sce-diamond.out{ opacity:0; }
.hills-sce-top{
  color:#2a2f8f; font-family:Georgia,"Times New Roman",Times,serif;
  font-weight:700; font-size:clamp(30px,9vw,72px);
  letter-spacing:.05em; line-height:1; margin-bottom:-1vh;
  text-shadow:1px 0 0 rgba(255,40,70,.35), -1px 0 0 rgba(40,170,255,.3);
}
.hills-diamond{
  width:clamp(150px,32vw,300px); height:auto; display:block;
  filter:drop-shadow(1px 0 0 rgba(255,40,70,.4)) drop-shadow(-1px 0 0 rgba(40,170,255,.35));
}
.hills-sce-bot{
  color:#2a2f8f; font-family:Arial,Helvetica,sans-serif;
  font-weight:600; font-size:clamp(13px,3.2vw,26px);
  letter-spacing:.12em; line-height:1.2; text-align:center; margin-top:-1vh;
}
.hills-sce-bot sup{ font-size:.45em; letter-spacing:0; vertical-align:.8em; }
/* CENA B: logo PainStation */
.hills-ps{
  display:flex; flex-direction:column; align-items:center; gap:2.2vh;
  opacity:0; transform:scale(.92);
  transition:opacity .8s ease, transform .8s ease;
}
.hills-ps.on{ opacity:1; transform:scale(1); }
.hills-ps-mark{
  width:clamp(150px,33vw,300px); height:auto; display:block;
  filter:drop-shadow(1.5px 0 0 rgba(255,40,70,.5)) drop-shadow(-1.5px 0 0 rgba(40,200,255,.45)) drop-shadow(0 6px 18px rgba(0,0,0,.55));
}
.hills-ps-word{
  color:#f3f5f8; font-family:"Arial Narrow",Arial,Helvetica,sans-serif;
  font-weight:700; font-size:clamp(26px,7vw,58px);
  letter-spacing:.01em; line-height:1; margin-top:.15em;
  text-shadow:1.5px 0 0 rgba(255,40,70,.45), -1.5px 0 0 rgba(40,200,255,.4);
}
.hills-ps-lic{
  color:#c9cdd4; font-family:Arial,Helvetica,sans-serif;
  font-size:clamp(9px,1.7vw,13px); letter-spacing:.04em;
  line-height:1.5; text-align:center;
}
/* credito */
.hills-credit-text{
  font-family:"Press Start 2P", monospace;
  color:#e8e3da; font-size:clamp(11px,2.4vw,20px); line-height:1.7;
  letter-spacing:.04em;
  opacity:0; transition:opacity 1s ease;
  text-align:center; padding:0 8vw;
  text-shadow:1.2px 0 0 rgba(255,40,70,.4), -1.2px 0 0 rgba(40,200,255,.35);
}
/* menu */
.hills-menu{ background:radial-gradient(120% 90% at 50% 40%, #0c1014 0%, #04060a 72%); }
.hills-fog{
  position:absolute; inset:0; pointer-events:none;
  background:radial-gradient(60% 40% at 50% 55%, rgba(60,60,60,.25), transparent 70%);
  animation:hills-fog 9s ease-in-out infinite alternate;
}
@keyframes hills-fog{ from{opacity:.45; transform:translateY(0);} to{opacity:.8; transform:translateY(-12px);} }
.hills-title{
  font-family:"Press Start 2P", monospace;
  margin:0 0 8vh 0; color:#e9e4db;
  font-size:clamp(34px,10vw,104px); font-weight:400;
  letter-spacing:.06em; text-indent:.06em; line-height:1;
  text-shadow:1.5px 0 0 rgba(255,40,70,.45), -1.5px 0 0 rgba(40,200,255,.4), 0 0 24px rgba(0,0,0,.9);
  position:relative; z-index:1;
}
.hills-start{
  pointer-events:auto; cursor:pointer; position:relative; z-index:1;
  background:none; border:0; padding:.4em 1em;
  color:#bdb6aa; font-family:"Press Start 2P", monospace;
  font-size:clamp(10px,2vw,15px); letter-spacing:.12em;
  text-transform:lowercase;
  animation:hills-flicker 3.2s steps(1) infinite;
}
.hills-start:hover{ color:#fff; }
@keyframes hills-flicker{
  0%,19%,21%,55%,57%,100%{ opacity:1; }
  20%,56%{ opacity:.25; }
  78%,80%{ opacity:.5; }
}
/* ===== Camada de FX PSX por cima de TUDO (mesmo "filtro" do jogo) =====
   dither ordenado + grão de filme + scanlines + vinheta, em blend modes,
   pra que boot/credito/menu tenham o look PS1 do jogo. */
.hills-fx-dither, .hills-fx-grain, .hills-fx-scan, .hills-fx-vig{
  position:absolute; inset:0; pointer-events:none;
}
.hills-fx-dither{
  width:100%; height:100%; background-repeat:repeat; background-size:4px 4px;
  image-rendering:pixelated; mix-blend-mode:overlay; opacity:.06; z-index:58;
}
.hills-fx-grain{
  width:100%; height:100%; image-rendering:pixelated;
  mix-blend-mode:overlay; opacity:.1; z-index:60;
}
.hills-fx-scan{
  background:repeating-linear-gradient(0deg, rgba(0,0,0,.22) 0 1px, rgba(0,0,0,0) 1px 3px);
  mix-blend-mode:multiply; opacity:.55; z-index:62;
}
.hills-fx-vig{
  background:radial-gradient(120% 100% at 50% 50%, rgba(0,0,0,0) 42%, rgba(0,0,0,.6) 100%);
  mix-blend-mode:multiply; z-index:64;
}
`;
  const style = document.createElement('style');
  style.id = 'hills-intro-style';
  style.textContent = css;
  document.head.appendChild(style);
}
