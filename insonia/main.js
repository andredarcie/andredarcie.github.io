// Boot: carrega as imagens, mostra a tela de título e começa o jogo.
import { TELA, definirTela, entrada, rodarLaco, gravacao } from './src/base.js';
import { carregar } from './src/recursos.js';
import { Jogo } from './src/jogo.js';
import { som } from './src/som.js';
import { texto, fonteTexto, fonteSerif } from './src/janela.js';

const IMAGENS = [
  'tiles/iA2', 'tiles/iA4', 'tiles/iA5', 'tiles/iB', 'tiles/iC',
  'tiles/dA2', 'tiles/dA4', 'tiles/dA5', 'tiles/dB', 'tiles/dC',
  'tiles/mA2', 'tiles/mA4', 'tiles/mA5', 'tiles/mD', 'tiles/mE', 'tiles/xA',
  'pics/iconset', 'pics/carta',
  'chars/m03a', 'chars/m03b', 'chars/m03d', 'chars/m04a', 'chars/m06a', 'chars/r0281', 'chars/vOther3', 'chars/vDoor3',
];

const canvas = document.getElementById('tela');
const g = canvas.getContext('2d');

// O canvas ocupa a tela toda, na resolução real do aparelho (até 2x, para não pesar no celular).
// O mundo mostra no mínimo a área do jogo original (17x13 tiles) e usa o resto da tela para mostrar
// mais mapa. No toque, em pé, desconta a faixa dos controles (o padding do body); deitado, a tela
// usa tudo e os controles ficam por cima, dos lados (e os textos desviam deles).
function ajustar() {
  const b = document.body;
  const toque = b.classList.contains('toque');
  const deitado = innerWidth > innerHeight;
  b.classList.toggle('retrato', toque && !deitado);
  b.classList.toggle('paisagem', toque && deitado);
  const cs = getComputedStyle(b);
  const w = Math.floor(innerWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight));
  const h = Math.floor(innerHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom));
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  // a gravação de vídeo (?gravar) usa sempre a tela original, para sair igual em qualquer máquina
  if (gravacao.ativa) definirTela(544, 416, 1, 0);
  else definirTela(w, h, dpr, toque && deitado ? 172 : 0);
  canvas.style.width = `${TELA.w}px`;
  canvas.style.height = `${TELA.h}px`;
  const bw = Math.round(TELA.w * dpr), bh = Math.round(TELA.h * dpr);
  if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; }
  g.imageSmoothingEnabled = false;
}
addEventListener('resize', ajustar);
addEventListener('orientationchange', () => setTimeout(ajustar, 200));
ajustar();
let naTitulo = true;

const params = new URLSearchParams(location.search);

async function iniciar() {
  await carregar(IMAGENS, (p) => {
    g.setTransform(TELA.dpr, 0, 0, TELA.dpr, 0, 0);
    const w = Math.min(320, TELA.w * 0.6), x = (TELA.w - w) / 2, y = Math.round(TELA.h * 0.72);
    g.fillStyle = '#000'; g.fillRect(0, 0, TELA.w, TELA.h);
    g.fillStyle = '#444'; g.fillRect(x, y, w, 2);
    g.fillStyle = '#bbb'; g.fillRect(x, y, w * p, 2);
  });
  document.getElementById('carga')?.remove();
  const jogo = new Jogo(canvas);
  window.__insonia = jogo;
  if (gravacao.ativa) window.__entrada = entrada;   // o gravador de vídeo aperta as teclas por aqui

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
  let sel = 0, t = 0, escolhido = null, somTitulo = false;
  rodarLaco(() => {
    if (escolhido === null) {
      t++;
      // o ambiente do título começa no primeiro gesto (antes disso o navegador não deixa tocar)
      if (!somTitulo && som.pronto()) { somTitulo = true; som.mapa('titulo'); }
      if (entrada.disparou('mudo')) jogo.avisarMudo();
      if (jogo.recado && --jogo.recado.t <= 0) jogo.recado = null;
      if (entrada.repetiu('baixo') || entrada.repetiu('cima')) { sel = (sel + 1) % opcoes.length; som.destravar(); som.cursor(); }
      if (entrada.disparou('ok')) {
        som.destravar(); som.ok();
        escolhido = opcoes[sel];
        naTitulo = false;
        if (escolhido === 'Continuar') jogo.continuar();
        else { try { localStorage.removeItem('insonia.save'); } catch { /* */ } jogo.carregar('cela', 9, 7, 'cima'); }
        som.ambiente(1);
      }
      entrada.fimDoQuadro();
      return;
    }
    jogo.atualizar();
  }, () => {
    if (escolhido !== null) { jogo.desenhar(); return; }
    // tela de título em px CSS: tudo escala com o tamanho do texto da tela (TELA.f)
    const W = TELA.w, H = TELA.h, f = TELA.f;
    g.setTransform(TELA.dpr, 0, 0, TELA.dpr, 0, 0);
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    g.globalAlpha = Math.min(1, t / 90);
    const ft = Math.round(Math.min(f * 3.4, (W - 2 * TELA.mx) / 6));
    const yT = Math.round(H * 0.3);
    texto(g, 'Insônia', W / 2, yT, '#cfcfcf', `${ft}px Georgia, "Times New Roman", serif`, 'center');
    texto(g, 'O medo do desconhecido', W / 2, yT + ft * 1.3, '#8a8a8a', fonteSerif(Math.round(f * 1.05)), 'center');
    const fo = fonteTexto(Math.round(f * 1.1)), lo = Math.round(f * 1.9);
    g.font = fo;
    const wo = Math.max(...opcoes.map((o) => g.measureText('> ' + o).width));
    const yO = Math.round(Math.max(yT + ft * 1.3 + f * 3, H * 0.6));
    opcoes.forEach((o, i) => texto(g, (i === sel ? '> ' : '  ') + o, (W - wo) / 2, yO + i * lo, i === sel ? '#e6e6e6' : '#7a7a7a', fo));
    const toque = document.body.classList.contains('toque');
    const dica = toque
      ? 'Direcional: andar · OK: ação · Esc: cancelar · I: inventário'
      : 'Setas ou WASD: andar · Shift: correr · Enter: ação · Esc: cancelar · I: inventário · M: som';
    const fd = fonteTexto(Math.max(12, Math.round(f * 0.62)));
    const ld = quebrarDica(dica, W - 2 * Math.max(16, TELA.mx), fd);
    ld.forEach((l, i) => texto(g, l, W / 2, H - f * 1.4 - (ld.length - 1 - i) * f, '#5a5a5a', fd, 'center'));
    g.globalAlpha = 1;
    jogo.desenharRecado(g);
    g.setTransform(1, 0, 0, 1, 0, 0);
  });
}

// A dica dos controles quebra entre os itens (" · "), nunca no meio de um.
function quebrarDica(s, maxW, fonte) {
  g.font = fonte;
  const out = [];
  let linha = '';
  for (const p of s.split(' · ')) {
    const t = linha ? linha + ' · ' + p : p;
    if (linha && g.measureText(t).width > maxW) { out.push(linha); linha = p; } else linha = t;
  }
  out.push(linha);
  return out;
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

// Tocar na tela (ou clicar com o mouse) vale OK enquanto há texto aberto (falas, escolhas,
// avisos, narração, título), para não interagir com o cenário sem querer.
canvas.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
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
