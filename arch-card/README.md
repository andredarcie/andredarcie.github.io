# ArchCard

ArchCard e um prototipo de card game web sobre arquitetura de software. Cada rodada apresenta uma meta simples, um limite de custo e agora uma economia de risco baseada em `Poder` e `Divida`.

A ideia central do jogo passou a ser:

- voce comeca o turno com `0P`
- cartas boas gastam `Poder`
- cartas ruins geram `Poder`, mas tambem trazem `Divida`
- voce precisa decidir quanta gambiarra aceita para montar uma mesa forte

## Loop atual

1. Leia a meta, o bonus e o custo maximo.
2. Veja seu `Poder` e sua `Divida` atual.
3. Use cartas `boost` para gerar poder.
4. Use cartas `core` para transformar esse poder em arquitetura forte.
5. Use cartas `mitigation` para limpar parte da bagunca.
6. Encerre o turno e receba pontos, penalidade de divida e possivel upgrade.

## Regras principais

- `Poder`: recurso do turno usado para baixar cartas fortes.
- `Divida`: penalidade acumulada da run causada por atalhos.
- `Custo Maximo`: limite operacional do objetivo atual.
- `Boost`: cartas ruins ou arriscadas que geram poder.
- `Core`: cartas fortes que consomem poder.
- `Mitigation`: cartas que reduzem divida e estabilizam a mesa.

## Exemplos de carta

- `Go Horse`: gera muito `Poder`, mas adiciona `Divida`.
- `Script Magico`: gera pouco poder com risco leve.
- `Event Sourcing`: carta forte, cara e travada sem poder suficiente.
- `Observabilidade`: nao gera poder, mas reduz divida.

## Stack

- `index.html` para estrutura
- `style.css` para visual e layout
- `game-rules.js` para regras puras do jogo
- `script.js` para estado, renderizacao e interacoes
- `GSAP` via CDN para animacoes
- `Phosphor Icons` via CDN para arte das cartas

## Como executar

```powershell
start index.html
```

Ou por HTTP:

```powershell
npx serve .
```

## Estrutura

```text
.
|-- index.html
|-- style.css
|-- game-rules.js
|-- script.js
|-- rules-smoke-test.js
|-- IMPROVEMENT_PLAN.md
|-- RISK_ECONOMY_PLAN.md
|-- progress.md
`-- README.md
```

## Validacao

```powershell
node --check game-rules.js
node --check script.js
node rules-smoke-test.js
```

## Proximos passos naturais

- balancear melhor a relacao entre `Poder`, `Divida` e pontuacao
- adicionar mais cartas `boost` e `mitigation`
- criar objetivos que punem mais risco ou premiam jogo limpo
- introduzir upgrades focados em economia de risco
