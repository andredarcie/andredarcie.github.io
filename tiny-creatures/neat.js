(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.TinyCreaturesNEAT = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // NEAT (NeuroEvolution of Augmenting Topologies) compacto, feed-forward.
  // Evolui pesos E topologia (add-conexão / add-nó) com especiação por
  // distância de compatibilidade. Sem dependência de DOM.

  // ── Parâmetros ──
  var C1 = 1.0;                 // peso de genes disjuntos/excedentes
  var C3 = 0.5;                 // peso da diferença média de pesos
  var COMPAT_THRESHOLD = 3.0;   // limiar de especiação
  var WEIGHT_RANGE = 2.0;
  var PERTURB_PROB = 0.85;      // perturbar (vs resetar) cada peso
  var PERTURB_STEP = 0.5;
  var P_MUTATE_WEIGHTS = 0.8;
  var P_ADD_CONN = 0.07;
  var P_ADD_NODE = 0.035;
  var P_TOGGLE = 0.02;
  var ELITISM_MIN = 5;          // espécie com >= membros mantém campeão
  var SURVIVAL = 0.5;           // fração reprodutora de cada espécie
  var STAGNATION = 15;          // gerações sem melhora até a espécie ser descartada
  var WEIGHT_CLAMP = 8.0;       // limite dos pesos (evita explosão ao perturbar)

  function rnd() { return Math.random(); }
  function randW() { return (rnd() * 2 - 1) * WEIGHT_RANGE; }
  function clampW(w) { return w < -WEIGHT_CLAMP ? -WEIGHT_CLAMP : (w > WEIGHT_CLAMP ? WEIGHT_CLAMP : w); }
  function act(x) { // tanh
    if (x > 20) return 1;
    if (x < -20) return -1;
    var e = Math.exp(2 * x);
    return (e - 1) / (e + 1);
  }

  // Existe caminho de `from` até `target` pelas conexões ativas?
  function reaches(g, from, target) {
    var adj = {};
    for (var i = 0; i < g.conns.length; i++) {
      var c = g.conns[i];
      if (c.enabled) (adj[c.from] = adj[c.from] || []).push(c.to);
    }
    var stack = [from], seen = {};
    while (stack.length) {
      var n = stack.pop();
      if (n === target) return true;
      if (seen[n]) continue;
      seen[n] = 1;
      var nx = adj[n] || [];
      for (var k = 0; k < nx.length; k++) stack.push(nx[k]);
    }
    return false;
  }

  function cloneConn(c) {
    return { innov: c.innov, from: c.from, to: c.to, w: c.w, enabled: c.enabled };
  }

  // ── Contexto da população ──
  function Ctx(numIn, numOut, size) {
    this.numIn = numIn;
    this.numOut = numOut;
    this.size = size;
    this.biasId = numIn;                 // nó de bias (constante 1)
    this.firstOut = numIn + 1;           // ids das saídas
    this.firstHidden = numIn + 1 + numOut;
    this.nodeCounter = this.firstHidden; // próximo id de nó oculto
    this.innovCounter = 0;
    this.innovMap = {};                  // "from_to" -> innovation (persistente)
    this.splitCache = {};                // splits da geração atual: "from_to" -> nó novo
    this.species = [];                   // [{rep, members}]
    this.genomes = [];
  }

  Ctx.prototype.innov = function (from, to) {
    var k = from + '_' + to;
    if (this.innovMap[k] === undefined) this.innovMap[k] = ++this.innovCounter;
    return this.innovMap[k];
  };

  Ctx.prototype.newNode = function () { return this.nodeCounter++; };

  Ctx.prototype.baseGenome = function () {
    var nodes = [], conns = [], i, o;
    for (i = 0; i < this.numIn; i++) nodes.push({ id: i, type: 'in' });
    nodes.push({ id: this.biasId, type: 'bias' });
    for (o = 0; o < this.numOut; o++) nodes.push({ id: this.firstOut + o, type: 'out' });

    var srcs = [];
    for (i = 0; i < this.numIn; i++) srcs.push(i);
    srcs.push(this.biasId);
    for (var s = 0; s < srcs.length; s++) {
      for (o = 0; o < this.numOut; o++) {
        var to = this.firstOut + o;
        conns.push({ innov: this.innov(srcs[s], to), from: srcs[s], to: to, w: randW(), enabled: true });
      }
    }
    return { nodes: nodes, conns: conns, seed: rnd() * 2 - 1 };
  };

  Ctx.prototype.clone = function (g) {
    var nodes = [], conns = [], i;
    for (i = 0; i < g.nodes.length; i++) nodes.push({ id: g.nodes[i].id, type: g.nodes[i].type });
    for (i = 0; i < g.conns.length; i++) conns.push(cloneConn(g.conns[i]));
    return { nodes: nodes, conns: conns, seed: g.seed };
  };

  // Ativação feed-forward (DAG) por recursão memoizada.
  Ctx.prototype.activate = function (g, inputs) {
    var byId = {}, inc = {}, i, c;
    for (i = 0; i < g.nodes.length; i++) byId[g.nodes[i].id] = g.nodes[i];
    for (i = 0; i < g.conns.length; i++) {
      c = g.conns[i];
      if (c.enabled) (inc[c.to] = inc[c.to] || []).push(c);
    }
    var val = {}, visiting = {}, self = this;
    function v(id) {
      if (val[id] !== undefined) return val[id];
      var node = byId[id];
      if (!node) return 0;
      if (node.type === 'in') { val[id] = inputs[id] || 0; return val[id]; }
      if (node.type === 'bias') { val[id] = 1; return val[id]; }
      if (visiting[id]) return 0;
      visiting[id] = true;
      var sum = 0, ins = inc[id] || [];
      for (var j = 0; j < ins.length; j++) sum += v(ins[j].from) * ins[j].w;
      visiting[id] = false;
      val[id] = act(sum);
      return val[id];
    }
    var out = [];
    for (var o = 0; o < this.numOut; o++) out.push(v(this.firstOut + o));
    return out;
  };

  // ── Mutações ──
  Ctx.prototype.mutate = function (g) {
    var i;
    if (rnd() < P_MUTATE_WEIGHTS) {
      for (i = 0; i < g.conns.length; i++) {
        if (rnd() < PERTURB_PROB) g.conns[i].w += (rnd() * 2 - 1) * PERTURB_STEP;
        else g.conns[i].w = randW();
        g.conns[i].w = clampW(g.conns[i].w);
      }
    }
    if (rnd() < P_ADD_CONN) this.addConn(g);
    if (rnd() < P_ADD_NODE) this.addNode(g);
    if (rnd() < P_TOGGLE && g.conns.length) {
      var c = g.conns[rnd() * g.conns.length | 0];
      if (c.enabled) c.enabled = false;                     // desabilitar é sempre seguro
      else if (!reaches(g, c.to, c.from)) c.enabled = true; // só reabilita se não formar ciclo
    }
    if (g.seed === undefined || rnd() < 0.08) g.seed = rnd() * 2 - 1; // o traço pode mutar de leve
    return g;
  };

  Ctx.prototype.addConn = function (g) {
    var froms = [], tos = [], i, n;
    for (i = 0; i < g.nodes.length; i++) {
      n = g.nodes[i];
      if (n.type !== 'out') froms.push(n);
      if (n.type === 'hidden' || n.type === 'out') tos.push(n);
    }
    if (!froms.length || !tos.length) return;
    var exist = {};
    for (i = 0; i < g.conns.length; i++) exist[g.conns[i].from + '_' + g.conns[i].to] = 1;

    for (var t = 0; t < 25; t++) {
      var a = froms[rnd() * froms.length | 0];
      var b = tos[rnd() * tos.length | 0];
      if (a.id === b.id) continue;
      if (exist[a.id + '_' + b.id]) continue;
      if (reaches(g, b.id, a.id)) continue; // evita ciclo
      g.conns.push({ innov: this.innov(a.id, b.id), from: a.id, to: b.id, w: randW(), enabled: true });
      return;
    }
  };

  Ctx.prototype.addNode = function (g) {
    var en = [];
    for (var i = 0; i < g.conns.length; i++) if (g.conns[i].enabled) en.push(g.conns[i]);
    if (!en.length) return;
    var c = en[rnd() * en.length | 0];
    c.enabled = false;
    // o mesmo split na mesma geração reusa o mesmo nó → genes alinham no crossover
    var sk = c.from + '_' + c.to;
    var nid = this.splitCache[sk];
    if (nid === undefined) { nid = this.newNode(); this.splitCache[sk] = nid; }
    if (!g.nodes.some(function (n) { return n.id === nid; })) g.nodes.push({ id: nid, type: 'hidden' });
    g.conns.push({ innov: this.innov(c.from, nid), from: c.from, to: nid, w: 1, enabled: true });
    g.conns.push({ innov: this.innov(nid, c.to), from: nid, to: c.to, w: c.w, enabled: true });
  };

  // ── Distância de compatibilidade ──
  Ctx.prototype.compat = function (g1, g2) {
    var m1 = {}, m2 = {}, i;
    for (i = 0; i < g1.conns.length; i++) m1[g1.conns[i].innov] = g1.conns[i];
    for (i = 0; i < g2.conns.length; i++) m2[g2.conns[i].innov] = g2.conns[i];
    var match = 0, wdiff = 0, mismatch = 0, k;
    for (k in m1) {
      if (m2[k]) { match++; wdiff += Math.abs(m1[k].w - m2[k].w); }
      else mismatch++;
    }
    for (k in m2) if (!m1[k]) mismatch++;
    var N = Math.max(g1.conns.length, g2.conns.length);
    if (N < 1) N = 1;
    var w = match ? wdiff / match : 0;
    return (C1 * mismatch) / N + C3 * w;
  };

  // ── Crossover (g1 deve ser o mais apto) ──
  Ctx.prototype.crossover = function (g1, g2) {
    var m2 = {}, i;
    for (i = 0; i < g2.conns.length; i++) m2[g2.conns[i].innov] = g2.conns[i];
    var childConns = [];
    for (i = 0; i < g1.conns.length; i++) {
      var c1 = g1.conns[i], c2 = m2[c1.innov], gene;
      if (c2) {
        gene = cloneConn(rnd() < 0.5 ? c1 : c2);
        if ((!c1.enabled || !c2.enabled) && rnd() < 0.75) gene.enabled = false;
        else gene.enabled = true;
      } else {
        gene = cloneConn(c1); // disjunto/excedente do mais apto
      }
      childConns.push(gene);
    }
    var child = this.buildFromConns(childConns);
    child.seed = g1.seed;   // herda o traço do pai mais apto
    return child;
  };

  Ctx.prototype.buildFromConns = function (conns) {
    var nodes = [], i, o;
    for (i = 0; i < this.numIn; i++) nodes.push({ id: i, type: 'in' });
    nodes.push({ id: this.biasId, type: 'bias' });
    for (o = 0; o < this.numOut; o++) nodes.push({ id: this.firstOut + o, type: 'out' });
    var seen = {};
    for (i = 0; i < conns.length; i++) {
      var ids = [conns[i].from, conns[i].to];
      for (var j = 0; j < 2; j++) {
        var id = ids[j];
        if (id >= this.firstHidden && !seen[id]) { seen[id] = 1; nodes.push({ id: id, type: 'hidden' }); }
      }
    }
    return { nodes: nodes, conns: conns };
  };

  // ── Evolução (uma geração) ──
  // fitnesses: array alinhado a this.genomes (maior = melhor, >0).
  Ctx.prototype.evolve = function (fitnesses) {
    var self = this, i;
    this.splitCache = {};   // histórico de splits reinicia a cada geração
    var items = this.genomes.map(function (g, idx) {
      return { g: g, fit: Math.max(0.0001, fitnesses[idx] || 0) };
    });

    // 1) especiação (carrega representante + histórico de stagnation)
    var species = this.species.map(function (sp) {
      return { rep: sp.rep, members: [], bestFit: sp.bestFit, staleness: sp.staleness };
    });
    items.forEach(function (it) {
      for (var k = 0; k < species.length; k++) {
        if (self.compat(it.g, species[k].rep) < COMPAT_THRESHOLD) { species[k].members.push(it); return; }
      }
      species.push({ rep: it.g, members: [it], bestFit: -Infinity, staleness: 0 });
    });
    species = species.filter(function (sp) { return sp.members.length > 0; });

    // 2) stagnation: melhor fitness da espécie nesta geração
    species.forEach(function (sp) {
      var cur = 0;
      for (var m = 0; m < sp.members.length; m++) if (sp.members[m].fit > cur) cur = sp.members[m].fit;
      if (cur > sp.bestFit + 1e-6) { sp.bestFit = cur; sp.staleness = 0; }
      else sp.staleness++;
    });

    // 3) sobreviventes: descarta espécies estagnadas, mas protege a melhor
    var bestSp = species[0];
    species.forEach(function (sp) { if (sp.bestFit > bestSp.bestFit) bestSp = sp; });
    var survivors = species.filter(function (sp) { return sp.staleness < STAGNATION || sp === bestSp; });
    if (!survivors.length) survivors = species;

    // 4) fitness ajustada (fitness sharing) + soma por espécie sobrevivente
    var total = 0;
    survivors.forEach(function (sp) {
      sp.sum = 0;
      sp.members.forEach(function (it) { it.adj = it.fit / sp.members.length; sp.sum += it.adj; });
      total += sp.sum;
    });

    // 5) alocação de filhos por espécie
    survivors.forEach(function (sp) {
      sp.offspring = total > 0 ? Math.round((sp.sum / total) * self.size)
                               : Math.round(self.size / survivors.length);
    });

    // 6) reprodução
    var next = [];
    survivors.forEach(function (sp) {
      sp.members.sort(function (a, b) { return b.fit - a.fit; });
      var off = sp.offspring;
      if (sp.members.length >= ELITISM_MIN && off > 0) { next.push(self.clone(sp.members[0].g)); off--; }
      var cut = Math.max(1, Math.floor(sp.members.length * SURVIVAL));
      var pool = sp.members.slice(0, cut);
      while (off-- > 0) {
        var p1 = pool[(pool.length * rnd() * rnd()) | 0], child; // viés p/ os melhores → líder tem mais filhos
        if (pool.length > 1 && rnd() < 0.75) {
          var p2 = pool[(pool.length * rnd() * rnd()) | 0];
          child = (p1.fit >= p2.fit) ? self.crossover(p1.g, p2.g) : self.crossover(p2.g, p1.g);
        } else {
          child = self.clone(p1.g);
        }
        self.mutate(child);
        next.push(child);
      }
    });

    // 7) elitismo global + ajuste de tamanho
    var best = items[0];
    for (i = 0; i < items.length; i++) if (items[i].fit > best.fit) best = items[i];
    if (next.length) next[0] = self.clone(best.g);
    else next.push(self.clone(best.g));
    while (next.length < self.size) { var c = self.clone(best.g); self.mutate(c); next.push(c); }
    if (next.length > self.size) next.length = self.size;

    // 8) representantes p/ próxima geração (só sobreviventes, com histórico)
    this.species = survivors.map(function (sp) {
      return { rep: sp.members[rnd() * sp.members.length | 0].g, members: [], bestFit: sp.bestFit, staleness: sp.staleness };
    });

    this.genomes = next;
    return next;
  };

  function createPopulation(numIn, numOut, size) {
    var ctx = new Ctx(numIn, numOut, size);
    for (var i = 0; i < size; i++) ctx.genomes.push(ctx.baseGenome());
    return ctx;
  }

  return {
    createPopulation: createPopulation,
  };
});
