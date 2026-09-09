import {
  NEST_R, TAU_HOME, TAU_FOOD, MIN_FOODS, MAX_FOODS,
  POP_PER_PX, POP_RANGE, GRASS_MARGIN, GRASS_MARGIN_RANGE,
  GRID_CELL, GRID_CELL_BIG, BIG_SCREEN
} from './config.js';
import { rand, clamp, TAU } from './math.js';
import { PheromoneField } from './pheromone-field.js';
import { TerrainShape } from './terrain-shape.js';
import { Ground } from './ground.js';
import { FoodSource } from './food-source.js';
import { Colony } from './colony.js';

/**
 * O mundo: junta terreno, feromônios, comida e colônia, e responde as perguntas
 * que uma formiga faz ao ambiente ("cheguei no ninho?", "tem comida aqui?").
 *
 * É a única peça que conhece todas as outras. Em compensação, ninguém conhece
 * ela: a formiga recebe o mundo por parâmetro e o renderizador só lê.
 */
export class World {
  constructor() {
    this.width = 0;
    this.height = 0;
    this.cell = GRID_CELL;
    this.cols = 0;
    this.rows = 0;

    this.nest = { x: 0, y: 0 };
    this.terrain = new TerrainShape();
    this.ground = new Ground();
    this.home = null;   // trilha deixada por quem procura -> caminho de volta
    this.food = null;   // trilha deixada por quem carrega -> caminho da comida
    this.foods = [];
    this.colony = new Colony(this.nest);
    this.foodTimer = 0;
  }

  resize(width, height) {
    this.width = width;
    this.height = height;

    // Telas enormes ganham células maiores para o borrão não pesar.
    this.cell = width * height > BIG_SCREEN ? GRID_CELL_BIG : GRID_CELL;
    this.cols = Math.ceil(width / this.cell);
    this.rows = Math.ceil(height / this.cell);

    this.home = new PheromoneField(this.cols, this.rows, this.cell, TAU_HOME);
    this.food = new PheromoneField(this.cols, this.rows, this.cell, TAU_FOOD);

    this.nest.x = width / 2;
    this.nest.y = height / 2;

    // Faixa de grama proporcional à tela: no celular ela não pode comer metade
    // do terreiro.
    const margin = clamp(Math.min(width, height) * GRASS_MARGIN,
      GRASS_MARGIN_RANGE[0], GRASS_MARGIN_RANGE[1]);
    this.terrain.build({
      cx: this.nest.x,
      cy: this.nest.y,
      rx: width / 2 - margin,
      ry: height / 2 - margin,
      cell: this.cell,
      cols: this.cols,
      rows: this.rows
    });
    this.ground.bake(this.terrain, this.nest, width, height);

    const cap = Math.round(clamp(this.terrain.area / POP_PER_PX, POP_RANGE[0], POP_RANGE[1]));
    this.colony.resize(width, height, cap);

    // Quem sobrou embaixo da grama depois do redimensionamento volta pro ninho.
    for (const ant of this.colony.ants) {
      if (!this.terrain.isDirt(ant.x, ant.y)) {
        ant.x = this.nest.x + rand(-8, 8);
        ant.y = this.nest.y + rand(-8, 8);
      }
    }
    this.foods = this.foods.filter((f) => this.terrain.valueAt(f.x, f.y) > 0.05);
  }

  reset() {
    this.home.clear();
    this.food.clear();
    this.foods = [];
    this.foodTimer = 0;
    this.colony.reset(Math.round(this.colony.popCap * 0.5));
    for (let i = 0; i < 4; i++) this.scatterFood();
  }

  update(dt) {
    this.home.step(dt);
    this.food.step(dt);
    this.colony.update(dt, this);
    this.#replenish(dt);
  }

  // --- regras que a formiga consulta ---------------------------------------

  tryDeliver(ant) {
    const dx = ant.x - this.nest.x, dy = ant.y - this.nest.y;
    if (dx * dx + dy * dy >= NEST_R * NEST_R) return false;
    this.colony.receive(ant);
    return true;
  }

  tryTakeFood(ant) {
    for (let i = 0; i < this.foods.length; i++) {
      const src = this.foods[i];
      if (!src.contains(ant.x, ant.y)) continue;
      src.take();
      if (src.empty) this.foods.splice(i, 1);
      return true;
    }
    return false;
  }

  // --- comida ---------------------------------------------------------------

  /** Larga comida num ponto qualquer, trazendo pra terra se cair no mato. */
  dropFood(x, y, amount = rand(150, 300)) {
    const [px, py] = this.terrain.pullInside(x, y, this.nest.x, this.nest.y);
    this.foods.push(new FoodSource(px, py, amount));
    this.#trim();
  }

  /** Escolhe sozinha um ponto de terra a uma distância razoável do ninho. */
  scatterFood() {
    const min = Math.min(this.width, this.height);
    for (let t = 0; t < 30; t++) {
      const th = Math.random() * TAU;
      const d = rand(min * 0.18, min * 0.46);
      const x = this.nest.x + Math.cos(th) * d;
      const y = this.nest.y + Math.sin(th) * d;
      if (this.terrain.valueAt(x, y) > 0.12) {
        this.foods.push(new FoodSource(x, y, rand(120, 260)));
        this.#trim();
        return;
      }
    }
    this.foods.push(new FoodSource(
      this.nest.x + rand(-40, 40), this.nest.y + rand(-40, 40), rand(120, 260)));
    this.#trim();
  }

  #replenish(dt) {
    this.foodTimer -= dt;
    if (this.foods.length < MIN_FOODS && this.foodTimer <= 0) {
      this.scatterFood();
      this.foodTimer = rand(2, 6);
    }
  }

  #trim() {
    if (this.foods.length > MAX_FOODS + 4) this.foods.shift();
  }
}
