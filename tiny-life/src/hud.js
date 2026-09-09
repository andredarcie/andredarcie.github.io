/**
 * O painel. Tudo que toca o DOM fora do canvas fica aqui.
 *
 * Recebe um retrato pronto da Telemetry e pinta — não conta formiga, não sabe o
 * que é uma pupa. A simulação roda inteira sem esta classe existir.
 */
export class Hud {
  constructor({ onReset, onToggleTrails }) {
    this.el = {
      status: document.getElementById('stat-status'),
      workers: document.getElementById('stat-workers'),
      foraging: document.getElementById('stat-foraging'),
      hauling: document.getElementById('stat-hauling'),
      brood: document.getElementById('stat-brood'),
      stages: document.getElementById('stat-stages'),
      gathered: document.getElementById('stat-gathered'),
      rate: document.getElementById('stat-rate'),
      piles: document.getElementById('stat-piles')
    };
    this.hint = document.getElementById('hint');
    this.btnTrails = document.getElementById('btn-trails');
    this.btnReset = document.getElementById('btn-reset');

    this.spark = document.getElementById('spark');
    this.sparkCtx = this.spark ? this.spark.getContext('2d') : null;

    this.hintGone = false;
    this.last = {};

    this.btnTrails.addEventListener('click', () => onToggleTrails());
    this.btnReset.addEventListener('click', () => onReset());
  }

  /** @param {object} s retrato vindo da Telemetry */
  render(s) {
    this.#set('status', s.status);
    this.#set('workers', s.workers);
    this.#set('foraging', s.foraging);
    this.#set('hauling', s.hauling);
    this.#set('brood', s.brood);
    this.#set('stages', `${s.eggs} · ${s.larvae} · ${s.pupae}`);
    this.#set('gathered', s.gathered);
    this.#set('rate', s.rate);
    this.#set('piles', s.piles);
    this.#spark(s.history, s.peak);
  }

  // Só escreve no DOM quando o valor muda: sem isso são nove escritas por
  // amostra, quatro vezes por segundo, quase todas repetindo o mesmo texto.
  #set(key, value) {
    if (this.last[key] === value) return;
    this.last[key] = value;
    const el = this.el[key];
    if (el) el.textContent = value;
  }

  // População nos últimos ~90 s. O mais novo fica sempre colado na direita.
  #spark(history, peak) {
    const g = this.sparkCtx;
    if (!g || history.length < 2) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.spark.clientWidth || 132;
    const h = this.spark.clientHeight || 26;
    if (this.spark.width !== Math.round(w * dpr)) {
      this.spark.width = Math.round(w * dpr);
      this.spark.height = Math.round(h * dpr);
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);

    const n = history.length;
    const stepX = w / 179;
    const x = (i) => w - (n - 1 - i) * stepX;
    const y = (v) => h - 1 - (v / peak) * (h - 2);

    g.beginPath();
    g.moveTo(x(0), h);
    for (let i = 0; i < n; i++) g.lineTo(x(i), y(history[i]));
    g.lineTo(x(n - 1), h);
    g.closePath();
    g.fillStyle = 'rgba(246, 243, 233, 0.13)';
    g.fill();

    g.beginPath();
    for (let i = 0; i < n; i++) {
      const px = x(i), py = y(history[i]);
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.strokeStyle = 'rgba(246, 243, 233, 0.72)';
    g.lineWidth = 1;
    g.stroke();

    g.beginPath();
    g.arc(x(n - 1), y(history[n - 1]), 1.5, 0, Math.PI * 2);
    g.fillStyle = 'rgba(246, 243, 233, 0.95)';
    g.fill();
  }

  setTrails(on) {
    this.btnTrails.setAttribute('aria-pressed', String(on));
  }

  dismissHint() {
    if (this.hintGone) return;
    this.hintGone = true;
    this.hint.classList.add('gone');
  }

  /** Sem isso, uma exceção deixa a tela parada sem dizer nada. */
  showError(err) {
    const el = this.hint;
    if (!el) return;
    el.classList.remove('gone');
    el.style.textTransform = 'none';
    el.style.letterSpacing = '0.02em';
    el.style.color = '#ffd7cc';
    el.style.maxWidth = '86vw';
    el.textContent = 'error: ' + ((err && err.message) || err);
  }
}
