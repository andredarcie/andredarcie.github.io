// Boot: carrega as imagens, mostra a tela de título e começa o jogo.
import { LARG, ALT, entrada, rodarLaco } from './src/base.js';
import { carregar } from './src/recursos.js';
import { Jogo } from './src/jogo.js';
import { som } from './src/som.js';
import { texto, FONTE, FONTE_NARRACAO } from './src/janela.js';

const IMAGENS = [
  'tiles/iA2', 'tiles/iA4', 'tiles/iA5', 'tiles/iB', 'tiles/iC',
  'tiles/dA2', 'tiles/dA4', 'tiles/dA5', 'tiles/dB', 'tiles/dC',
  'tiles/mA2', 'tiles/mA4', 'tiles/mA5', 'tiles/mD', 'tiles/mE', 'tiles/xA',
  'pics/iconset', 'pics/carta',
  'chars/m03a', 'chars/m03b', 'chars/m03d', 'chars/m04a', 'chars/m06a', 'chars/r0281', 'chars/vOther3', 'chars/vDoor3',
];

const canvas = document.getElementById('tela');
canvas.width = LARG; canvas.height = ALT;
const g = canvas.getContext('2d');

// Escala a tela no maior tamanho que cabe. No toque, em pé, desconta a faixa dos controles
// (o padding do body); deitado, a tela usa a altura toda e os controles ficam dos lados.
function ajustar() {
  const b = document.body;
  const toque = b.classList.contains('toque');
  const deitado = innerWidth > innerHeight;
  b.classList.toggle('retrato', toque && !deitado);
  b.classList.toggle('paisagem', toque && deitado);
  const cs = getComputedStyle(b);
  const w = innerWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const h = innerHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  const s = Math.max(0.2, Math.min(w / LARG, h / ALT));
  const k = s >= 1 && !toque ? Math.floor(s * 4) / 4 : s;
  canvas.style.width = `${Math.floor(LARG * k)}px`;
  canvas.style.height = `${Math.floor(ALT * k)}px`;
}
addEventListener('resize', ajustar);
addEventListener('orientationchange', () => setTimeout(ajustar, 200));
ajustar();
let naTitulo = true;

const params = new URLSearchParams(location.search);

async function iniciar() {
  await carregar(IMAGENS, (p) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, LARG, ALT);
    g.fillStyle = '#444'; g.fillRect(172, 300, 200, 2);
    g.fillStyle = '#bbb'; g.fillRect(172, 300, 200 * p, 2);
  });
  document.getElementById('carga')?.remove();
  const jogo = new Jogo(canvas);
  window.__insonia = jogo;

  // Atalho de desenvolvimento: ?mapa=id&x=..&y=.. pula para um mapa.
  if (params.get('mapa')) {
    jogo.semSalvar = params.has('semsalvar');
    if (params.get('flags')) for (const f of params.get('flags').split(',')) jogo.flags[f] = true;
    if (params.get('itens')) for (const i of params.get('itens').split(',')) jogo.itens.push({ id: i, n: 1 });
    jogo.carregar(params.get('mapa'), +(params.get('x') || 8), +(params.get('y') || 6), params.get('dir') || 'baixo');
    rodarLaco(() => jogo.atualizar(), () => jogo.desenhar());
    return;
  }

  // Tela de título
  const temSave = Jogo.temSave();
  const opcoes = temSave ? ['Continuar', 'Novo jogo'] : ['Novo jogo'];
  let sel = 0, t = 0, escolhido = null;
  rodarLaco(() => {
    if (escolhido === null) {
      t++;
      if (entrada.repetiu('baixo') || entrada.repetiu('cima')) { sel = (sel + 1) % opcoes.length; som.destravar(); som.cursor(); }
      if (entrada.disparou('ok')) {
        som.destravar(); som.ok();
        escolhido = opcoes[sel];
        naTitulo = false;
        if (escolhido === 'Continuar') jogo.continuar();
        else { try { localStorage.removeItem('insonia.save'); } catch { /* */ } jogo.carregar('cela', 9, 6, 'cima'); }
        som.ambiente(1);
      }
      entrada.fimDoQuadro();
      return;
    }
    jogo.atualizar();
  }, () => {
    if (escolhido !== null) { jogo.desenhar(); return; }
    g.fillStyle = '#000'; g.fillRect(0, 0, LARG, ALT);
    const a = Math.min(1, t / 90);
    g.globalAlpha = a;
    texto(g, 'Insônia', LARG / 2, 140, '#cfcfcf', '40px Georgia, "Times New Roman", serif', 'center');
    texto(g, 'O medo do desconhecido', LARG / 2, 194, '#7a7a7a', FONTE_NARRACAO.replace('23px', '16px'), 'center');
    opcoes.forEach((o, i) => texto(g, (i === sel ? '> ' : '  ') + o, LARG / 2 - 50, 270 + i * 26, i === sel ? '#e6e6e6' : '#777', FONTE));
    const dica = document.body.classList.contains('toque')
      ? 'Direcional: andar   OK: ação   Esc: cancelar   I: inventário'
      : 'Setas: andar   Enter: ação   Esc: cancelar   I: inventário';
    texto(g, dica, LARG / 2, 384, '#4a4a4a', '12px "Courier New", monospace', 'center');
    g.globalAlpha = 1;
  });
}

iniciar().catch((e) => {
  console.error(e);
  const el = document.getElementById('carga');
  if (el) el.textContent = 'Erro ao carregar: ' + e.message;
});

// ---------------- Controles de toque (aparecem só em telas de toque) ----------------
function ativarToque() {
  if (document.body.classList.contains('toque')) return;
  document.body.classList.add('toque');
  if (document.fullscreenEnabled) document.body.classList.add('tela-cheia-ok');
  ajustar();
}
if (matchMedia('(pointer: coarse)').matches) ativarToque();
addEventListener('touchstart', ativarToque, { once: true, passive: true });

// Direcional: um só controle; arrastar o dedo troca a direção sem precisar soltar.
const dpad = document.getElementById('dpad');
const setas = Object.fromEntries([...dpad.querySelectorAll('[data-d]')].map((s) => [s.dataset.d, s]));
let dedo = null, dirAtual = null;
function mudarDir(d) {
  if (d === dirAtual) return;
  if (dirAtual) { entrada.soltar(dirAtual); setas[dirAtual].classList.remove('on'); }
  dirAtual = d;
  if (d) { entrada.pressionar(d); setas[d].classList.add('on'); }
}
function dirDoDedo(e) {
  const r = dpad.getBoundingClientRect();
  const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
  if (Math.hypot(dx, dy) < r.width * 0.12) return dirAtual; // zona morta no meio
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'direita' : 'esquerda') : (dy > 0 ? 'baixo' : 'cima');
}
dpad.addEventListener('pointerdown', (e) => {
  e.preventDefault(); som.destravar();
  dedo = e.pointerId;
  try { dpad.setPointerCapture(e.pointerId); } catch { /* */ }
  mudarDir(dirDoDedo(e));
});
dpad.addEventListener('pointermove', (e) => { if (e.pointerId === dedo) mudarDir(dirDoDedo(e)); });
const soltarDpad = (e) => { if (e.pointerId === dedo) { dedo = null; mudarDir(null); } };
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) dpad.addEventListener(ev, soltarDpad);

// OK, Esc e I
for (const b of document.querySelectorAll('.pad [data-k]')) {
  const k = b.dataset.k;
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); som.destravar(); b.classList.add('on'); entrada.pressionar(k); });
  const off = (e) => { e.preventDefault(); b.classList.remove('on'); entrada.soltar(k); };
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(ev, off);
}

// Tocar na tela vale OK enquanto há texto aberto (falas, escolhas, avisos, título),
// para não interagir com o cenário sem querer.
canvas.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse') return;
  const j = window.__insonia;
  const temTexto = naTitulo || (j && (j.msg.aberta || j.aviso.atual || j.narracao));
  if (!temTexto) return;
  e.preventDefault(); som.destravar();
  entrada.pressionar('ok');
  const solta = () => entrada.soltar('ok');
  canvas.addEventListener('pointerup', solta, { once: true });
  canvas.addEventListener('pointercancel', solta, { once: true });
});

document.getElementById('tela-cheia').addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else document.documentElement.requestFullscreen?.().catch(() => {});
});
addEventListener('fullscreenchange', () => setTimeout(ajustar, 100));
addEventListener('contextmenu', (e) => { if (document.body.classList.contains('toque')) e.preventDefault(); });

// Som: o iOS só libera o áudio dentro de um gesto; pausa quando o app vai para o fundo.
for (const ev of ['touchend', 'click', 'keydown']) addEventListener(ev, () => som.destravar(), { passive: true });
document.addEventListener('visibilitychange', () => {
  som.pausar(document.hidden);
  if (document.hidden) { entrada.seguro.clear(); mudarDir(null); }
});
