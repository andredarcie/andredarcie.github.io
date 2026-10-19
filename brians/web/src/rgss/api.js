// A API do motor: tudo o que a fachada RGSS2 (src/rgss2/) pede ao motor
// (desenho, entrada, áudio). Só números, strings e objetos do motor cruzam.
import { Bitmap } from './bitmap.js';
import { Sprite, Plane, Viewport, Janela, Tilemap } from './objetos.js';

export function criarApi({ renderizador, graficos, entrada, audio, mensagem }) {
  return {
    // ------------------------------------------------------------ Bitmap
    novoBitmap: (w, h) => new Bitmap(w, h),
    carregarBitmap: (caminho) => Bitmap.carregar(caminho),
    textSize: (texto, nome, tamanho, negrito, italico) => Bitmap.textSize(texto, nome, tamanho, !!negrito, !!italico),

    // ------------------------------------------------------------ objetos de cena
    novoSprite: (vp) => new Sprite(vp),
    novoPlane: (vp) => new Plane(vp),
    novoViewport: () => new Viewport(),
    novaJanela: (vp) => new Janela(vp),
    novoTilemap: (vp) => new Tilemap(vp),

    // ------------------------------------------------------------ Graphics
    atualizarGraficos: (brilho, taxa) => graficos.atualizar(brilho, taxa),
    congelar: () => graficos.congelar(),
    transicao: (duracao, arquivo, vague, brilho, taxa) => graficos.transicao(duracao, arquivo, vague, brilho, taxa),
    capturar: () => graficos.capturar(),
    redimensionarTela: (w, h) => renderizador.redimensionar(w, h),
    largura: () => renderizador.largura,
    altura: () => renderizador.altura,

    // ------------------------------------------------------------ Input
    atualizarEntrada: () => entrada.atualizar(),

    // ------------------------------------------------------------ Audio
    bgmPlay: (n, v, p) => audio.bgmPlay(n, v, p),
    bgmStop: () => audio.bgmStop(),
    bgmFade: (ms) => audio.bgmFade(ms),
    bgsPlay: (n, v, p) => audio.bgsPlay(n, v, p),
    bgsStop: () => audio.bgsStop(),
    bgsFade: (ms) => audio.bgsFade(ms),
    mePlay: (n, v, p) => audio.mePlay(n, v, p),
    meStop: () => audio.meStop(),
    meFade: (ms) => audio.meFade(ms),
    sePlay: (n, v, p) => audio.sePlay(n, v, p),
    seStop: () => audio.seStop(),

    // ------------------------------------------------------------ Kernel#print / p
    mensagem: (texto) => mensagem(String(texto)),
  };
}
