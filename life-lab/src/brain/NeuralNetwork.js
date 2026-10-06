import { BRAIN_INPUT_COUNT, BRAIN_OUTPUT_COUNT, BIAS_NODE, FIRST_OUTPUT_NODE } from '../config/brain.js';

// A rede de um bicho já montada para rodar: o genoma não muda durante a vida, então
// a ordem de cálculo (topológica) é resolvida uma vez só, no nascimento.
export class NeuralNetwork {
  #order;
  #incoming;
  #values = new Map();

  constructor(genome) {
    const active = genome.conns.filter(c => c.enabled);
    this.#incoming = new Map();
    for (const c of active) {
      if (!this.#incoming.has(c.to)) this.#incoming.set(c.to, []);
      this.#incoming.get(c.to).push(c);
    }
    this.#order = NeuralNetwork.#topologicalOrder(genome, active);
  }

  // Entradas → saídas, cada neurônio com tanh. Devolve as saídas e guarda o valor
  // de cada neurônio para a ficha desenhar a rede acesa.
  activate(inputs) {
    const values = this.#values;
    values.clear();
    for (let i = 0; i < BRAIN_INPUT_COUNT; i++) values.set(i, inputs[i] ?? 0);
    values.set(BIAS_NODE, 1);
    for (const node of this.#order) {
      let sum = 0;
      for (const c of this.#incoming.get(node) ?? []) sum += (values.get(c.from) ?? 0) * c.w;
      values.set(node, Math.tanh(sum));
    }
    const outputs = [];
    for (let o = 0; o < BRAIN_OUTPUT_COUNT; o++) outputs.push(values.get(FIRST_OUTPUT_NODE + o) ?? 0);
    return outputs;
  }

  valueOf(node) {
    return this.#values.get(node) ?? 0;
  }

  // Ocultos e saídas em ordem: cada neurônio só depois de tudo que chega nele.
  static #topologicalOrder(genome, active) {
    const nodes = [...genome.hidden];
    for (let o = 0; o < BRAIN_OUTPUT_COUNT; o++) nodes.push(FIRST_OUTPUT_NODE + o);
    const pending = new Map(nodes.map(n => [n, 0]));
    const outgoing = new Map();
    for (const c of active) {
      if (!pending.has(c.to)) continue;
      if (pending.has(c.from)) pending.set(c.to, pending.get(c.to) + 1);
      if (!outgoing.has(c.from)) outgoing.set(c.from, []);
      outgoing.get(c.from).push(c.to);
    }
    const ready = nodes.filter(n => pending.get(n) === 0), order = [];
    while (ready.length) {
      const node = ready.shift();
      order.push(node);
      for (const to of outgoing.get(node) ?? []) {
        pending.set(to, pending.get(to) - 1);
        if (pending.get(to) === 0) ready.push(to);
      }
    }
    return order;
  }
}
