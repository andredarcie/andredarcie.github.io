// Cidades.
//
// O manifesto não escreve "Morro de São Paulo" em cada uma das 3.292 fotos:
// guarda uma tabela de vinte e cinco nomes e um índice por foto. São 11 KB em
// vez de 66, e o manifesto está no caminho crítico — a página não desenha nada
// antes dele chegar.
//
// O preço é uma indireção, e ela se paga uma vez só: `aplicarCidades` resolve o
// índice de volta para o nome em cada foto, no carregamento, e daí para a frente
// todo o resto do site lê `p.cidade` como se sempre tivesse estado lá.
//
// SOBRE A CONFIANÇA: a cidade sai de ponto-em-polígono contra a malha municipal
// do IBGE, offline, igual ao estado. Ela herda a mesma ressalva — uma foto sem
// GPS empresta a posição da vizinha no tempo, e nesse caso a cidade é um palpite
// mais forte que o estado era. Por isso `loc` continua ao lado dela em toda
// interface: dizer "Recife" com a mesma cara para uma medição e para um chute
// seria a única desonestidade possível aqui.

let tabela = [];

/** Resolve a tabela para dentro das fotos. Devolve quantas cidades existem. */
export function aplicarCidades(manifesto) {
  tabela = manifesto?.cidades ?? [];
  for (const p of manifesto?.photos ?? []) {
    const c = tabela[p.cid];
    p.cidade = c ? c.n : null;
  }
  return tabela.length;
}

/**
 * As cidades de um conjunto de fotos, da mais fotografada para a menos.
 *
 * Ordenar por volume, e não por alfabeto, é o que faz a lista dizer alguma
 * coisa: numa semana em Pernambuco, "Recife, Olinda" é a semana; "Barreiros,
 * Cabo de Santo Agostinho, Ipojuca, Olinda, Recife" é um índice remissivo.
 */
export function cidadesDe(fotos, limite = Infinity) {
  const contagem = new Map();
  for (const p of fotos) {
    if (!p.cidade) continue;
    contagem.set(p.cidade, (contagem.get(p.cidade) ?? 0) + 1);
  }
  return [...contagem.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limite)
    .map(([nome, n]) => ({ nome, n }));
}

/**
 * A mesma lista, já escrita — com "e mais N" quando não coube tudo.
 * Devolve string vazia se nenhuma foto tiver cidade, para quem chama poder
 * simplesmente não desenhar a linha.
 */
export function listarCidades(fotos, limite = 3) {
  const todas = cidadesDe(fotos);
  if (!todas.length) return '';
  const mostradas = todas.slice(0, limite).map((c) => c.nome);
  const resto = todas.length - mostradas.length;
  return resto > 0 ? `${mostradas.join(', ')} e mais ${resto}` : mostradas.join(', ');
}
