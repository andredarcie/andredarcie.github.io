// Tudo o que existe no mundo num dado instante. Os sistemas leem e escrevem aqui;
// ninguém guarda cópia, então quem troca uma lista (filter) troca para todos.
export class WorldState {
  constructor() {
    this.organisms = [];
    this.grass = [];
    this.grassRegrow = [];
    this.ponds = [];
    this.pairs = [];
    this.corpses = [];
    this.birthEffects = [];
    this.trees = [];
    // Enfeites fixos do chão (pedra, cacto, arbusto): não fazem nada na simulação,
    // mas ocupam lugar, e ninguém pode nascer em cima deles.
    this.scenery = [];
    this.logs = [];
    this.huts = [];
    this.campfires = [];
    this.woodChips = [];
    this.fallDust = [];
    this.socialBonds = new Map();
    this.rain = null;
    this.encounters = 0;
    this.births = 0;
    this.rainEvents = 0;
    // Segundos de simulação desde o início.
    this.elapsed = 0;
  }
}
