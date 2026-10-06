import {
  BRAIN_INPUTS, BRAIN_OUTPUTS, BRAIN_INPUT_COUNT, BIAS_NODE, FIRST_OUTPUT_NODE
} from '../config/brain.js';

const SVG = 'http://www.w3.org/2000/svg';
const WIDTH = 340, ROW = 17, TOP = 12, LABEL = 82, NODE = 4.5;

// Desenho da rede neural de um bicho, como ela estava quando a ficha abriu:
// entradas à esquerda, saídas à direita e os neurônios ocultos no meio, em colunas
// pela profundidade. Ligação azul é peso positivo, coral é negativo, e a grossura
// é a força. O miolo do neurônio acende com o valor que ele teve na última pensada.
export class BrainDiagram {
  #svg;

  constructor(svg) {
    this.#svg = svg;
  }

  render(o) {
    const svg = this.#svg;
    svg.replaceChildren();
    const { genome, net } = o.mind;
    const inputs = [...BRAIN_INPUTS.map(input => input.label), 'bias'];
    const height = TOP * 2 + (inputs.length - 1) * ROW;
    svg.setAttribute('viewBox', `0 0 ${WIDTH} ${height}`);

    const position = new Map();
    inputs.forEach((_, i) => position.set(i, { x: LABEL, y: TOP + i * ROW }));
    const outputGap = (height - TOP * 2) / Math.max(1, BRAIN_OUTPUTS.length - 1);
    BRAIN_OUTPUTS.forEach((_, i) =>
      position.set(FIRST_OUTPUT_NODE + i, { x: WIDTH - LABEL, y: TOP + i * outputGap }));
    const depth = BrainDiagram.#depths(genome);
    const deepest = Math.max(1, ...genome.hidden.map(node => depth.get(node) ?? 1));
    const columns = new Map();
    for (const node of genome.hidden) {
      const level = depth.get(node) ?? 1;
      if (!columns.has(level)) columns.set(level, []);
      columns.get(level).push(node);
    }
    for (const [level, nodes] of columns) {
      const x = LABEL + (WIDTH - LABEL * 2) * level / (deepest + 1);
      nodes.forEach((node, i) =>
        position.set(node, { x, y: TOP + (height - TOP * 2) * (i + 1) / (nodes.length + 1) }));
    }

    for (const c of genome.conns) {
      if (!c.enabled) continue;
      const from = position.get(c.from), to = position.get(c.to);
      if (!from || !to) continue;
      const line = BrainDiagram.#element('line', {
        x1: from.x, y1: from.y, x2: to.x, y2: to.y,
        class: c.w >= 0 ? 'brain-link is-positive' : 'brain-link is-negative',
        'stroke-width': (.4 + Math.min(3, Math.abs(c.w)) * .7).toFixed(2)
      });
      svg.append(line);
    }
    for (const [node, { x, y }] of position) {
      const value = node === BIAS_NODE ? 1 : net.valueOf(node);
      svg.append(BrainDiagram.#element('circle', {
        cx: x, cy: y, r: NODE,
        class: value >= 0 ? 'brain-node is-positive' : 'brain-node is-negative',
        'fill-opacity': Math.min(1, Math.abs(value)).toFixed(2)
      }));
    }
    inputs.forEach((label, i) => svg.append(BrainDiagram.#label(label, LABEL - 8, TOP + i * ROW, 'end')));
    BRAIN_OUTPUTS.forEach((output, i) =>
      svg.append(BrainDiagram.#label(output.label, WIDTH - LABEL + 8, TOP + i * outputGap, 'start')));
  }

  // Profundidade de cada neurônio oculto: o caminho mais longo desde uma entrada.
  static #depths(genome) {
    const depth = new Map();
    for (let i = 0; i <= BIAS_NODE; i++) depth.set(i, 0);
    const active = genome.conns.filter(c => c.enabled);
    for (let pass = 0; pass < genome.hidden.length + 1; pass++) {
      for (const c of active) {
        if (c.to < FIRST_OUTPUT_NODE + BRAIN_OUTPUTS.length) continue;
        const next = (depth.get(c.from) ?? (c.from < BRAIN_INPUT_COUNT ? 0 : 1)) + 1;
        if (next > (depth.get(c.to) ?? 0)) depth.set(c.to, next);
      }
    }
    return depth;
  }

  static #label(text, x, y, anchor) {
    const label = BrainDiagram.#element('text', {
      x, y, 'text-anchor': anchor, 'dominant-baseline': 'middle', class: 'brain-label'
    });
    label.textContent = text;
    return label;
  }

  static #element(name, attributes) {
    const element = document.createElementNS(SVG, name);
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
    return element;
  }
}
