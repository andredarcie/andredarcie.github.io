// Teclado ou toque: decide que botões os textos do jogo mostram (Enter/Shift
// ou A/Correr do controle na tela). Começa pelo tipo de tela (o mesmo
// `pointer: coarse` que mostra o controle no index.html) e muda com o uso:
// uma tecla vira teclado; um toque vira toque (notebook com tela de toque).

let toque = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;

if (typeof addEventListener === 'function') {
  addEventListener('keydown', () => { toque = false; }, true);
  addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') toque = true; }, true);
}

export const modoToque = () => toque;

// os nomes dos botões em cada modo
export const botoes = () => (toque
  ? { acao: 'A', correr: 'Correr', mover: 'o direcional' }
  : { acao: 'Enter', correr: 'Shift', mover: 'as setas do teclado' });
