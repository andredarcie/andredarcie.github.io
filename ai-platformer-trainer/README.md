# AI Platformer Trainer

App web que usa `NEAT` (`NeuroEvolution of Augmenting Topologies`) para treinar uma IA a jogar um mini platformer.

No projeto, o NEAT comeca com redes pequenas e evolui a populacao ao longo das geracoes por meio de selecao, crossover e mutacao. Alem de ajustar pesos, ele tambem pode alterar a estrutura da rede, adicionando novas conexoes e novos nos quando isso melhora o comportamento do agente.

## O que tem nesta versao

- fase fixa e curta em `canvas`
- controle manual com teclado
- treino com `NEAT`, incluindo mutacao de pesos e mudancas estruturais na rede
- especiacao, crossover por genes e selecao por fitness
- modo para assistir ao melhor agente encontrado
- persistencia do melhor agente em `localStorage`
- modo turbo sem renderizacao para acelerar o treino

## Como executar

Use qualquer servidor estatico local na raiz do projeto. Exemplo com Python:

```powershell
python -m http.server 8000
```

Depois abra:

```text
http://127.0.0.1:8000/index.html
```

## Controles

- `Left`: andar para a esquerda
- `Right`: andar para a direita
- `Space`: pular
- `R`: reiniciar no modo manual

## Modos

- `Manual Play`: joga a fase manualmente
- `Watch Best`: assiste ao melhor agente salvo
- `Turbo`: acelera o treino sem renderizar o canvas a cada frame

## Estrutura

- `index.html`: layout principal
- `styles.css`: visual da pagina
- `src/game.js`: loop e estado do jogo
- `src/physics.js`: movimento, gravidade e colisao
- `src/level.js`: mapa da fase
- `src/nn.js`: rede neural feedforward
- `src/genome.js`: genoma e reproducao
- `src/genetic.js`: estado do treino e geracoes
- `src/evaluator.js`: sensores, acoes e fitness
- `src/renderer.js`: renderizacao do canvas
- `src/ui.js`: atualizacao da interface
- `src/storage.js`: persistencia do melhor agente

## Observacao

Esta e uma versao web simplificada, focada no treino e na observacao da evolucao dos agentes dentro de uma fase curta.

Os inputs da rede usam uma grade local de sensores ao redor do jogador, permitindo que o agente leia o espaco proximo antes de decidir andar, pular ou mudar de direcao. A partir disso, o NEAT evolui tanto os pesos quanto a topologia da rede ao longo do tempo, buscando agentes cada vez mais competentes.
