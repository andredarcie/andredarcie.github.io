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

iniciar({ build: BUILD, $, status, esperarClique, mensagem, mostrarAviso }).catch((e) => {
  console.error(e);
  mostrarAviso(`Falha ao iniciar: ${e.message ?? e}`, false);
  status('');
});
