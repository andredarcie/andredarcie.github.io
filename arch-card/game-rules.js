(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  root.ArchCardRules = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const CARDS = [
    { id: "gohorse", name: "Go Horse", kind: "boost", r: "common", power: 3, debt: 2, art: "ph-horse", st: { pf: 1, cf: -1, ev: -3 } },
    { id: "shared-db", name: "Banco Compart.", kind: "boost", r: "common", power: 2, debt: 1, art: "ph-database", st: { pf: 1, cf: -2, ev: -2 } },
    { id: "magic-script", name: "Script Magico", kind: "boost", r: "common", power: 1, debt: 1, art: "ph-terminal-window", st: { pf: 1, cf: -1, ev: -1 } },
    { id: "monolithic", name: "Monolitico", kind: "core", r: "common", power: -1, debt: 0, art: "ph-buildings", st: { pf: 1, cf: 1, ev: 2 } },
    { id: "gateway", name: "API Gateway", kind: "core", r: "rare", power: -1, debt: 0, art: "ph-door-open", st: { pf: 1, cf: 2, ev: 0 } },
    { id: "cache", name: "Cache Dist.", kind: "core", r: "common", power: -1, debt: 0, art: "ph-database", st: { pf: 3, cf: 1, ev: 0 } },
    { id: "serverless", name: "Serverless", kind: "core", r: "rare", power: -2, debt: 0, art: "ph-cloud", st: { pf: 2, cf: 1, ev: 1 } },
    { id: "messaging", name: "Mensageria", kind: "core", r: "rare", power: -2, debt: 0, art: "ph-envelope-simple", st: { pf: 1, cf: 2, ev: 1 } },
    { id: "cqrs", name: "CQRS", kind: "core", r: "rare", power: -2, debt: 0, art: "ph-arrows-split", st: { pf: 2, cf: 1, ev: -1 } },
    { id: "event", name: "Event Sourcing", kind: "core", r: "legendary", power: -3, debt: 0, art: "ph-lightning", st: { pf: 1, cf: 3, ev: -1 } },
    { id: "microservices", name: "Microsservicos", kind: "core", r: "legendary", power: -3, debt: 0, art: "ph-share-network", st: { pf: 3, cf: 2, ev: 0 } },
    { id: "observability", name: "Observab.", kind: "mitigation", r: "rare", power: 0, debt: -2, art: "ph-binoculars", st: { pf: 0, cf: 2, ev: 0 } },
    { id: "tests", name: "Testes Auto", kind: "mitigation", r: "common", power: -1, debt: -1, art: "ph-check-square", st: { pf: 0, cf: 1, ev: 1 } },
  ];

  const OBJECTIVES = [
    { title: "Run Well", target: "pf", req: 5 },
    { title: "Run Correctly", target: "cf", req: 5 },
    { title: "Change Easily", target: "ev", req: 5 },
    { title: "Entrega Sob Pico", target: "pf", req: 6 },
    { title: "Base Sustentavel", target: "ev", req: 6 },
  ];

  const UPGRADES = [
    { id: "boost-pf", title: "Turbo de Performance", desc: "+1 Performance em todas as cartas", stackLimit: 2 },
    { id: "boost-cf", title: "Camada de Confiabilidade", desc: "+1 Confiabilidade em todas as cartas", stackLimit: 2 },
    { id: "boost-ev", title: "Motor de Evolucao", desc: "+1 Evolucao em todas as cartas", stackLimit: 2 },
    { id: "swap-plus", title: "Troca Extra", desc: "+1 troca por turno", stackLimit: 2 },
  ];

  const METRIC_KEYS = ["pf", "cf", "ev"];
  const METRIC_LABELS = { pf: "Performance", cf: "Confiabilidade", ev: "Evolucao" };

  function zeroScores() {
    return { pf: 0, cf: 0, ev: 0 };
  }

  function shuffle(items, rng) {
    const next = Array.isArray(items) ? items.slice() : [];
    const random = rng || Math.random;
    for (let i = next.length - 1; i > 0; i -= 1) {
      const swapIndex = Math.floor(random() * (i + 1));
      const temp = next[i];
      next[i] = next[swapIndex];
      next[swapIndex] = temp;
    }
    return next;
  }

  function getPlayedCards(board) {
    return board.filter(Boolean);
  }

  function countUpgrade(upgrades, upgradeId) {
    return upgrades.filter((upgrade) => upgrade === upgradeId).length;
  }

  function getSwapLimit(upgrades) {
    return 1 + countUpgrade(upgrades, "swap-plus");
  }

  function applyUpgradeModifiers(card, upgrades) {
    const view = {
      id: card.id,
      name: card.name,
      kind: card.kind,
      r: card.r,
      art: card.art,
      power: card.power,
      debt: card.debt,
      st: { pf: card.st.pf, cf: card.st.cf, ev: card.st.ev },
    };
    view.st.pf += countUpgrade(upgrades, "boost-pf");
    view.st.cf += countUpgrade(upgrades, "boost-cf");
    view.st.ev += countUpgrade(upgrades, "boost-ev");
    return view;
  }

  function getSynergyDetails(cards) {
    const ids = cards.map((card) => card.id);
    const details = [];
    if (ids.includes("messaging") && ids.includes("microservices")) details.push({ label: "Mensageria + Microsservicos", delta: { pf: 1, cf: 1, ev: 0 } });
    if (ids.includes("cqrs") && ids.includes("event")) details.push({ label: "CQRS + Event Sourcing", delta: { pf: 1, cf: 1, ev: -1 } });
    if (ids.includes("gateway") && ids.includes("microservices")) details.push({ label: "Gateway + Microsservicos", delta: { pf: 1, cf: 1, ev: 0 } });
    if (ids.includes("observability") && ids.includes("gohorse")) details.push({ label: "Observabilidade segura o caos", delta: { pf: 0, cf: 1, ev: 0 } });
    return details;
  }

  function computeBoardState(board, upgrades) {
    const cards = getPlayedCards(board).map((card) => applyUpgradeModifiers(card, upgrades));
    const scores = zeroScores();
    let power = 0;
    let debt = 0;
    cards.forEach((card) => {
      METRIC_KEYS.forEach((key) => {
        scores[key] += card.st[key];
      });
      power += card.power;
      debt += card.debt;
    });
    const synergies = getSynergyDetails(cards);
    synergies.forEach((detail) => {
      METRIC_KEYS.forEach((key) => {
        scores[key] += detail.delta[key];
      });
    });
    return { modifiedCards: cards, scores, power, debt, synergies };
  }

  function getObjectiveReq(objective, turn) {
    const pressure = Math.min(2, Math.floor(Math.max(0, turn - 1) / 4));
    return objective.req + pressure;
  }

  function evaluateBoard(board, objective, upgrades, turn, currentDebt) {
    const boardState = computeBoardState(board, upgrades);
    const req = getObjectiveReq(objective, turn);
    const targetValue = boardState.scores[objective.target];
    const missing = Math.max(0, req - targetValue);
    const debtAfter = Math.max(0, (currentDebt || 0) + boardState.debt);
    const success = targetValue >= req;
    const nearMiss = !success && missing === 1;
    return { req, targetValue, success, nearMiss, missing, debtAfter, boardState };
  }

  function calculateTurnScore(input) {
    const base = METRIC_KEYS.reduce((sum, key) => sum + Math.max(0, input.evaluation.boardState.scores[key]), 0);
    const diversityBonus = input.typeCount >= 3 ? 12 : input.typeCount === 2 ? 6 : 0;
    const synergyBonus = input.evaluation.boardState.synergies.length * 8;
    const successBonus = input.success ? 35 : 0;
    const streakMultiplier = input.success ? 1 + Math.max(0, input.streak - 1) * 0.25 : 1;
    const raw = input.success ? base + diversityBonus + synergyBonus + successBonus : input.nearMiss ? Math.floor((base + diversityBonus) * 0.7) : Math.floor(base * 0.35);
    const debtPenalty = Math.max(0, input.newDebt * 4);
    return { total: Math.max(0, Math.round(raw * streakMultiplier) - debtPenalty), debtPenalty, streakMultiplier, hpLoss: input.success || input.nearMiss ? 0 : 1 };
  }

  function buildRewardChoices(upgrades, count, rng) {
    const random = rng || Math.random;
    const available = UPGRADES.filter((upgrade) => countUpgrade(upgrades, upgrade.id) < upgrade.stackLimit);
    return shuffle(available, random).slice(0, count);
  }

  return {
    CARDS,
    OBJECTIVES,
    UPGRADES,
    METRIC_KEYS,
    METRIC_LABELS,
    zeroScores,
    shuffle,
    getPlayedCards,
    getSwapLimit,
    applyUpgradeModifiers,
    computeBoardState,
    getObjectiveReq,
    evaluateBoard,
    calculateTurnScore,
    buildRewardChoices,
  };
});
