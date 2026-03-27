const {
  CARDS,
  OBJECTIVES,
  METRIC_LABELS,
  UPGRADES,
  zeroScores,
  shuffle,
  getPlayedCards,
  getSwapLimit,
  applyUpgradeModifiers,
  evaluateBoard,
  calculateTurnScore,
  buildRewardChoices,
} = window.ArchCardRules;

const STORAGE_KEYS = {
  bestScore: "archcard.best-score",
  bestStreak: "archcard.best-streak",
};

const MAX_HAND_SIZE = 4;
let G = {};

function freshState() {
  return {
    turn: 1,
    score: 0,
    hp: 3,
    streak: 0,
    bestScore: readNumber(STORAGE_KEYS.bestScore),
    bestStreak: readNumber(STORAGE_KEYS.bestStreak),
    swapsLeft: 1,
    hand: [],
    board: [null, null, null],
    sel: null,
    obj: OBJECTIVES[0],
    sc: zeroScores(),
    power: 0,
    debt: 0,
    turnDebt: 0,
    synergies: [],
    deck: [],
    upgrades: [],
    pendingRewards: [],
    rewardLocked: false,
  };
}

function readNumber(key) {
  const raw = window.localStorage.getItem(key);
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function saveMeta() {
  window.localStorage.setItem(STORAGE_KEYS.bestScore, String(G.bestScore));
  window.localStorage.setItem(STORAGE_KEYS.bestStreak, String(G.bestStreak));
}

function ensureDeck() {
  if (!G.deck.length) G.deck = shuffle(CARDS);
}

function drawCard() {
  ensureDeck();
  return G.deck.pop();
}

function drawUpToHandSize() {
  while (G.hand.filter(Boolean).length < MAX_HAND_SIZE) {
    const emptyIndex = G.hand.findIndex((card) => !card);
    const newCard = drawCard();
    if (emptyIndex === -1) G.hand.push(newCard);
    else G.hand[emptyIndex] = newCard;
  }
  if (G.hand.length > MAX_HAND_SIZE) G.hand = G.hand.slice(0, MAX_HAND_SIZE);
}

function pickNextObjective() {
  const pool = OBJECTIVES.filter((objective) => objective.title !== G.obj.title);
  G.obj = shuffle(pool)[0] || OBJECTIVES[0];
}

function getUpgradeById(upgradeId) {
  return UPGRADES.find((upgrade) => upgrade.id === upgradeId);
}

function getBoardEvaluation(board) {
  return evaluateBoard(board, G.obj, G.upgrades, G.turn, G.debt);
}

function recalc() {
  const evaluation = getBoardEvaluation(G.board);
  G.sc = evaluation.boardState.scores;
  G.power = evaluation.boardState.power;
  G.turnDebt = evaluation.boardState.debt;
  G.synergies = evaluation.boardState.synergies;
  return evaluation;
}

function getEmptySlots(board) {
  return board.map((card, index) => (card ? null : index)).filter((index) => index !== null);
}

function dots(value) {
  const total = 4;
  const active = Math.max(0, Math.min(total, value));
  return Array.from({ length: total }, (_, index) => `<span class="card-dot${index < active ? " on" : ""}"></span>`).join("");
}

function liveDots(value) {
  return Array.from({ length: 9 }, (_, index) => `<span class="live-dot${index < value ? " on" : ""}"></span>`).join("");
}

function fmtSigned(value) {
  return value > 0 ? `+${value}` : String(value);
}

function isCardLocked(card) {
  const view = applyUpgradeModifiers(card, G.upgrades);
  return G.power + view.power < 0;
}

function updateMetaPanel() {
  document.getElementById("meta-turn").textContent = G.turn;
  document.getElementById("meta-score").textContent = G.score;
  document.getElementById("meta-best").textContent = G.bestScore;
  document.getElementById("meta-hp").textContent = G.hp;
  document.getElementById("meta-streak").textContent = `x${G.streak}`;
  document.getElementById("meta-upgrades").textContent = G.upgrades.length;
}

function renderUpgradeStrip() {
  const holder = document.getElementById("upgrade-strip");
  if (!G.upgrades.length) {
    holder.innerHTML = '<span class="upgrade-pill muted">Sem upgrades ainda</span>';
    return;
  }
  holder.innerHTML = G.upgrades.map((upgradeId) => `<span class="upgrade-pill">${getUpgradeById(upgradeId).title}</span>`).join("");
}

function renderObjective(evaluation) {
  const current = evaluation || recalc();
  document.getElementById("obj-title").textContent = G.obj.title;
  document.getElementById("obj-target-line").textContent = `${METRIC_LABELS[G.obj.target]} ${current.targetValue}/${current.req}`;
  document.getElementById("obj-power-line").textContent = fmtSigned(G.power);
  document.getElementById("obj-debt-line").textContent = `${G.debt} -> ${current.debtAfter}`;
  document.getElementById("live-ca").innerHTML = liveDots(Math.max(0, G.sc.pf));
  document.getElementById("live-ve").innerHTML = liveDots(Math.max(0, G.sc.cf));
  document.getElementById("live-es").innerHTML = liveDots(Math.max(0, G.sc.ev));
  updateMetaPanel();
  renderUpgradeStrip();
}

function makeCard(card, index, onBoard) {
  const cardView = applyUpgradeModifiers(card, G.upgrades);
  const powerClass = cardView.power >= 0 ? "gain" : "spend";
  const debtClass = cardView.debt > 0 ? "bad" : cardView.debt < 0 ? "good" : "neutral";
  const locked = !onBoard && isCardLocked(card);
  const el = document.createElement("div");
  el.className = "card";
  el.dataset.idx = index;

  if (!onBoard) {
    el.onclick = function () { selectCard(index); };
    el.addEventListener("mousemove", tilt3D);
    el.addEventListener("mouseleave", resetTilt);
    el.classList.toggle("selected", G.sel === index);
    el.classList.toggle("playable", G.sel !== null && G.sel !== index);
    el.classList.toggle("locked", locked);
  } else {
    el.onclick = function () { returnBoardCard(index); };
  }

  el.innerHTML = `
    <div class="card-shell ${cardView.kind}">
      <div class="card-cost ${powerClass}">${fmtSigned(cardView.power)}P</div>
      <div class="card-body">
        <div class="card-art"><i class="ph-thin ${cardView.art}"></i></div>
        <div class="card-divider"></div>
        <div class="card-name">${cardView.name}</div>
        <div class="card-tags"><span>${cardView.kind}</span><span class="${debtClass}">${fmtSigned(cardView.debt)}D</span></div>
        <div class="card-stats">
          <div class="card-stat ca"><span class="card-stat-lbl">Perf.</span><span class="card-dots">${dots(cardView.st.pf)}</span></div>
          <div class="card-stat ve"><span class="card-stat-lbl">Conf.</span><span class="card-dots">${dots(cardView.st.cf)}</span></div>
          <div class="card-stat es"><span class="card-stat-lbl">Evo.</span><span class="card-dots">${dots(cardView.st.ev)}</span></div>
        </div>
      </div>
    </div>
  `;
  return el;
}

function renderHand(animate) {
  const handEl = document.getElementById("hand");
  handEl.innerHTML = "";
  G.hand.forEach((card, index) => {
    if (!card) return;
    const cardEl = makeCard(card, index, false);
    if (animate) {
      cardEl.style.opacity = "0";
      cardEl.style.transform = "translateY(60px) scale(0.85)";
    }
    handEl.appendChild(cardEl);
    if (animate) gsap.to(cardEl, { opacity: 1, y: 0, scale: 1, duration: 0.42, delay: index * 0.06, ease: "back.out(1.5)" });
  });
}

function renderBoard() {
  G.board.forEach((card, index) => {
    const slot = document.getElementById(`sl-${index}`);
    if (card) {
      const ripple = document.getElementById(`rip-${index}`);
      slot.innerHTML = "";
      slot.classList.add("has-card");
      slot.classList.remove("ready");
      slot.appendChild(makeCard(card, index, true));
      if (ripple) slot.appendChild(ripple);
      slot.onclick = null;
      return;
    }
    slot.classList.remove("has-card");
    slot.classList.toggle("ready", G.sel !== null);
    slot.innerHTML = `<span>Slot ${index + 1}</span><div class="slot-ripple" id="rip-${index}"></div>`;
    slot.onclick = function () {
      if (G.sel === null) {
        toast("Selecione uma carta primeiro.", "warn");
        return;
      }
      playSelectedCard(index);
    };
  });
}

function renderEffects() {
  const holder = document.getElementById("bfx");
  if (!G.synergies.length) {
    holder.innerHTML = "";
    holder.classList.remove("on");
    return;
  }
  holder.classList.add("on");
  holder.innerHTML = G.synergies.map((synergy) => `<span class="effect-pill">${synergy.label}</span>`).join("");
}

function buildSelectedPreview() {
  if (G.sel === null || !G.hand[G.sel]) return null;
  const emptySlots = getEmptySlots(G.board);
  if (!emptySlots.length) return null;
  const nextBoard = G.board.slice();
  nextBoard[emptySlots[0]] = G.hand[G.sel];
  return getBoardEvaluation(nextBoard);
}

function renderStatusline(evaluation) {
  const current = evaluation || recalc();
  const preview = buildSelectedPreview();
  const statusline = document.getElementById("statusline");

  if (!getEmptySlots(G.board).length) {
    statusline.textContent = "Mesa cheia. Encerrar turno para pontuar.";
    return;
  }

  if (!preview) {
    statusline.textContent = `${G.obj.title}: ${METRIC_LABELS[G.obj.target]} ${current.targetValue}/${current.req}, poder ${fmtSigned(G.power)}, divida ${G.debt}.`;
    return;
  }

  const card = applyUpgradeModifiers(G.hand[G.sel], G.upgrades);
  const parts = [
    `${card.name}: poder ${fmtSigned(G.power)} -> ${fmtSigned(preview.boardState.power)}`,
    `divida ${G.debt} -> ${preview.debtAfter}`,
    `${METRIC_LABELS[G.obj.target]} ${current.targetValue} -> ${preview.targetValue}/${preview.req}`,
  ];
  if (preview.targetValue >= preview.req) parts.push("fecha meta");
  else if (preview.missing === 1) parts.push("fica quase la");
  else parts.push(`faltam ${preview.missing}`);
  statusline.textContent = parts.join(" // ");
}

function updateActionState() {
  const swapButton = document.getElementById("btn-swap");
  const endButton = document.getElementById("btn-end");
  const nextButton = document.getElementById("btn-next");
  swapButton.disabled = G.sel === null || G.swapsLeft <= 0;
  swapButton.textContent = G.swapsLeft > 0 ? `Trocar Carta (${G.swapsLeft})` : "Trocas zeradas";
  endButton.disabled = getPlayedCards(G.board).length === 0;
  if (nextButton) nextButton.disabled = G.rewardLocked;
}

function renderAll(animateHand) {
  const evaluation = recalc();
  renderObjective(evaluation);
  renderBoard();
  renderEffects();
  renderHand(Boolean(animateHand));
  renderStatusline(evaluation);
  updateActionState();
}

function selectCard(index) {
  if (!G.hand[index]) return;
  G.sel = G.sel === index ? null : index;
  renderAll(false);
}

function canPlaySelectedCard(slotIndex) {
  const nextBoard = G.board.slice();
  nextBoard[slotIndex] = G.hand[G.sel];
  const preview = getBoardEvaluation(nextBoard);
  if (preview.boardState.power < 0) {
    toast(`Voce precisa de ${Math.abs(preview.boardState.power)}P antes dessa carta.`, "warn");
    return false;
  }
  return true;
}

function playSelectedCard(slotIndex) {
  if (G.sel === null || G.board[slotIndex]) return;
  if (!canPlaySelectedCard(slotIndex)) return;
  const card = G.hand[G.sel];
  G.board[slotIndex] = card;
  G.hand[G.sel] = null;
  G.sel = null;
  renderAll(false);
  const view = applyUpgradeModifiers(card, G.upgrades);
  if (view.kind === "boost") toast(`${card.name}: ${fmtSigned(view.power)}P e ${fmtSigned(view.debt)}D.`);
  else if (view.kind === "mitigation") toast(`${card.name}: limpa ${Math.abs(view.debt)}D.`);
  else toast(`${card.name} entrou na mesa.`);
}

function returnBoardCard(slotIndex) {
  const card = G.board[slotIndex];
  if (!card) return;
  const handIndex = G.hand.findIndex((entry) => entry === null);
  if (handIndex === -1) {
    toast("Sua mao esta cheia.", "warn");
    return;
  }
  G.board[slotIndex] = null;
  G.hand[handIndex] = card;
  renderAll(false);
  toast(`${card.name} voltou para a mao.`);
}

function swapCard() {
  if (G.sel === null) {
    toast("Selecione uma carta para trocar.", "warn");
    return;
  }
  if (G.swapsLeft <= 0) {
    toast("Voce ja usou todas as trocas deste turno.", "warn");
    return;
  }
  const oldName = G.hand[G.sel].name;
  G.hand[G.sel] = drawCard();
  G.swapsLeft -= 1;
  G.sel = null;
  renderAll(false);
  toast(`${oldName} saiu. Nova carta comprada.`);
}

function buildResultLines(result, summary, nextDebt) {
  if (result.success) {
    return [
      `Meta batida com ${METRIC_LABELS[G.obj.target]} ${result.targetValue}/${result.req}.`,
      `Divida ${G.debt} -> ${nextDebt}.`,
      `+${summary.total} pts apos penalidade de divida ${summary.debtPenalty}.`,
    ];
  }
  if (result.nearMiss) {
    return [
      `Quase la. Faltou 1 ponto em ${METRIC_LABELS[G.obj.target]}.`,
      `Divida ${G.debt} -> ${nextDebt}.`,
      `Consolacao: +${summary.total} pts.`,
    ];
  }
  return [
    `Falha direta. ${METRIC_LABELS[G.obj.target]} ${result.targetValue}/${result.req}.`,
    `Divida ${G.debt} -> ${nextDebt}.`,
    `Voce perde ${summary.hpLoss} vida e a streak reinicia.`,
  ];
}

function renderRewardChoices() {
  const rewardWrap = document.getElementById("reward-wrap");
  const rewardChoices = document.getElementById("reward-choices");
  const rewardHelp = document.getElementById("reward-help");
  const nextButton = document.getElementById("btn-next");
  if (!G.pendingRewards.length) {
    rewardWrap.classList.remove("on");
    rewardChoices.innerHTML = "";
    rewardHelp.textContent = "";
    G.rewardLocked = false;
    nextButton.textContent = G.hp <= 0 ? "Reiniciar" : "Proximo Turno ->";
    updateActionState();
    return;
  }
  rewardWrap.classList.add("on");
  rewardHelp.textContent = "Escolha 1 bonus para a run.";
  rewardChoices.innerHTML = G.pendingRewards.map((upgrade) => `<button class="reward-btn" onclick="chooseReward('${upgrade.id}')"><strong>${upgrade.title}</strong><span>${upgrade.desc}</span></button>`).join("");
  G.rewardLocked = true;
  nextButton.textContent = "Escolha um bonus";
  updateActionState();
}

function showResult(result, summary, nextDebt) {
  const overlay = document.getElementById("overlay");
  const lines = buildResultLines(result, summary, nextDebt);
  const efficiency = Math.max(0, Math.min(999, Math.round((result.targetValue / result.req) * 100)));
  document.getElementById("m-icon").textContent = result.success ? "OK" : result.nearMiss ? "ALMOST" : "FALHA";
  document.getElementById("m-title").textContent = result.success ? "Rodada vencida" : result.nearMiss ? "Quase la" : "Rodada perdida";
  document.getElementById("m-sub").textContent = G.obj.title.toUpperCase();
  document.getElementById("m-pts").textContent = summary.total;
  document.getElementById("m-pts").className = `mscore-val ${result.success ? "ok" : result.nearMiss ? "neu" : "fail"}`;
  document.getElementById("m-eff").textContent = `${efficiency}%`;
  document.getElementById("m-eff").className = `mscore-val ${efficiency >= 100 ? "ok" : result.nearMiss ? "neu" : "fail"}`;
  document.getElementById("m-bon").textContent = `-${summary.debtPenalty}`;
  document.getElementById("m-chain").textContent = `x${G.streak}`;
  document.getElementById("m-analysis").innerHTML = `<div class="ma-head">Resumo</div>${lines.map((item) => `<div class="ma-item"><span class="ma-ico">></span><span>${item}</span></div>`).join("")}`;
  renderRewardChoices();
  overlay.classList.add("on");
}

function applyTurnResult(result, summary) {
  const nextDebt = Math.max(0, G.debt + result.boardState.debt);
  G.score += summary.total;
  G.hp = Math.max(0, G.hp - summary.hpLoss);
  G.debt = nextDebt;
  G.streak = result.success ? G.streak + 1 : 0;
  G.bestScore = Math.max(G.bestScore, G.score);
  G.bestStreak = Math.max(G.bestStreak, G.streak);
  saveMeta();
  G.pendingRewards = result.success ? buildRewardChoices(G.upgrades, 2) : [];
  return nextDebt;
}

function endTurn() {
  const played = getPlayedCards(G.board);
  if (!played.length) {
    toast("Jogue ao menos uma carta antes de encerrar.", "warn");
    return;
  }
  const result = getBoardEvaluation(G.board);
  const summary = calculateTurnScore({
    success: result.success,
    nearMiss: result.nearMiss,
    playedCount: played.length,
    typeCount: new Set(played.map((card) => card.kind)).size,
    streak: result.success ? G.streak + 1 : 0,
    evaluation: result,
    newDebt: result.debtAfter,
  });
  const nextDebt = applyTurnResult(result, summary);
  renderAll(false);
  showResult(result, summary, nextDebt);
}

function chooseReward(upgradeId) {
  if (!G.pendingRewards.length) return;
  G.upgrades.push(upgradeId);
  G.pendingRewards = [];
  G.rewardLocked = false;
  renderRewardChoices();
  renderAll(false);
  toast(`${getUpgradeById(upgradeId).title} ativado.`);
}

function nextTurn() {
  if (G.rewardLocked) {
    toast("Escolha um bonus antes de seguir.", "warn");
    return;
  }
  document.getElementById("overlay").classList.remove("on");
  if (G.hp <= 0) {
    setTimeout(function () {
      init();
      toast("Nova run iniciada.", "err");
    }, 200);
    return;
  }
  G.turn += 1;
  G.swapsLeft = getSwapLimit(G.upgrades);
  G.board = [null, null, null];
  G.sc = zeroScores();
  G.power = 0;
  G.turnDebt = 0;
  G.sel = null;
  G.synergies = [];
  drawUpToHandSize();
  pickNextObjective();
  renderAll(true);
  toast(G.streak > 0 ? `Streak x${G.streak} mantida. Divida atual ${G.debt}.` : "Novo turno. Gere poder e feche a meta.");
}

function init() {
  G = freshState();
  G.deck = shuffle(CARDS);
  drawUpToHandSize();
  G.swapsLeft = getSwapLimit(G.upgrades);
  G.obj = shuffle(OBJECTIVES)[0];
  renderAll(true);
  renderRewardChoices();
  toast("Voce comeca com 0P. Use cartas ruins para liberar as boas.");
}

function tilt3D(event) {
  const card = event.currentTarget;
  const rect = card.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const cx = rect.width / 2;
  const cy = rect.height / 2;
  const rotateX = -((y - cy) / cy) * 10;
  const rotateY = ((x - cx) / cx) * 12;
  gsap.to(card, { rotateX, rotateY, translateY: card.classList.contains("selected") ? -28 : -18, scale: card.classList.contains("selected") ? 1.08 : 1.05, duration: 0.22, ease: "power2.out", overwrite: true });
}

function resetTilt(event) {
  const card = event.currentTarget;
  const selected = card.classList.contains("selected");
  gsap.to(card, { rotateX: 0, rotateY: 0, translateY: selected ? -28 : 0, scale: selected ? 1.08 : 1, duration: 0.28, ease: "power2.out", overwrite: true });
}

function toast(message, type) {
  const toastEl = document.getElementById("toast");
  toastEl.textContent = message;
  toastEl.className = `toast ${type || ""} on`;
  clearTimeout(toastEl._t);
  toastEl._t = setTimeout(function () { toastEl.classList.remove("on"); }, 2400);
}

function renderGameToText() {
  const evaluation = getBoardEvaluation(G.board);
  return JSON.stringify({
    mode: document.getElementById("overlay").classList.contains("on") ? "result" : "playing",
    turn: G.turn,
    score: G.score,
    hp: G.hp,
    streak: G.streak,
    debt: G.debt,
    power: G.power,
    objective: { title: G.obj.title, target: G.obj.target, req: evaluation.req },
    hand: G.hand.filter(Boolean).map((card) => {
      const view = applyUpgradeModifiers(card, G.upgrades);
      return { id: card.id, kind: view.kind, power: view.power, debt: view.debt, stats: view.st };
    }),
    board: G.board.map((card) => (card ? card.id : null)),
    scores: G.sc,
    rewardChoices: G.pendingRewards.map((upgrade) => upgrade.id),
    coord_note: "board slots ordered left-to-right from index 0 to 2",
  });
}

async function tryLockLandscape() {
  try {
    if (window.innerWidth <= 900 && window.innerHeight > window.innerWidth && screen.orientation && screen.orientation.lock) {
      await screen.orientation.lock("landscape");
    }
  } catch (error) {
    return;
  }
}

window.render_game_to_text = renderGameToText;
window.advanceTime = function () {};
window.swapCard = swapCard;
window.endTurn = endTurn;
window.nextTurn = nextTurn;
window.chooseReward = chooseReward;

window.addEventListener("load", function () {
  init();
  tryLockLandscape();
  gsap.fromTo(".objective", { opacity: 0, y: -12 }, { opacity: 1, y: 0, duration: 0.45, delay: 0.06, ease: "power2.out" });
  gsap.fromTo(".statusline", { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.35, delay: 0.18, ease: "power2.out" });
  gsap.fromTo(".board-wrap", { opacity: 0, scale: 0.97 }, { opacity: 1, scale: 1, duration: 0.5, delay: 0.24, ease: "power2.out" });
  gsap.fromTo(".actions", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.35, delay: 0.32, ease: "power2.out" });
});

window.addEventListener("orientationchange", tryLockLandscape);
