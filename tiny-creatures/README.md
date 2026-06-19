# Tiny Creatures ⚔

Mini simulação de **algoritmo genético** no navegador. Um bando de criaturas —
batizadas com nomes de amigos — parte da base da grade e evolui, geração após
geração, até alguém alcançar a **Espada Sagrada** no topo.

Sem build, sem dependências: é só HTML, CSS e JavaScript puro. As únicas
requisições externas são as fontes do Google (Press Start 2P / Share Tech Mono).

## Como rodar

Abra o `index.html` no navegador. No site publicado fica em
`/tiny-creatures/`.

## Como funciona o algoritmo genético

Cada criatura é um **genoma**: uma lista de `GLEN` (50) movimentos `U/D/L/R`
executados um por passo. A **fitness** é a distância de Manhattan até a espada
(quanto menor, melhor). Ao fim de cada geração:

1. **Ranking** — a população (`POP` = 20) é ordenada pela distância final.
2. **Seleção** — os 10 melhores sobrevivem; os 10 piores são eliminados.
3. **Elitismo** — os `ELITE` (2) melhores são clonados sem alteração.
4. **Crossover** — o restante nasce de dois pais sobreviventes, cortando os
   genomas num ponto aleatório (corte de ponto único).
5. **Mutação** — cada gene do filho tem chance `MUT` (13%) de virar uma direção
   aleatória.

A simulação encerra quando uma criatura pisa na espada, ou recomeça uma nova
geração quando os 50 passos se esgotam. As telas de **ranking** e de
**crossover + mutação** mostram o processo visualmente, gene a gene.

### Parâmetros (em `main.js`)

| Constante | Valor | Significado |
|-----------|-------|-------------|
| `POP`     | 20    | Tamanho da população por geração |
| `GLEN`    | 50    | Movimentos por genoma |
| `MUT`     | 0.13  | Chance de mutação por gene |
| `ELITE`   | 2     | Melhores clonados sem mutação |
| `GOAL`    | (9,0) | Posição da espada (topo, centro) |
| `START`   | (9,18)| Ponto de partida (base, centro) |

## Controles

- **VEL** — seis níveis de velocidade da simulação.
- **⏸ PAUSAR / ▶ CONTINUAR** — congela ou retoma a geração atual.
- **↺ REINICIAR** — zera para a geração 1 com uma população nova e aleatória.

## Estrutura dos arquivos

| Arquivo | Responsabilidade |
|---------|------------------|
| `index.html` | Apenas a marcação (grade, painel, overlays). |
| `styles.css` | Todo o visual (paleta PICO-8, layout responsivo, animações). |
| `sprites.js` | Sprite das criaturas, lista de nomes, paleta de cores e os helpers de identidade do GA. Módulo UMD que expõe `window.TinyCreaturesSprites`. |
| `main.js` | Loop da simulação, algoritmo genético, renderização e controles. |

> Os **nomes dos amigos** ficam em `sprites.js`, na constante `CREATURE_NAMES`.
> Para adicionar ou trocar alguém, edite essa lista.
