// Itens do inventário (nome e descrição exatamente como aparecem no jogo de 2014), na ordem do
// banco de dados do jogo, que é a ordem em que aparecem no inventário do trailer:
// cano, Chave 14, Chave de bronze, Pequena Chave, Ladrão. A "Chave" do fim aparece sozinha.
// icone = índice no IconSet do RTP do VX Ace (16 por linha, 24x24), ou 'cano' (desenhado).
// genero = 'o' | 'a', para o aviso "adicionado/adicionada". Ortografia corrigida (armário etc.).
export const ITENS = {
  cano: { nome: 'Pedaço de cano', desc: 'Um simples pedaço de cano.', icone: 'cano', genero: 'o' },
  chave14: { nome: 'Chave 14', desc: 'Encontrada dentro de uma caixa.', icone: 240, genero: 'a' },
  bronze: { nome: 'Chave de bronze', desc: 'Uma simples chave de bronze.', icone: 242, genero: 'a' },
  pequena: { nome: 'Chave pequena', desc: 'Chave de algum armário.', icone: 240, genero: 'a' },
  ladrao: { nome: 'Ladrão', desc: 'Encontrado em um armário.', icone: 184, genero: 'o' },
  chave: { nome: 'Chave', desc: 'Encontrada no chão.', icone: 240, genero: 'a' },
};
