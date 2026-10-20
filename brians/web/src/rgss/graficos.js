// Graphics do RGSS2: ritmo fixo de quadros (frame_rate, padrão 60),
// freeze/transition (com imagem de transição opcional), brilho e snap_to_bitmap.
// Atrasado (rAF a 30 Hz no modo de economia de bateria, aparelho fraco), pula
// o desenho e roda o quadro de lógica seguinte na hora, como o RPG Maker faz
// no PC: o jogo mantém a velocidade e só fica menos fluido.
import { Bitmap } from './bitmap.js';

const MAX_PULOS = 4; // quadros sem desenho seguidos, no máximo

export class Graficos {
  constructor(renderizador, aoQuadro) {
    this.r = renderizador;
    this.aoQuadro = aoQuadro; // trabalho de fundo por quadro (persistência etc.)
    this.congelado = false;
    this.alvoTempo = performance.now();
    this.quadros = 0;
    this.pulando = false;
    this.pulados = 0;
  }

  // Graphics.update: desenha o quadro e espera o próximo instante do ritmo.
  async atualizar(brilho, taxa) {
    // o instante do próximo quadro já passou: não desenha este, e esperar()
    // devolve na hora
    this.pulando = !this.semTela && !this.turbo && this.pulados < MAX_PULOS &&
      performance.now() >= this.alvoTempo + 1000 / Math.max(1, taxa);
    this.pulados = this.pulando ? this.pulados + 1 : 0;
    if (this.semTela || this.pulando) { /* replay sem imagem ou atrasado: só a lógica */ }
    else if (this.congelado) this.r.copiar(this.r.congelada, null, brilho);
    else {
      this.r.desenharCena(this.r.tela);
      this.r.copiar(this.r.tela, null, brilho);
    }
    await this.esperar(taxa, [brilho, this.congelado]);
  }

  // extra: o que define o quadro além da cena (brilho, congelado, passo da transição)
  esperar(taxa, extra) {
    this.rastro?.quadro(extra);
    // Replay chegou ao fim: o jogo para aqui, com o estado do último quadro.
    if (this.rastro?.parado) return new Promise(() => {});
    this.quadros++;
    if (this.quadros % 120 === 0) this.r.limparTexturas();
    this.aoQuadro?.(this.quadros);
    // Depuração: __brians.graficos.turbo = true roda sem esperar o relógio.
    if (this.turbo) return new Promise((resolver) => setTimeout(resolver, 0));
    const duracao = 1000 / Math.max(1, taxa);
    const agora = performance.now();
    this.alvoTempo += duracao;
    // Atrasou demais (aba em segundo plano, engasgo): não tenta "alcançar".
    if (agora - this.alvoTempo > 100) this.alvoTempo = agora;
    if (this.pulando) { this.pulando = false; return Promise.resolve(); }
    return new Promise((resolver) => {
      const tique = (t) => {
        if (t >= this.alvoTempo - 2) resolver();
        else requestAnimationFrame(tique);
      };
      requestAnimationFrame(tique);
    });
  }

  // Graphics.freeze: guarda a última imagem mostrada.
  congelar() {
    this.r.copiar(this.r.tela, this.r.congelada);
    this.congelado = true;
  }

  // Graphics.transition: um quadro por passo, da imagem congelada para a cena atual.
  async transicao(duracao, nomeArquivo, vague, brilho, taxa) {
    if (!this.congelado) return;
    if (!this.semTela) {
      this.r.desenharCena(this.r.nova);
      this.r.copiar(this.r.nova, this.r.tela);
    }
    let mapa = null;
    if (nomeArquivo) mapa = await Bitmap.carregar(nomeArquivo);
    for (let i = 1; i <= duracao; i++) {
      if (!this.semTela) this.r.transicao(this.r.congelada, this.r.nova, mapa, i / duracao, vague, brilho);
      await this.esperar(taxa, [brilho, 'transicao', i, duracao, nomeArquivo, vague]);
    }
    this.congelado = false;
  }

  // Graphics.snap_to_bitmap
  capturar() {
    this.r.desenharCena(this.r.nova);
    const px = this.r.lerTela(this.r.nova);
    const bmp = new Bitmap(this.r.largura, this.r.altura);
    bmp.ctx.putImageData(new ImageData(px, this.r.largura, this.r.altura), 0, 0);
    bmp.mudou();
    // rastro: o conteúdo da captura é a cena que ela fotografou
    if (this.rastro) bmp.conteudoRastro = this.rastro.conteudoCaptura();
    return bmp;
  }
}
