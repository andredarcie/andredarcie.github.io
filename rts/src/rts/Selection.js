// O que o jogador tem nas mãos agora: um grupo de unidades OU uma construção (dele
// ou do inimigo, só para ver), e a obra que está posicionando, se estiver.
export class Selection {
  constructor() {
    this.units = [];
    this.building = null;
    this.enemy = null;
    // Obra sendo posicionada ('house' | 'camp' | 'lodge') e onde o cursor está.
    this.placing = null;
    this.hover = null;
    // Muda a cada troca de seleção: o painel só se refaz quando ela muda.
    this.version = 0;
  }

  get empty() {
    return !this.units.length && !this.building && !this.enemy;
  }

  setUnits(units) {
    this.units = units;
    this.building = null;
    this.enemy = null;
    this.placing = null;
    this.version++;
  }

  setBuilding(building) {
    this.units = [];
    this.building = building;
    this.enemy = null;
    this.placing = null;
    this.version++;
  }

  // Unidade ou construção do inimigo: só a ficha, sem comandos.
  setEnemy(target) {
    this.units = [];
    this.building = null;
    this.enemy = target;
    this.placing = null;
    this.version++;
  }

  clear() {
    this.setUnits([]);
  }

  startPlacing(kind) {
    this.placing = kind;
    this.version++;
  }

  stopPlacing() {
    this.placing = null;
    this.version++;
  }

  // Tira quem morreu ou foi destruído.
  prune(state) {
    const alive = this.units.filter(u => u.life > 0 && state.organisms.includes(u));
    if (alive.length !== this.units.length) {
      this.units = alive;
      this.version++;
    }
    if (this.building && !state.buildings.includes(this.building)) {
      this.building = null;
      this.version++;
    }
    if (this.enemy && this.enemy.life <= 0) {
      this.enemy = null;
      this.version++;
    }
  }
}
