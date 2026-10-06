import {
  BRAIN_OUTPUT_COUNT, BIAS_NODE, FIRST_OUTPUT_NODE, HIDDEN_START,
  FOUNDER_WEIGHT, WEIGHT_MUTATION_RATE, WEIGHT_PERTURB_CHANCE, WEIGHT_PERTURB_STEP,
  WEIGHT_RESET_RANGE, WEIGHT_LIMIT, ADD_CONNECTION_RATE, ADD_NODE_RATE, TOGGLE_RATE,
  INHERIT_DISABLED_CHANCE, NO_CROSSOVER_RATE, COMPAT_DISJOINT, COMPAT_WEIGHT
} from '../config/brain.js';

// NEAT sem gerações fixas: não há laço de "avalia todos, escolhe os melhores". Quem
// escolhe é a ilha — o bicho que vive mais e acasala passa a rede adiante. Daqui
// sai o genoma da rede dos fundadores, a mistura de dois pais na concepção e as
// mutações de peso e de topologia.
//
// O genoma é { conns, hidden }: cada conexão tem número de inovação (a marca
// histórica do NEAT), origem, destino, peso e se está ligada; `hidden` lista os
// neurônios ocultos. A rede é sempre acíclica (feed-forward).
export class Neat {
  // "origem>destino" → número de inovação. A mesma ligação inventada em dois bichos
  // diferentes ganha o mesmo número, e é isso que alinha os genes no cruzamento.
  #innovations = new Map();
  #nextInnovation = 1;
  // Inovação da conexão partida → neurônio oculto que nasceu dela. Partir a mesma
  // conexão em qualquer bicho, em qualquer época, gera o mesmo neurônio.
  #splits = new Map();
  #nextNode = HIDDEN_START;

  // Rede mínima: toda entrada (e o bias) ligada direto a toda saída, pesos sorteados.
  founder() {
    const conns = [];
    for (let from = 0; from <= BIAS_NODE; from++) {
      for (let o = 0; o < BRAIN_OUTPUT_COUNT; o++) {
        const to = FIRST_OUTPUT_NODE + o;
        conns.push({
          innov: this.#innovation(from, to), from, to,
          w: (Math.random() * 2 - 1) * FOUNDER_WEIGHT, enabled: true
        });
      }
    }
    return { conns, hidden: [] };
  }

  // Concepção, como no artigo do NEAT: os genes com a mesma inovação vêm de um dos
  // pais por sorteio; os que só um tem (disjuntos e excedentes) vêm do pai mais apto,
  // e com aptidões iguais cada um passa com 50%. Depois, mutação.
  // Em NO_CROSSOVER_RATE dos casos não há mistura: vem a rede do mais apto inteira,
  // e intacta se ele é campeão de uma espécie grande (`champions`: 'father'/'mother').
  offspring(father, mother, fatherFitness = 0, motherFitness = 0, champions = []) {
    const tie = Math.abs(fatherFitness - motherFitness) < 1e-9;
    const fitter = tie ? (Math.random() < .5 ? 'father' : 'mother')
      : fatherFitness > motherFitness ? 'father' : 'mother';
    if (Math.random() < NO_CROSSOVER_RATE) {
      const parent = fitter === 'father' ? father : mother;
      const child = { conns: parent.conns.map(c => ({ ...c })), hidden: [...parent.hidden] };
      if (!champions.includes(fitter)) this.#mutate(child);
      return child;
    }
    const fromMother = new Map(mother.conns.map(c => [c.innov, c]));
    const fromFather = new Map(father.conns.map(c => [c.innov, c]));
    const innovations = [...new Set([...fromFather.keys(), ...fromMother.keys()])].sort((a, b) => a - b);
    const child = { conns: [], hidden: [] };
    for (const innov of innovations) {
      const a = fromFather.get(innov), b = fromMother.get(innov);
      if (!(a && b)) {
        const owner = a ? 'father' : 'mother';
        if (tie ? Math.random() >= .5 : owner !== fitter) continue;
      }
      const gene = { ...(a && b ? (Math.random() < .5 ? a : b) : a ?? b) };
      if (a && b) gene.enabled = (a.enabled && b.enabled) || Math.random() >= INHERIT_DISABLED_CHANCE;
      // Somar ligações dos dois pais pode fechar um laço; essa fica de fora.
      if (gene.enabled && this.#reaches(child, gene.to, gene.from)) continue;
      child.conns.push(gene);
    }
    child.hidden = Neat.#hiddenOf(child.conns);
    this.#mutate(child);
    return child;
  }

  // Distância de compatibilidade do NEAT: fração de genes que não casam mais a
  // diferença média de peso dos que casam.
  distance(a, b) {
    const other = new Map(b.conns.map(c => [c.innov, c]));
    let matching = 0, weightGap = 0;
    for (const c of a.conns) {
      const twin = other.get(c.innov);
      if (!twin) continue;
      matching++;
      weightGap += Math.abs(c.w - twin.w);
    }
    const mismatched = a.conns.length + b.conns.length - 2 * matching;
    const size = Math.max(1, a.conns.length, b.conns.length);
    return COMPAT_DISJOINT * mismatched / size + COMPAT_WEIGHT * (matching ? weightGap / matching : 0);
  }

  #mutate(g) {
    if (Math.random() < WEIGHT_MUTATION_RATE) {
      for (const c of g.conns) {
        c.w = Math.random() < WEIGHT_PERTURB_CHANCE
          ? c.w + (Math.random() * 2 - 1) * WEIGHT_PERTURB_STEP
          : (Math.random() * 2 - 1) * WEIGHT_RESET_RANGE;
        c.w = Math.max(-WEIGHT_LIMIT, Math.min(WEIGHT_LIMIT, c.w));
      }
    }
    if (Math.random() < ADD_CONNECTION_RATE) this.#addConnection(g);
    if (Math.random() < ADD_NODE_RATE) this.#addNode(g);
    if (Math.random() < TOGGLE_RATE && g.conns.length) {
      const c = g.conns[Math.floor(Math.random() * g.conns.length)];
      // Desligar é sempre seguro; religar só se não fechar laço.
      if (c.enabled) c.enabled = false;
      else if (!this.#reaches(g, c.to, c.from)) c.enabled = true;
    }
  }

  // Ligação nova entre dois neurônios que ainda não se falam, sem fechar laço.
  #addConnection(g) {
    const sources = [...Array(BIAS_NODE + 1).keys(), ...g.hidden];
    const targets = [...Array(BRAIN_OUTPUT_COUNT).keys()].map(o => FIRST_OUTPUT_NODE + o).concat(g.hidden);
    const existing = new Set(g.conns.map(c => `${c.from}>${c.to}`));
    for (let attempt = 0; attempt < 24; attempt++) {
      const from = sources[Math.floor(Math.random() * sources.length)];
      const to = targets[Math.floor(Math.random() * targets.length)];
      if (from === to || existing.has(`${from}>${to}`) || this.#reaches(g, to, from)) continue;
      g.conns.push({ innov: this.#innovation(from, to), from, to, w: (Math.random() * 2 - 1) * WEIGHT_RESET_RANGE, enabled: true });
      return;
    }
  }

  // Neurônio novo no meio de uma ligação: a antiga desliga, entram duas — a de
  // chegada com peso 1 e a de saída com o peso antigo —, então o comportamento
  // quase não muda no nascimento e a seleção decide depois.
  #addNode(g) {
    const enabled = g.conns.filter(c => c.enabled);
    if (!enabled.length) return;
    const c = enabled[Math.floor(Math.random() * enabled.length)];
    let node = this.#splits.get(c.innov);
    if (node === undefined) {
      node = this.#nextNode++;
      this.#splits.set(c.innov, node);
    }
    if (g.hidden.includes(node)) return;
    c.enabled = false;
    g.hidden.push(node);
    g.conns.push(
      { innov: this.#innovation(c.from, node), from: c.from, to: node, w: 1, enabled: true },
      { innov: this.#innovation(node, c.to), from: node, to: c.to, w: c.w, enabled: true }
    );
  }

  #innovation(from, to) {
    const key = `${from}>${to}`;
    if (!this.#innovations.has(key)) this.#innovations.set(key, this.#nextInnovation++);
    return this.#innovations.get(key);
  }

  // Existe caminho de `from` até `target` pelas ligações ativas?
  #reaches(g, from, target) {
    if (from === target) return true;
    const next = new Map();
    for (const c of g.conns) {
      if (!c.enabled) continue;
      if (!next.has(c.from)) next.set(c.from, []);
      next.get(c.from).push(c.to);
    }
    const stack = [from], seen = new Set();
    while (stack.length) {
      const node = stack.pop();
      if (node === target) return true;
      if (seen.has(node)) continue;
      seen.add(node);
      for (const to of next.get(node) ?? []) stack.push(to);
    }
    return false;
  }

  static #hiddenOf(conns) {
    const hidden = new Set();
    for (const c of conns) {
      if (c.from >= HIDDEN_START) hidden.add(c.from);
      if (c.to >= HIDDEN_START) hidden.add(c.to);
    }
    return [...hidden];
  }
}
