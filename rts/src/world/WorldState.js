// Tudo o que existe no mundo num dado instante. Os sistemas leem e escrevem aqui;
// ninguém guarda cópia, então quem troca uma lista (filter) troca para todos.
export class WorldState {
  constructor() {
    // Unidades vivas dos dois times. O nome "organisms" ficou porque a cena, o
    // sangue e a transparência de quem tapa leem esta lista.
    this.organisms = [];
    this.buildings = [];
    this.teams = {};
    this.grass = [];
    this.grassRegrow = [];
    this.ponds = [];
    this.corpses = [];
    this.trees = [];
    // Enfeites fixos do chão (pedra, cacto, arbusto): não fazem nada na simulação,
    // mas ocupam lugar, e ninguém pode nascer em cima deles.
    this.scenery = [];
    // Clareiras guardadas para as bases: nada de cenário nasce nelas.
    this.reserved = [];
    this.logs = [];
    this.woodChips = [];
    this.fallDust = [];
    // Sangue: gotas no ar e manchas no chão (BloodSystem).
    this.bloodDrops = [];
    this.bloodStains = [];
    // Marcas de ordem no chão (onde o jogador mandou ir/atacar), que somem sozinhas.
    this.pings = [];
    this.rain = null;
    this.rainEvents = 0;
    // Quem venceu ('player' | 'enemy'), quando a partida acaba.
    this.winner = null;
    // Segundos de simulação desde o início.
    this.elapsed = 0;
    this.nextId = 1;
  }

  // Cabanas (sede e casas) e fogueiras de guerra: as listas que os renderizadores,
  // o capim e o SpaceOccupancy já conheciam.
  get huts() {
    return this.buildings.filter(b => b.isHut);
  }

  get campfires() {
    return this.buildings.filter(b => !b.isHut);
  }

  newId() {
    return this.nextId++;
  }
}
