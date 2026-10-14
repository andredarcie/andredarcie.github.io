// Tudo o que existe no mundo num dado instante. Os sistemas leem e escrevem aqui;
// ninguém guarda cópia, então quem troca uma lista (filter) troca para todos.
export class WorldState {
  constructor() {
    // Unidades vivas da vila e dos invasores. O nome "organisms" ficou porque a cena, o
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
    // Chão guardado: a clareira da vila (só ao plantar o mundo) e as estradas, onde
    // nada nasce nem se constrói.
    this.reserved = [];
    this.logs = [];
    this.woodChips = [];
    this.fallDust = [];
    // Sangue: gotas no ar e manchas no chão (BloodSystem).
    this.bloodDrops = [];
    this.bloodStains = [];
    // Marcas de ordem no chão (onde o jogador mandou ir/atacar), que somem sozinhas.
    this.pings = [];
    // Balas das trincheiras no ar, tiros das armas de fogo (fumaça e risco), estouros
    // de bacamarte e de granada, e os "+6" de recompensa que sobem e somem.
    this.projectiles = [];
    this.shots = [];
    this.sparks = [];
    this.floaters = [];
    // A onda (WaveDirector): número, fase ('calm' | 'active'), relógio e a próxima.
    this.wave = null;
    // A reza do fim da tarde: segundos que ainda faltam (0 fora dela).
    this.vespers = 0;
    // Coisas que só acontecem uma vez por partida (o primeiro aviso de sede...).
    this.flags = {};
    this.rain = null;
    this.rainEvents = 0;
    // 'enemy' quando o Town Hall cai e a partida acaba.
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
    return this.buildings.filter(b => b.kind === 'camp');
  }

  get towers() {
    return this.buildings.filter(b => b.isTower);
  }

  newId() {
    return this.nextId++;
  }
}
