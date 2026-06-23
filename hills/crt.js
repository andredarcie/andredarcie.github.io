// crt.js — "vidro" de TV CRT por cima de TUDO no jogo (mundo, menus): scanlines,
// vinheta, dither ordenado e grão de filme animado. É a MESMA receita do filtro da
// intro (boot.js), agora permanente no gameplay -> abertura e jogo combinam.
// Vanilla, sem three.js. pointer-events:none -> nunca bloqueia clique/toque.
// Fica abaixo da overlay da intro (z altíssimo), então durante a abertura quem
// aparece é o filtro do boot; quando a intro some, este assume.

let started = false;
let rafId = 0;

export function startCRT() {
  if (started) return;
  started = true;
  injectStyle();

  const root = document.createElement('div');
  root.className = 'crt-fx';

  // dither ordenado (matriz de Bayer 4x4) como textura tileável de 4px
  const bay = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const bc = document.createElement('canvas'); bc.width = bc.height = 4;
  const bx = bc.getContext('2d'); const bimg = bx.createImageData(4, 4);
  for (let i = 0; i < 16; i++) { const v = 110 + (bay[i] / 15) * 36 | 0; const o = i * 4; bimg.data[o] = bimg.data[o + 1] = bimg.data[o + 2] = v; bimg.data[o + 3] = 255; }
  bx.putImageData(bimg, 0, 0);

  const dith = document.createElement('div'); dith.className = 'crt-dither';
  dith.style.backgroundImage = 'url(' + bc.toDataURL() + ')';
  const scan = document.createElement('div'); scan.className = 'crt-scan';
  const vig = document.createElement('div'); vig.className = 'crt-vig';
  const grain = document.createElement('canvas'); grain.className = 'crt-grain';
  const gctx = grain.getContext('2d');
  root.appendChild(dith);
  root.appendChild(grain);
  root.appendChild(scan);
  root.appendChild(vig);
  document.body.appendChild(root);

  // grão animado em baixa resolução -> upscale pixelado (chunky, igual ao jogo)
  let gimg = null;
  function resize() {
    const ratio = window.innerHeight / Math.max(1, window.innerWidth);
    const W = 240, H = Math.max(2, Math.round(W * ratio));
    grain.width = W; grain.height = H;
    gimg = gctx.createImageData(W, H);
    const d = gimg.data;
    for (let i = 3; i < d.length; i += 4) d[i] = 255;   // alpha fixo; só o RGB muda por frame
  }
  resize();
  window.addEventListener('resize', resize);

  (function paint() {
    if (gimg) { const d = gimg.data; for (let i = 0; i < d.length; i += 4) { const v = Math.random() * 255 | 0; d[i] = d[i + 1] = d[i + 2] = v; } gctx.putImageData(gimg, 0, 0); }
    rafId = requestAnimationFrame(paint);
  })();
}

function injectStyle() {
  if (document.getElementById('crt-fx-style')) return;
  const css = `
.crt-fx{ position:fixed; inset:0; z-index:1000; pointer-events:none; }
.crt-dither, .crt-grain, .crt-scan, .crt-vig{ position:absolute; inset:0; pointer-events:none; }
.crt-dither{ width:100%; height:100%; background-repeat:repeat; background-size:4px 4px;
  image-rendering:pixelated; mix-blend-mode:overlay; opacity:.06; }
.crt-grain{ width:100%; height:100%; image-rendering:pixelated; mix-blend-mode:overlay; opacity:.1; }
.crt-scan{ background:repeating-linear-gradient(0deg, rgba(0,0,0,.22) 0 1px, rgba(0,0,0,0) 1px 3px);
  mix-blend-mode:multiply; opacity:.55; }
.crt-vig{ background:radial-gradient(120% 100% at 50% 50%, rgba(0,0,0,0) 42%, rgba(0,0,0,.6) 100%);
  mix-blend-mode:multiply; }
`;
  const style = document.createElement('style');
  style.id = 'crt-fx-style';
  style.textContent = css;
  document.head.appendChild(style);
}
