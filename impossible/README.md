# Projeto Impossivel

Projeto em `HTML`, `CSS` e `JavaScript` que usa algoritmo genetico e rede neural para aprender a jogar o mini jogo Nur, de Diego Penha.

## O que tem nesta versao

- fase fixa e curta em `canvas`
- controle manual com teclado
- rede neural pequena de topologia fixa
- treino por populacao, elitismo, crossover e mutacao
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

Esta e uma versao simplificada do conceito original. Ela preserva a ideia central de treinar uma IA para jogar, mas nao implementa leitura de memoria de emulador nem NEAT completo com topologia mutavel.
