import { LAY_INTERVAL, QUEEN_SPEED, CHAMBER_R } from './config.js';
import { rand, coin, angDiff, clamp, TAU } from './math.js';

/**
 * A rainha. Não forrageia, não sai da câmara de cria e não morre de velhice —
 * ela só anda um pouco e põe ovo.
 *
 * O ritmo da postura é dela; o recurso é da colônia. Por isso ela pergunta
 * `canLay()` antes e manda `layEgg()` depois, em vez de mexer no estoque.
 */
export class Queen {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.cx = 0;          // centro da câmara: ela orbita isso e não se afasta
    this.cy = 0;
    this.course = 0;
    this.speed = 0;
    this.layT = rand(LAY_INTERVAL[0], LAY_INTERVAL[1]);
    this.pauseT = 0;
  }

  moveTo(x, y) {
    this.cx = x;
    this.cy = y;
    this.x = x;
    this.y = y;
    this.course = Math.random() * TAU;
  }

  update(dt, colony) {
    this.#shuffle(dt);

    this.layT -= dt;
    if (this.layT > 0) return;

    // Sem comida guardada ou sem espaço no formigueiro, ela espera e tenta de
    // novo logo — o ritmo não reinicia inteiro por causa de uma falha.
    if (!colony.canLay()) {
      this.layT = 0.4;
      return;
    }
    colony.layEgg(this.x, this.y);
    this.layT = rand(LAY_INTERVAL[0], LAY_INTERVAL[1]);
  }

  // Rainha quase não anda: passos curtos, paradas longas, sempre voltando pro
  // meio da câmara.
  #shuffle(dt) {
    this.pauseT -= dt;
    if (this.pauseT <= 0) {
      this.pauseT = rand(0.6, 2.6);
      this.speed = coin(0.45) ? QUEEN_SPEED : 0;
      this.course += rand(-1.2, 1.2);
    }

    const dx = this.cx - this.x, dy = this.cy - this.y;
    if (dx * dx + dy * dy > CHAMBER_R * CHAMBER_R) {
      const back = Math.atan2(dy, dx);
      this.course += clamp(angDiff(back - this.course), -3 * dt, 3 * dt);
    }

    this.x += Math.cos(this.course) * this.speed * dt;
    this.y += Math.sin(this.course) * this.speed * dt;
  }
}
