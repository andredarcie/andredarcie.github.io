// Quanto tempo (s reais) um "+N" fica na tela, e a janela em que ganhos seguidos do
// mesmo recurso se somam no mesmo número em vez de empilhar vários "+1".
const GAIN_SECONDS = .95;
const MERGE_SECONDS = .45;

// O "+N" que salta do lado de comida, madeira ou fuzis quando o estoque sobe: o
// número estoura grande, assenta e sobe sumindo, e a etiqueta do recurso dá um pulo
// e acende de verde — a sensação de ganho, no lugar exato onde o recurso cresceu.
// Gasto não mostra nada. Ganhos em sequência (a roça pingando comida, a lenha
// chegando) engordam o mesmo número, que pula de novo a cada soma.
export class ResourceGains {
  #chips = new Map();
  #still = matchMedia('(prefers-reduced-motion: reduce)');

  // chips: { food: elemento .res, ... }
  constructor(chips) {
    for (const [key, chip] of Object.entries(chips)) {
      this.#chips.set(key, { chip, value: null, floater: null, total: 0, age: 0 });
    }
  }

  // Chamado a cada quadro com os valores inteiros mostrados na barra.
  update(values, realDt) {
    for (const [key, entry] of this.#chips) {
      const value = values[key];
      if (entry.floater) {
        entry.age += realDt;
        if (entry.age >= GAIN_SECONDS) {
          entry.floater.remove();
          entry.floater = null;
        }
      }
      // O primeiro valor (início da partida) é só a referência.
      if (entry.value !== null && value > entry.value) this.#gain(entry, value - entry.value);
      entry.value = value;
    }
  }

  #gain(entry, amount) {
    const merging = entry.floater && entry.age < MERGE_SECONDS;
    if (!merging) {
      entry.floater?.remove();
      entry.floater = document.createElement('span');
      entry.floater.className = 'res-gain';
      entry.floater.setAttribute('aria-hidden', 'true');
      entry.chip.append(entry.floater);
      entry.total = 0;
    }
    entry.total += amount;
    entry.age = 0;
    entry.floater.textContent = `+${entry.total}`;
    // Quanto maior o ganho, maior o estouro: +1 é um tique, +100 é festa.
    const size = Math.min(1.55, 1.05 + Math.log10(entry.total + 1) * .22);
    if (this.#still.matches) {
      entry.floater.animate([{ opacity: 1 }, { opacity: 1, offset: .7 }, { opacity: 0 }],
        { duration: GAIN_SECONDS * 1000, fill: 'forwards' });
      return;
    }
    entry.floater.animate([
      { opacity: 0, transform: 'translate(-4px, 4px) scale(.4)' },
      { opacity: 1, transform: `translate(0, -2px) scale(${size})`, offset: .16 },
      { opacity: 1, transform: 'translate(0, -4px) scale(1)', offset: .34 },
      { opacity: 1, transform: 'translate(0, -8px) scale(1)', offset: .7 },
      { opacity: 0, transform: 'translate(0, -16px) scale(.92)' }
    ], { duration: GAIN_SECONDS * 1000, easing: 'cubic-bezier(.2, .8, .3, 1)', fill: 'forwards' });
    const number = entry.chip.querySelector('b');
    number?.animate([
      { transform: 'scale(1)' }, { transform: `scale(${size * .95})`, offset: .3 }, { transform: 'scale(1)' }
    ], { duration: 320, easing: 'cubic-bezier(.3, 1.6, .5, 1)' });
    entry.chip.animate([
      { borderColor: 'var(--hud-life)', boxShadow: '0 2px 0 var(--hud-shadow), 0 0 10px var(--hud-life)' },
      { borderColor: 'var(--hud-seam)', boxShadow: '0 2px 0 var(--hud-shadow), 0 0 0 transparent' }
    ], { duration: 520, easing: 'ease-out' });
  }
}
