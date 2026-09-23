// Tamanho da cabana pela quantidade de moradores: até 4 é o tamanho base, e cada
// morador a mais alarga a cabana, para a tribo inteira caber sempre. A simulação usa
// a mesma conta para saber onde fica a porta, e a cena para montar as paredes.
export function hutSize(capacity) {
  const extra = Math.max(0, capacity - 4);
  return {
    width: Math.min(48, 24 + extra * 2.2),
    depth: Math.min(32, 20 + extra * 1.1)
  };
}
