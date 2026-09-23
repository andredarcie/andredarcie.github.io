// Interface: câmera de acontecimentos, passeio da câmera e tratamento de erro.

// Câmera de acontecimentos: nascimento, morte e cabana pronta aparecem numa janela
// com zoom no canto. A duração é em tempo real, para dar para ver mesmo com a
// simulação acelerada.
export const EVENT_CAM_SECONDS = 7;
export const EVENT_CAM_SPAN = Object.freeze({ birth: 38, death: 42, hut: 62 });
export const EVENT_KIND_LABEL = Object.freeze({ birth: 'nascimento', death: 'morte', hut: 'cabana' });

// Câmera no teclado, como nos jogos de estratégia: sentido em pixels de tela.
export const PAN_KEYS = Object.freeze({
  ArrowUp: [0, -1], KeyW: [0, -1],
  ArrowDown: [0, 1], KeyS: [0, 1],
  ArrowLeft: [-1, 0], KeyA: [-1, 0],
  ArrowRight: [1, 0], KeyD: [1, 0]
});
// Em pixels de tela por segundo. A ilha tem pouco mais que uma tela de largura,
// então o passeio útil é curto e velocidade alta só serve para perder o alvo.
export const PAN_SPEED = 450;
// Até alguns pixels de folga o gesto ainda conta como toque, senão tremer o dedo
// ao tocar para criar um bicho viraria passeio.
export const DRAG_THRESHOLD = 6;

export const FRAME_ERROR_LIMIT = 120;
// Poeira de terra seca levantada pela árvore caindo.
export const DUST_COLOR = '#cdbd92';
