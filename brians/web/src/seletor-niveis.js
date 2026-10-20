// Seletor de fases para testar: só existe em localhost. Tecla I (ou o botão
// "Fases" no canto) abre um modal com as fases na ordem de uma partida
// linear (src/fases.js); escolher uma entra nela como se tivesse vindo
// jogando. O pedido fica pendente até o próximo Graphics.update, que o
// aplica (src/rastro-js.js).
import { FASES } from './fases.js';

export const LOCAL = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);

export function ligarSeletorNiveis({ entrada, graficos }) {
  const modal = document.querySelector('#niveis');
  const busca = modal.querySelector('input');
  const lista = modal.querySelector('ol');
  const aviso = modal.querySelector('.aviso');
  const abrirBotao = document.querySelector('#abrir-niveis');
  let pedido = '';
  let mapaAtual = 0;
  let linhas = [];   // botões visíveis, na ordem, para navegar com as setas
  let foco = 0;

  abrirBotao.hidden = false;
  abrirBotao.addEventListener('click', () => (modal.hidden ? abrir() : fechar()));
  modal.addEventListener('click', (e) => { if (e.target === modal) fechar(); });

  function abrir() {
    entrada.bloquear(true);
    modal.hidden = false;
    aviso.textContent = '';
    busca.value = '';
    desenhar();
    foco = Math.max(0, linhas.findIndex((b) => Number(b.dataset.mapa) === mapaAtual));
    focar();
    busca.focus();
  }

  function fechar() {
    modal.hidden = true;
    entrada.bloquear(false);
    document.activeElement?.blur();
  }

  function ir(botao) {
    pedido = botao.dataset.pedido;
    fechar();
  }

  function desenhar() {
    const termo = busca.value.trim().toLowerCase();
    lista.replaceChildren();
    linhas = [];
    FASES.forEach((f, i) => {
      if (termo && !`${i + 1} ${f.mapa} ${f.nome}`.toLowerCase().includes(termo)) return;
      const li = document.createElement('li');
      if (f.mapa === mapaAtual) li.classList.add('atual');
      const b = document.createElement('button');
      b.dataset.mapa = f.mapa;
      b.dataset.pedido = `fase,${i}`;
      b.title = f.origem ? `mapa ${f.mapa}, vindo do evento ${f.origem.ev} do mapa ${f.origem.mapa}` : `mapa ${f.mapa}, começo do jogo`;
      b.className = 'mapa';
      b.innerHTML = `<span class="id">${String(i + 1).padStart(2, '0')}</span> `;
      b.append(f.nome);
      b.addEventListener('click', () => ir(b));
      li.append(b);
      linhas.push(b);
      lista.append(li);
    });
    foco = Math.min(foco, Math.max(0, linhas.length - 1));
    focar();
  }

  function focar() {
    linhas.forEach((b, i) => b.classList.toggle('foco', i === foco));
    linhas[foco]?.scrollIntoView({ block: 'nearest' });
  }

  busca.addEventListener('input', () => { foco = 0; desenhar(); });

  // Tab segurado: acelera o jogo (esperas fixas de evento, como os tutoriais
  // de 5–8 s, que nem o Game.exe original deixa pular).
  const status = document.querySelector('#status');
  const acelerar = (sim) => {
    if (graficos.turbo === sim) return;
    graficos.turbo = sim;
    status.textContent = sim ? '▶▶ acelerado (Tab)' : '';
  };
  window.addEventListener('keyup', (e) => { if (e.code === 'Tab') acelerar(false); });
  window.addEventListener('blur', () => acelerar(false));

  window.addEventListener('keydown', (e) => {
    if (modal.hidden) {
      if (e.code === 'KeyI' && !e.repeat) { e.preventDefault(); abrir(); }
      if (e.code === 'Tab') { e.preventDefault(); acelerar(true); }
      return;
    }
    if (e.code === 'Escape') fechar();
    else if (e.code === 'ArrowDown' || e.code === 'ArrowRight') { foco = Math.min(foco + 1, linhas.length - 1); focar(); }
    else if (e.code === 'ArrowUp' || e.code === 'ArrowLeft') { foco = Math.max(foco - 1, 0); focar(); }
    else if (e.code === 'Enter' || e.code === 'NumpadEnter') { if (linhas[foco]) ir(linhas[foco]); }
    else return;
    e.preventDefault();
    e.stopPropagation(); // o Esc/Enter que fecha o modal não chega ao jogo
  }, true);

  return {
    // chamadas a cada quadro por src/rastro-js.js
    pegarPedidoNivel: () => { const p = pedido; pedido = ''; return p; },
    avisarMapa: (id) => { mapaAtual = Number(id); },
    avisarNivel: (texto) => { abrir(); aviso.textContent = String(texto); },
  };
}
