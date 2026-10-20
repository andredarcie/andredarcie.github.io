// Brian's Mansion na web: a página (botão Jogar, caixas de aviso, selo de
// build) e a partida do jogo, que é toda em JavaScript (src/boot.js).
import { iniciar } from './src/boot.js';

const BUILD = document.documentElement.dataset.build;

const $ = (s) => document.querySelector(s);
const status = (t) => { $('#status').textContent = t; };

function esperarClique() {
  const botao = $('#jogar');
  botao.hidden = false;
  botao.focus();
  return new Promise((resolver) => {
    const ir = () => { botao.hidden = true; resolver(); };
    botao.addEventListener('click', ir, { once: true });
  });
}

// Kernel#print do RGSS: caixa com OK que bloqueia o jogo até fechar.
function mensagem(texto) {
  return new Promise((resolver) => mostrarAviso(texto, true, resolver));
}

function mostrarAviso(texto, comOk, aoFechar, rotulo = 'OK') {
  const caixa = $('#aviso');
  caixa.querySelector('pre').textContent = texto;
  const ok = caixa.querySelector('button');
  ok.hidden = !comOk;
  ok.textContent = rotulo;
  caixa.hidden = false;
  if (comOk) {
    ok.focus();
    ok.onclick = () => { caixa.hidden = true; aoFechar?.(); };
  }
}

// Tela cheia (botão do controle de toque, ao lado do pausar). Só aparece se o
// navegador deixa (o Safari do iPhone não deixa a página em tela cheia). A
// API exige gesto do usuário, e no toque o pointerdown não conta como gesto:
// por isso o pedido vai no pointerup. O pointerdown não sobe até o #controle,
// que captura o dedo para o direcional.
function ligarTelaCheia() {
  const botao = $('#tela-cheia');
  const raiz = document.documentElement;
  const pedir = raiz.requestFullscreen ?? raiz.webkitRequestFullscreen;
  const sair = document.exitFullscreen ?? document.webkitExitFullscreen;
  if (!botao || !pedir || !(document.fullscreenEnabled ?? document.webkitFullscreenEnabled)) return;
  botao.hidden = false;
  const atual = () => document.fullscreenElement ?? document.webkitFullscreenElement;
  const marcar = () => botao.classList.toggle('ativa', !!atual());
  document.addEventListener('fullscreenchange', marcar);
  document.addEventListener('webkitfullscreenchange', marcar);
  botao.addEventListener('pointerdown', (e) => e.stopPropagation());
  botao.addEventListener('pointerup', (e) => {
    e.stopPropagation();
    if (atual()) sair.call(document);
    else Promise.resolve(pedir.call(raiz)).catch(() => {});
  });
}
ligarTelaCheia();

iniciar({ build: BUILD, $, status, esperarClique, mensagem, mostrarAviso }).catch((e) => {
  console.error(e);
  mostrarAviso(`Falha ao iniciar: ${e.message ?? e}`, false);
  status('');
});
