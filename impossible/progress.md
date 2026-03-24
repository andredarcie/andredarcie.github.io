Original prompt: adaptar este projeto para usar uma grade de sensores estilo MarI/O.

- Planejado: trocar os sensores agregados por uma grade local ao redor do jogador.
- Planejado: atualizar a UI para resumir a grade e evitar inconsistencias visuais.
- Feito: `src/evaluator.js` agora gera uma grade 9x9 centrada no jogador, com `1` para bloco solido, `-1` para vazio perigoso ao nivel do chao e `0` para vazio seguro.
- Feito: `src/genome.js` passou a derivar `INPUT_COUNT` dos labels da grade e aumentou a camada escondida para 12 neuronios.
- Feito: `src/renderer.js`, `src/ui.js`, `index.html` e `README.md` foram ajustados para refletir a nova leitura espacial.
- Validado: `node --check` em `src/evaluator.js`, `src/genome.js`, `src/ui.js`, `src/renderer.js` e `src/main.js`.
- Validado: carregamento funcional no navegador em `http://127.0.0.1:8001/index.html`, com treino ativo e modos `Manual Play` e `Watch Best` sem regressao funcional observada.
- Observacao: o console ainda mostra apenas `favicon.ico` 404 do servidor estatico, sem erro funcional da aplicacao.
- Feito: `src/nn.js`, `src/genome.js` e `src/genetic.js` foram reescritos para NEAT com genes, numeros de inovacao, mutacao estrutural, crossover por inovacao e especiacao.
- Feito: `src/main.js` e `src/ui.js` agora consomem um grafo de rede dinamico, incluindo no escondidos variaveis e conexoes arbitrarias.
- Feito: `src/storage.js` mudou a chave de persistencia para evitar carregar snapshots antigos da rede fixa.
- Feito: `src/evaluator.js` agora normaliza conflito `Left` + `Right`, escolhendo a saida mais forte.
- Validado: `node --check` em `src/nn.js`, `src/genome.js`, `src/genetic.js`, `src/main.js`, `src/ui.js` e `src/evaluator.js`.
- Validado: navegador em `http://127.0.0.1:8002/index.html` com treino NEAT ativo, vitoria detectada, `Watch Best` funcional e `Manual Play` funcional.
