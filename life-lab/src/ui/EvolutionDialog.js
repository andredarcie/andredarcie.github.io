import { GENE_TRAITS, PIGMENT_NAMES } from '../config/genetics.js';
import { Dom } from './Dom.js';
import { Format } from './Format.js';

// O painel "Evolução dos genes": resumo da população, o gráfico, um cartão por gene
// dizendo se ele está sendo selecionado ou só derivando, e as cores (o que aparece
// na arena e o que está guardado no pool genético).
export class EvolutionDialog {
  #root;
  #dialog;
  #legend;
  #stats;
  #readings;
  #plot;
  #theme;
  #traits;
  #visible;
  #rows = new Map();
  #pigmentRows = [];

  constructor({ root, theme, geneStatistics, geneReadings, plot, events }) {
    this.#root = root;
    this.#dialog = root.querySelector('#evolution-dialog');
    this.#legend = root.querySelector('#evolution-legend');
    this.#theme = theme;
    this.#stats = geneStatistics;
    this.#readings = geneReadings;
    this.#plot = plot;
    this.#traits = GENE_TRAITS.map((trait, i) => ({ ...trait, color: theme.chartColor(i) }));
    this.#visible = new Set(this.#traits.map(trait => trait.key));
    root.querySelector('#evolution-toggle').addEventListener('click', () => {
      this.#dialog.showModal();
      this.#sortLegend();
      this.render();
    });
    root.querySelector('#evolution-close').addEventListener('click', () => this.#dialog.close());
    events.on('genesSampled', () => this.refreshIfOpen());
    this.#buildLegend();
    this.#buildPigmentRows();
  }

  get open() {
    return this.#dialog.open;
  }

  refreshIfOpen() {
    if (this.#dialog.open) this.render();
  }

  render() {
    const stats = this.#stats;
    if (!stats.history.length || !stats.baseline) return;
    const first = stats.history[0], latest = stats.latest;
    const readings = new Map(this.#traits.map(trait => [trait.key, this.#readings.read(trait.key, latest)]));
    const scale = Math.max(2, ...[...readings.values()].map(r => r ? Math.abs(r.change) : 0));
    const selectedCount = [...readings.values()].filter(r => r?.selected).length;
    const measurable = [...readings.values()].some(r => r && r.threshold !== null);

    this.#root.querySelector('#evolution-summary').textContent =
      `${latest.count} bichos vivos · geração média ${(latest.generation ?? 0).toFixed(1).replace('.', ',')} · ` +
      `variação genética ${this.#readings.diversity(latest)} do início · ` +
      `histórico ${Format.clock(first.time)}–${Format.clock(latest.time)}`;
    this.#root.querySelector('#evolution-headline').textContent = !measurable
      ? 'Ainda não passaram gerações suficientes para separar seleção de acaso.'
      : selectedCount
        ? `${selectedCount} de ${this.#traits.length} genes mudaram mais do que o acaso explicaria.`
        : `Nenhum dos ${this.#traits.length} genes mudou mais do que o acaso explicaria — por enquanto é só deriva.`;

    for (const trait of this.#traits) {
      this.#renderTraitRow(trait, readings.get(trait.key), latest.spreads?.[trait.key], scale);
    }
    this.#renderPigments(latest);
    this.#plot.draw(this.#traits, this.#visible);
  }

  #renderTraitRow(trait, reading, spread, scale) {
    const row = this.#rows.get(trait.key);
    row.range.textContent = spread
      ? `entre ${Format.geneValue(trait.key, spread.min)} e ${Format.geneValue(trait.key, spread.max)}`
      : '';
    if (!reading) {
      row.current.textContent = 'sem vivos';
      row.delta.textContent = '—';
      row.verdict.textContent = '';
      row.bar.style.width = '0%';
      row.bar.classList.remove('is-selected');
      return;
    }
    const { change, threshold, selected } = reading;
    const magnitude = Math.min(1, Math.abs(change) / scale) * 50;
    row.bar.style.width = `${magnitude}%`;
    row.bar.style.left = `${change >= 0 ? 50 : 50 - magnitude}%`;
    row.bar.classList.toggle('is-selected', selected);
    row.current.textContent = Format.geneValue(trait.key, reading.value);
    row.delta.textContent = `${change >= 0 ? '↑' : '↓'} ${Math.abs(change).toFixed(1).replace('.', ',')}%`;
    row.delta.classList.toggle('is-selected', selected);
    row.verdict.textContent = selected
      ? (change > 0 ? 'os alelos maiores estão vencendo' : 'os alelos menores estão vencendo')
      : threshold === null ? 'sem histórico suficiente'
        : `dentro do acaso (a deriva explica até ${threshold.toFixed(1).replace('.', ',')}%)`;
  }

  #renderPigments(latest) {
    for (const [index, row] of this.#pigmentRows.entries()) {
      const pigment = latest.pigments?.[index] ?? { expressed: 0, allele: 0 };
      const start = this.#stats.pigmentBaseline?.[index] ?? { expressed: 0, allele: 0 };
      row.expressedFill.style.width = `${pigment.expressed}%`;
      row.expressedStart.style.left = `${start.expressed}%`;
      row.expressed.textContent = Format.share(pigment.expressed);
      row.alleleFill.style.width = `${pigment.allele}%`;
      row.alleleStart.style.left = `${start.allele}%`;
      row.allele.textContent = Format.share(pigment.allele);
    }
  }

  // Os genes que mais andaram sobem para o topo da lista. A ordem só muda quando o
  // modal abre: reordenar a cada segundo faria os cartões pularem durante a leitura.
  #sortLegend() {
    const stats = this.#stats;
    if (!stats.history.length || !stats.baseline) return;
    const latest = stats.latest;
    const ordered = [...this.#traits].sort((a, b) =>
      Math.abs(this.#readings.read(b.key, latest)?.change ?? 0) -
      Math.abs(this.#readings.read(a.key, latest)?.change ?? 0));
    for (const trait of ordered) this.#legend.append(this.#rows.get(trait.key).button);
  }

  #buildLegend() {
    for (const trait of this.#traits) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'series-toggle';
      button.setAttribute('aria-pressed', 'true');

      const name = Dom.create('span', 'series-name');
      const swatch = Dom.create('span', 'series-swatch');
      swatch.style.backgroundColor = trait.color;
      const delta = Dom.create('span', 'series-delta');
      name.append(swatch, document.createTextNode(trait.label), delta);

      // Barra divergente: o lado em que ela cresce já diz a direção, então a cor
      // fica livre para dizer outra coisa — se a mudança passou da deriva ou não.
      const gauge = Dom.create('span', 'series-gauge');
      const bar = Dom.create('span', 'series-bar');
      gauge.append(Dom.create('span', 'series-axis'), bar);

      const verdict = Dom.create('small', 'series-verdict');
      const values = Dom.create('small', 'series-values');
      const current = document.createElement('span');
      const range = document.createElement('span');
      values.append(current, range);

      button.append(name, gauge, verdict, values);
      button.addEventListener('click', () => {
        if (this.#visible.has(trait.key)) this.#visible.delete(trait.key);
        else this.#visible.add(trait.key);
        button.setAttribute('aria-pressed', String(this.#visible.has(trait.key)));
        this.render();
      });
      this.#legend.append(button);
      this.#rows.set(trait.key, { button, bar, delta, verdict, current, range });
    }
  }

  #buildPigmentRows() {
    const list = this.#root.querySelector('#pigment-list');
    const head = Dom.create('div', 'pigment-row pigment-head');
    for (const title of ['', 'aparece na arena', 'carrega o alelo']) {
      const cell = document.createElement('span');
      cell.textContent = title;
      head.append(cell);
    }
    list.append(head);
    for (const [index, name] of PIGMENT_NAMES.entries()) {
      const color = this.#theme.pigments[index];
      const row = Dom.create('div', 'pigment-row');
      const swatch = Dom.create('span', 'pigment-swatch');
      swatch.style.backgroundColor = color;
      const label = Dom.create('span', 'pigment-label');
      label.append(swatch, document.createTextNode(name));

      // O risco marca onde a cor começou: barra além dele é ganho, aquém é perda.
      const expressedBar = Dom.create('span', 'pigment-bar');
      const expressedFill = Dom.create('span', 'pigment-fill');
      expressedFill.style.backgroundColor = color;
      const expressedStart = Dom.create('span', 'pigment-start');
      expressedBar.append(expressedFill, expressedStart);
      const expressed = Dom.create('span', 'pigment-figure');

      const alleleBar = Dom.create('span', 'pigment-bar');
      const alleleFill = Dom.create('span', 'pigment-fill is-pool');
      alleleFill.style.backgroundColor = color;
      const alleleStart = Dom.create('span', 'pigment-start');
      alleleBar.append(alleleFill, alleleStart);
      const allele = Dom.create('span', 'pigment-figure');

      row.append(label, expressedBar, expressed, alleleBar, allele);
      list.append(row);
      this.#pigmentRows.push({ expressedFill, expressedStart, expressed, alleleFill, alleleStart, allele });
    }
  }
}
