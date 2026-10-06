// A Chama Primordial. Ou está no chão (holder null), ou na mão de alguém; a posição
// acompanha quem a carrega.
export class PrimordialFlame {
  constructor({ x, y }) {
    this.x = x;
    this.y = y;
    this.holder = null;
    // Quantas vezes já trocou de mão, e desde quando está com quem tem agora.
    this.transfers = 0;
    this.heldSince = 0;
  }
}
