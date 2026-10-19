// Tempo musical das faixas geradas: compasso, batida e swing → segundos, e
// nomes de nota → MIDI.

const NOMES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

// 'D4', 'C#5', 'Bb2' → número MIDI (C4 = 60)
export function m(nome) {
  const r = /^([A-G])([#b]?)(-?\d)$/.exec(nome);
  if (!r) throw new Error(`nota inválida: ${nome}`);
  return 12 * (Number(r[3]) + 1) + NOMES[r[1]] + (r[2] === '#' ? 1 : r[2] === 'b' ? -1 : 0);
}

// lista de nomes → lista MIDI ('A2 C3 E3' ou array); '.' é pausa (null)
export const ms = (texto) => (Array.isArray(texto) ? texto : texto.trim().split(/\s+/)).map((n) => (n === '.' ? null : m(n)));

export class Tempo {
  // bpm; batidasPorCompasso; swing = posição da colcheia de contratempo (0,5 reto)
  constructor({ bpm, batidas = 4, swing = 0.5 }) {
    this.bpm = bpm; this.batidas = batidas; this.swing = swing;
    this.batida = 60 / bpm;
  }

  // segundos no compasso c (0…), batida b (pode ser fracionária: 1.5 é o contratempo)
  t(c, b = 0) {
    const inteira = Math.floor(b), frac = b - inteira;
    // swing só move o contratempo de colcheia; o resto proporcional
    const f = frac < 0.5 ? frac * 2 * this.swing : this.swing + (frac - 0.5) * 2 * (1 - this.swing);
    return (c * this.batidas + inteira + f) * this.batida;
  }

  // duração de n batidas
  d(n) { return n * this.batida; }

  duracao(compassos) { return compassos * this.batidas * this.batida; }
}
