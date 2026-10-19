// Render de uma faixa gerada → AudioBuffer em loop perfeito (a cauda depois do
// fim do loop é somada ao começo) e com o volume igualado ao da música
// original (mediana do RMS por janela, em dB). Roda em pedaços de ~8 ms com
// pausas, para não segurar os quadros do jogo enquanto gera.
import { Mesa, tocarEvento } from './sintese.js';
import { Tempo } from './partitura.js';

const CAUDA = 4;     // segundos além do loop (reverb, eco, notas soltas)
const FATIA_MS = 8;  // trabalho contínuo máximo antes de devolver a vez

// devolve a vez ao navegador sem o atraso mínimo de 4 ms do setTimeout
const canalPausa = typeof MessageChannel === 'function' ? new MessageChannel() : null;
const filaPausa = [];
if (canalPausa) canalPausa.port1.onmessage = () => filaPausa.shift()?.();
const pausa = () => new Promise((r) => { if (canalPausa) { filaPausa.push(r); canalPausa.port2.postMessage(0); } else setTimeout(r, 0); });

export async function renderizar(faixa) {
  const tempo = new Tempo(faixa.tempo);
  const loop = tempo.duracao(faixa.compassos);
  const sr = faixa.taxa ?? 24000;
  const mesa = new Mesa(sr, Math.ceil((loop + CAUDA) * sr), faixa.mesa);
  faixa.compor({ mesa, tempo, loop });

  let marca = performance.now();
  const talvezPausar = async () => {
    if (performance.now() - marca > FATIA_MS) { await pausa(); marca = performance.now(); }
  };
  for (const evento of mesa.eventos) {
    tocarEvento(mesa, evento);
    await talvezPausar();
  }
  mesa.cache.clear();
  for (const _ of mesa.efeitos()) await talvezPausar();

  const n = Math.round(loop * sr);
  const canais = faixa.mono ? 1 : 2;
  const saida = new AudioBuffer({ numberOfChannels: canais, length: n, sampleRate: sr });
  const fontes = faixa.mono ? [mesa.esq.map((v, i) => (v + mesa.dir[i]) / 2)] : [mesa.esq, mesa.dir];
  fontes.forEach((d, c) => {
    const o = saida.getChannelData(c);
    o.set(d.subarray(0, n));
    for (let i = n; i < d.length; i++) o[i - n] += d[i];
  });
  ajustarVolume(saida, faixa.volumeDb ?? -24);
  return saida;
}

// mediana do RMS em janelas de 4096 → alvo; picos acima de 0,9 saturam suave
function ajustarVolume(buffer, alvoDb) {
  const canais = [...Array(buffer.numberOfChannels)].map((_, c) => buffer.getChannelData(c));
  const n = buffer.length, j = 4096, rms = [];
  for (let i = 0; i + j <= n; i += j) {
    let s = 0;
    for (const d of canais) for (let k = i; k < i + j; k++) s += d[k] * d[k];
    rms.push(Math.sqrt(s / (j * canais.length)));
  }
  rms.sort((a, b) => a - b);
  const mediana = rms[Math.floor(rms.length / 2)] || 1e-9;
  const ganho = 10 ** (alvoDb / 20) / mediana;
  for (const d of canais) {
    for (let k = 0; k < n; k++) {
      const v = d[k] * ganho;
      d[k] = Math.abs(v) < 0.9 ? v : Math.sign(v) * (0.9 + 0.1 * Math.tanh((Math.abs(v) - 0.9) / 0.1));
    }
  }
}
