import { BRAIN_OUTPUTS } from '../config/brain.js';
import { MAX_POPULATION } from '../config/reproduction.js';
import { Dom } from './Dom.js';
import { Format } from './Format.js';

const decimal = (value, digits = 2) => value.toFixed(digits).replace('.', ',');

// A seção "Redes neurais" do painel de evolução: resumo das redes, o gráfico da
// média de cada decisão ao longo do tempo (de -1 a 1, a saída do tanh) e uma linha
// por espécie com tamanho, cota de vagas pela aptidão e se guarda a Chama.
export class BrainEvolutionPanel {
  #root;
  #canvas;
  #theme;
  #stats;
  #series;
  #legend = new Map();

  constructor({ root, theme, brainStatistics }) {
    this.#root = root;
    this.#canvas = root.querySelector('#brain-plot');
    this.#theme = theme;
    this.#stats = brainStatistics;
    this.#series = BRAIN_OUTPUTS.map((output, i) => ({ ...output, color: theme.chartColor(i) }));
    this.#buildLegend();
  }

  render() {
    const history = this.#stats.history;
    const latest = this.#stats.latest;
    if (!latest) return;
    this.#root.querySelector('#brain-evolution-summary').textContent =
      `${latest.species.length} ${latest.species.length === 1 ? 'espécie' : 'espécies'} · ` +
      `${decimal(latest.hidden, 1)} neurônios ocultos e ${decimal(latest.links, 0)} ligações por rede, em média · ` +
      `aptidão média ${decimal(latest.fitness)} (melhor ${decimal(latest.bestFitness)})`;
    const first = history.find(sample => sample.outputs) ?? latest;
    for (const [i, series] of this.#series.entries()) {
      const row = this.#legend.get(series.key);
      const now = latest.outputs?.[i], start = first.outputs?.[i];
      if (now === undefined || start === undefined) {
        row.value.textContent = '—';
        continue;
      }
      const change = now - start;
      row.value.textContent = `${decimal(now)} ${Math.abs(change) < .01 ? '=' : change > 0 ? '↑' : '↓'}`;
    }
    this.#renderSpecies(latest.species);
    this.#draw(history);
  }

  #buildLegend() {
    const legend = this.#root.querySelector('#brain-legend');
    for (const series of this.#series) {
      const item = Dom.create('span', 'brain-legend-item');
      const swatch = Dom.create('span', 'series-swatch');
      swatch.style.backgroundColor = series.color;
      const value = Dom.create('span', 'brain-legend-value');
      item.append(swatch, document.createTextNode(series.label), value);
      legend.append(item);
      this.#legend.set(series.key, { value });
    }
  }

  #renderSpecies(species) {
    const list = this.#root.querySelector('#species-list');
    list.replaceChildren(...species.slice(0, 8).map(entry => {
      const row = Dom.create('div', 'species-row');
      const name = Dom.create('span', 'species-name');
      name.textContent = `Espécie ${entry.id}`;
      if (entry.keepers) {
        const mark = Dom.create('span', 'tribe-flame');
        mark.textContent = ' chama';
        name.append(mark);
      }
      // Barra: tamanho da espécie no teto; o risco é a cota que a aptidão dá a ela.
      const bar = Dom.create('span', 'species-bar');
      const fill = Dom.create('span', 'species-fill');
      fill.style.width = `${Math.min(100, entry.size / MAX_POPULATION * 100)}%`;
      const quota = Dom.create('span', 'species-quota');
      quota.style.left = `${Math.min(100, entry.quota / MAX_POPULATION * 100)}%`;
      bar.append(fill, quota);
      const figures = Dom.create('small', 'species-figures');
      // Situação no NEAT: carência (nova), estagnada (sem cota) ou há quanto tempo
      // não bate o próprio recorde de aptidão.
      const status = entry.fresh ? 'nova, em carência'
        : entry.stagnant ? `estagnada há ${decimal(entry.stalledFor, 1)} dias, sem cota`
          : `recorde há ${decimal(entry.stalledFor, 1)} dias`;
      figures.textContent = `${entry.size} bichos · cota ${entry.fresh ? 'livre' : Math.round(entry.quota)} · ` +
        `aptidão ${decimal(entry.meanFitness)} · ${status}`;
      if (entry.stagnant) row.classList.add('species-stagnant');
      row.append(name, bar, figures);
      return row;
    }));
  }

  #draw(history) {
    const canvas = this.#canvas;
    const paint = this.#theme.paint;
    const samples = history.filter(sample => sample.outputs);
    const width = Math.max(1, canvas.clientWidth), height = Math.max(1, canvas.clientHeight);
    const pixelRatio = devicePixelRatio || 1;
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    const graph = canvas.getContext('2d');
    graph.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    graph.clearRect(0, 0, width, height);
    const left = 40, right = 16, top = 24, bottom = 32;
    const plotWidth = Math.max(1, width - left - right), plotHeight = Math.max(1, height - top - bottom);
    graph.font = `10px ${this.#theme.bodyFont}`;
    graph.textBaseline = 'middle';
    graph.strokeStyle = paint.ink;
    graph.fillStyle = paint.ink;
    for (const value of [-1, -.5, 0, .5, 1]) {
      const y = top + (1 - value) / 2 * plotHeight;
      graph.globalAlpha = value === 0 ? .35 : .12;
      graph.beginPath();
      graph.moveTo(left, y);
      graph.lineTo(left + plotWidth, y);
      graph.stroke();
      graph.globalAlpha = .65;
      graph.textAlign = 'right';
      graph.fillText(decimal(value, value % 1 ? 1 : 0), left - 6, y);
    }
    graph.textAlign = 'left';
    graph.fillText('média de cada decisão (−1 a 1)', left, 11);
    if (samples.length < 2) {
      graph.globalAlpha = .65;
      graph.textAlign = 'center';
      graph.fillText('amostrando…', left + plotWidth / 2, top + plotHeight / 2 - 12);
      graph.globalAlpha = 1;
      return;
    }
    const firstTime = samples[0].time, lastTime = Math.max(firstTime + 10, samples[samples.length - 1].time);
    graph.textAlign = 'left';
    graph.fillText(Format.clock(firstTime), left, height - 14);
    graph.textAlign = 'right';
    graph.fillText(Format.clock(lastTime), left + plotWidth, height - 14);
    graph.globalAlpha = 1;
    graph.lineWidth = 2;
    graph.lineJoin = 'round';
    for (const [i, series] of this.#series.entries()) {
      graph.strokeStyle = series.color;
      graph.beginPath();
      samples.forEach((sample, index) => {
        const x = left + (sample.time - firstTime) / (lastTime - firstTime) * plotWidth;
        const y = top + (1 - sample.outputs[i]) / 2 * plotHeight;
        if (index === 0) graph.moveTo(x, y); else graph.lineTo(x, y);
      });
      graph.stroke();
    }
  }
}
