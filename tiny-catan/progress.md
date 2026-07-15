Original prompt: Pesquise todas as regras de catan na internet e crie um jogo seguido a risca as regras. Crie tiny catan, um jogo web mobile-first para jogar catan contra uma IA. Busque visuais minimalista e use uma lib de icones.

## Pesquisa e decisões

- Fontes oficiais consultadas: livro de regras 2025, página do jogo-base e FAQ oficial CATAN.
- Escopo: jogo-base oficial para 3 jogadores (1 humano + 2 IAs), meta de 10 pontos.
- Visual: mobile-first minimalista, tabuleiro vetorial desenhado nativamente e Lucide Icons.

## TODO

- Implementar tabuleiro, preparação em ordem serpentina e turnos.
- Implementar produção, ladrão/descarte, construções, comércio marítimo e cartas de desenvolvimento.
- Implementar IAs, Maior Estrada/Maior Exército e vitória.
- Testar fluxos principais em navegador e inspecionar screenshots/console.

## Implementado

- Tabuleiro aleatório oficial (19 hexágonos), portos, banco e baralho de 25 cartas.
- Preparação serpentina com recursos do segundo assentamento.
- Turnos, produção, ladrão, descarte, roubo, comércio com IAs e banco/portos.
- Estradas, assentamentos, cidades, todas as cartas de desenvolvimento e limites de peças.
- Maior Estrada com busca em grafo, Maior Exército, pontuação secreta e vitória no próprio turno.
- Duas IAs com escolha de posições, comércio marítimo e prioridades de construção.
- Interface mobile-first, Lucide Icons, guia de regras, diário e hooks de teste.

## Validação pendente

- Concluída: cliente Playwright oficial executado sem erros de console.
- Concluída: preparação completa, turno humano, lançamento, comércio, guia e ciclo das duas IAs.
- Concluída: screenshots desktop e mobile inspecionadas; viewport de 390 px sem overflow horizontal.
- Corrigidos durante o teste: índice de adjacência das estradas, fundo transparente na captura, margens dos portos, retorno correto da carta Construção de Estradas antes dos dados e troca com banco sem estoque.

## Estado final

- Auditoria posterior encontrou diferenças de conformidade a corrigir.

## Correções de conformidade em andamento

- Implementado sorteio oficial do jogador inicial, incluindo desempate e ordem serpentina relativa ao vencedor.
- Pontos secretos das IAs não aparecem mais no placar nem no estado textual.
- Comércio marítimo do mesmo recurso por ele próprio agora é rejeitado.
- Pendente: vitória imediata por Maior Exército e janela completa de negociação durante turnos das IAs.

## Correções de conformidade concluídas

- Vitória é verificada imediatamente após o Cavaleiro resolver o ladrão e atribuir Maior Exército.
- IAs agora apresentam propostas legais ao humano durante a própria fase de ações.
- Durante a janela de negociação da IA, o humano pode fazer uma contraproposta ao jogador ativo.
- Trocas entre jogadores e trocas marítimas das IAs registram publicamente recursos e quantidades.
- Testes direcionados confirmaram: PV secreto de IA não vaza; troca marítima do mesmo recurso não consome cartas; terceiro Cavaleiro concede vitória imediata; ciclo completo retorna ao humano.
- Captura mobile da proposta da IA inspecionada, sem overflow ou erros de console.

## Estado final após auditoria

- Todos os itens divergentes do checklist do jogo-base foram corrigidos.
- O jogo permanece um site estático sem dependências de build.
- Nenhum TODO conhecido para o escopo de 3 jogadores do jogo-base oficial.

## Correção de travamento do turno das IAs

- Relato recebido: a partida permaneceu em “AGUARDE · As IAs estão jogando” sem avançar.
- Os callbacks das IAs agora passam por um agendador único, que cancela timers obsoletos e recupera exceções.
- Um watchdog retoma automaticamente estados de IA sem callback pendente; “Avançar agora” oferece saída manual imediata.
- Reiniciar a partida cancela timers da ilha anterior, evitando ações atrasadas no novo jogo.
- Validação concluída: preparação, turno humano, retomada durante IA, ciclo das duas IAs e retorno ao turno 2; nenhum erro de console.
- Capturas desktop e mobile inspecionadas; estado visual e estado textual permaneceram consistentes.

## Motivos visuais para construções bloqueadas

- Estrada, Assentamento, Cidade e Desenvolvimento agora exibem diretamente o motivo exato do bloqueio.
- Motivos cobertos: recursos faltantes e respectivas quantidades, local/conexão indisponível, pré-requisito de assentamento, limite de peças e baralho esgotado.
- O estado textual expõe a mesma disponibilidade e o mesmo motivo mostrado na interface.
- Captura mobile da fase principal inspecionada; textos permanecem legíveis, sem overflow, e o console não apresentou erros.
