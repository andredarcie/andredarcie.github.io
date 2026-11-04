// Itens do inventário (nome e descrição exatamente como aparecem no jogo de 2014), na ordem do
// banco de dados do jogo, que é a ordem em que aparecem no inventário do trailer:
// cano, Chave 14, Chave de bronze, Pequena Chave, Ladrão. A "Chave" do fim aparece sozinha.
// icone = índice no IconSet do RTP do VX Ace (16 por linha, 24x24), ou 'cano' (desenhado).
export const ITENS = {
  cano: { nome: 'Pedaço de cano.', desc: 'Um simples pedaço de cano.', icone: 'cano' },
  chave14: { nome: 'Chave 14', desc: 'Encontrada dentro de uma caixa.', icone: 240 },
  bronze: { nome: 'Chave de bronze', desc: 'Uma simples chave de bronze.', icone: 242 },
  pequena: { nome: 'Pequena Chave', desc: 'Chave de algum armario.', icone: 240 },
  ladrao: { nome: 'Ladrão', desc: 'Encontrado em um armario.', icone: 184 },
  chave: { nome: 'Chave', desc: 'Encontrada no chão.', icone: 240 },
};
