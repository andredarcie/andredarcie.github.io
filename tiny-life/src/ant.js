import {
  RUN, PAUSE, PIVOT,
  TURN, HOME_TURN, DRIFT_DECAY,
  SENSE_ANGLE, LOOK_AHEAD, TRAIL_LIFE, ANT_SIZE
} from './config.js';
import { rand, clamp, angDiff, coin, TAU } from './math.js';

/**
 * Uma formiga. Só sabe andar, cheirar e reagir — quem diz o que é comida, o que
 * é ninho e o que é chão é o mundo, passado em `step`.
 *
 * O andar é run-and-tumble com balanço de corpo: o rumo pretendido (`course`) é
 * separado da cabeça (`head`), e ela anda e cheira pela cabeça. É isso que faz
 * ela costurar a borda da trilha em vez de correr colada no centro.
 *
 * O genoma é lido uma única vez, no nascimento: daí em diante ela carrega o
 * fenótipo em campos simples, e o laço quente não toca em getter nenhum.
 */
export class Ant {
  constructor(x, y, course, genome) {
    this.x = x;
    this.y = y;
    this.course = course;
    this.head = course;
    this.sway = rand(0, TAU);
    this.drift = 0;                 // ruído de rumo com memória
    this.bias = rand(-0.9, 0.9);    // lado pro qual ela tende a curvar buscando
    this.biasT = rand(1, 4);
    this.speed = 0;

    // --- fenótipo, expresso uma vez ---
    this.genome = genome;
    this.cruise = genome.pace;
    this.life = genome.span;
    this.sense = genome.senseDist;
    this.gain = genome.trailGain;
    this.roam = genome.roam;
    this.markRate = genome.mark;
    this.zeal = genome.zeal;
    this.size = ANT_SIZE * genome.build;
    this.gait = RUN;
    this.gaitT = rand(0.2, 0.9);
    this.turnRate = 0;
    this.conf = 0;                  // o quanto ela sente a trilha (suavizado)
    this.touchCd = rand(0, 1.5);
    this.carrying = false;
    this.since = 0;                 // s desde que saiu do ninho / pegou comida
    this.age = 0;
  }

  get dead() {
    return this.age > this.life;
  }

  /** Encontrou outra formiga: trava um instante, antena e segue. */
  greet() {
    this.gait = PAUSE;
    this.gaitT = rand(0.05, 0.16);
    this.touchCd = rand(0.6, 2.2);
  }

  step(dt, world) {
    this.age += dt;
    this.since += dt;
    this.touchCd -= dt;
    this.gaitT -= dt;
    this.biasT -= dt;

    if (this.gaitT <= 0) this.#pickGait();
    if (this.biasT <= 0) { this.bias = rand(-0.9, 0.9); this.biasT = rand(1.5, 5); }

    const guide = this.carrying ? world.home : world.food;
    const [sc, sl, sr] = this.#smell(guide);
    const raw = Math.max(0, sc, sl, sr);

    this.#maybeUTurn(raw);
    this.conf += (Math.min(1, raw) - this.conf) * Math.min(1, dt * 5);

    if (this.gait === PIVOT) {
      this.course += this.turnRate * dt;
    } else {
      this.#wander(dt);
      this.#followTrail(sc, sl, sr, dt);
      if (this.carrying) this.#headHome(world.nest, dt);
    }

    this.#avoidGrass(world.terrain, dt);
    this.#swayBody(dt);
    this.#accelerate(dt);
    this.#layTrail(dt, this.carrying ? world.food : world.home);
    this.#move(dt, world.terrain);

    if (this.carrying) {
      if (world.tryDeliver(this)) this.#setLoad(false, 0.15, 0.45, 0.3);
    } else if (world.tryTakeFood(this)) {
      this.#setLoad(true, 0.25, 0.6, 0.2);
    }
  }

  // Alterna corrida <-> (parada curta | virada seca). Quem carrega comida corre
  // mais tempo seguido e vira menos: está com pressa e sabe pra onde vai.
  #pickGait() {
    if (this.gait === RUN) {
      if (coin(this.carrying ? 0.2 : 0.45)) {
        this.gait = PAUSE;
        this.gaitT = rand(0.05, this.carrying ? 0.2 : 0.4);
      } else {
        this.gait = PIVOT;
        this.gaitT = rand(0.08, 0.2);
        const spread = this.carrying ? 0.55 : 1.3;
        this.turnRate = rand(-spread, spread) / this.gaitT;
      }
    } else {
      this.gait = RUN;
      this.gaitT = (this.carrying ? rand(0.5, 1.8) : rand(0.2, 1.1)) * this.zeal;
    }
  }

  // Três sensores presos à cabeça, que balança: é a varredura das antenas.
  #smell(field) {
    const d = this.sense;
    const l = this.head - SENSE_ANGLE, r = this.head + SENSE_ANGLE;
    return [
      field.sample(this.x + Math.cos(this.head) * d, this.y + Math.sin(this.head) * d),
      field.sample(this.x + Math.cos(l) * d, this.y + Math.sin(l) * d),
      field.sample(this.x + Math.cos(r) * d, this.y + Math.sin(r) * d)
    ];
  }

  // Perdeu a trilha de repente: meia-volta rápida procurando o rastro, igual
  // formiga de verdade quando o caminho some.
  #maybeUTurn(raw) {
    if (this.conf > 0.22 && raw < 0.05 && this.gait !== PIVOT && coin(0.6)) {
      this.gait = PIVOT;
      this.gaitT = 0.18;
      this.turnRate = (coin() ? -1 : 1) * rand(2, 3) / this.gaitT;
    }
  }

  // Ruído de rumo com memória (Ornstein-Uhlenbeck): gera curvas inteiras em vez
  // do tremor de um sorteio novo a cada quadro.
  #wander(dt) {
    this.drift += -this.drift * DRIFT_DECAY * dt + (Math.random() - 0.5) * this.roam * Math.sqrt(dt);
    this.course += this.drift * dt * (this.carrying ? 0.45 : 1);

    // Sem trilha nenhuma, ela varre a área em arcos largos para o mesmo lado.
    if (!this.carrying && this.conf < 0.12) this.course += this.bias * dt;
  }

  #followTrail(sc, sl, sr, dt) {
    if (sc >= sl && sc >= sr) return;
    const diff = sr - sl;
    this.course += Math.sign(diff) * Math.min(1, Math.abs(diff) * 5) * TURN * this.gain * dt;
  }

  // Carregada, ela tem uma noção fraca de onde fica o ninho (senão se perde).
  #headHome(nest, dt) {
    const dx = nest.x - this.x, dy = nest.y - this.y;
    const near = dx * dx + dy * dy < 8100;
    this.#steer(Math.atan2(dy, dx), HOME_TURN * (near ? 2.2 : 1), dt);
  }

  // A grama é parede: ela sente o mato à frente e vira antes de encostar, o que
  // a faz correr rente à borda em vez de quicar nela.
  #avoidGrass(terrain, dt) {
    const d = LOOK_AHEAD;
    if (terrain.valueAt(this.x + Math.cos(this.course) * d, this.y + Math.sin(this.course) * d) > 0.03) return;
    const l = this.course - 1.15, r = this.course + 1.15;
    const dl = terrain.valueAt(this.x + Math.cos(l) * d, this.y + Math.sin(l) * d);
    const dr = terrain.valueAt(this.x + Math.cos(r) * d, this.y + Math.sin(r) * d);
    this.#steer(dl > dr ? l : r, 6, dt);
  }

  // Balanço do corpo a cada passo; some conforme ela confia na trilha.
  #swayBody(dt) {
    const amp = (this.carrying ? 0.2 : 0.46) * (1 - 0.45 * this.conf);
    this.sway += (3 + this.speed * 0.16) * dt;
    this.head = this.course + Math.sin(this.sway) * amp;
  }

  // Parada, virada e corrida têm passos diferentes, e ninguém sai do zero pro
  // máximo num quadro.
  #accelerate(dt) {
    let want;
    if (this.gait === PAUSE) want = 0;
    else if (this.gait === PIVOT) want = this.cruise * 0.3;
    else want = this.cruise * (0.72 + 0.4 * this.conf);
    if (this.carrying) want *= 0.86;
    this.speed += (want - this.speed) * Math.min(1, dt * 10);
  }

  // Rastro proporcional ao quanto ela andou: formiga parada não empoça
  // feromônio. A força cai com o tempo desde o último evento, o que evita que
  // uma formiga perdida há minutos desenhe uma trilha forte pro nada.
  #layTrail(dt, field) {
    const strength = Math.max(0, 1 - this.since / TRAIL_LIFE)
      * Math.min(1, this.speed / 28) * dt * this.markRate;
    if (strength > 0) field.deposit(this.x, this.y, strength);
  }

  // Só anda se o passo cair na terra; senão trava e desvia, como quem esbarrou
  // num tufo de capim.
  #move(dt, terrain) {
    const nx = this.x + Math.cos(this.head) * this.speed * dt;
    const ny = this.y + Math.sin(this.head) * this.speed * dt;
    if (terrain.valueAt(nx, ny) > 0) {
      this.x = nx;
      this.y = ny;
    } else {
      this.speed *= 0.35;
      this.course += (coin() ? -1 : 1) * rand(0.7, 1.7);
    }
  }

  #setLoad(carrying, minPause, maxPause, brake) {
    this.carrying = carrying;
    this.since = 0;
    this.conf = 0;
    this.course += Math.PI + rand(-0.6, 0.6);
    this.gait = PAUSE;
    this.gaitT = rand(minPause, maxPause);
    this.speed *= brake;
  }

  #steer(target, rate, dt) {
    const max = rate * dt;
    this.course += clamp(angDiff(target - this.course), -max, max);
  }
}
