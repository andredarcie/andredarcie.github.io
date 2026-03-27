# ArchCard

ArchCard é um protótipo de jogo web em uma única página no qual o jogador monta uma estratégia de arquitetura de software usando cartas como `Monolítico`, `Microsserviços`, `Mensageria`, `CQRS` e `Event Sourcing`.

A proposta combina um visual retro de terminal/CRT com uma mecânica simples de decisão: a cada turno, você recebe um objetivo arquitetural, joga cartas na mesa, ativa sinergias e tenta bater os requisitos de métricas como escalabilidade, disponibilidade, custo operacional e simplicidade.

## Demo do conceito

- Objetivos dinâmicos por turno, como alta disponibilidade, baixo custo operacional, escalabilidade máxima e velocidade de entrega.
- Cartas com atributos positivos e negativos.
- Sinergias entre padrões arquiteturais.
- Pontuação, vidas e progressão por turnos.
- Interface standalone em `HTML + CSS + JavaScript`, sem build step.

## Stack

- `HTML` para estrutura da interface
- `CSS` embutido para identidade visual e animações base
- `JavaScript` puro para estado, regras e renderização
- `GSAP` via CDN para animações
- `Phosphor Icons` via CDN para arte das cartas
- Google Fonts via CDN

## Como executar

Como o projeto é estático, você pode abrir o arquivo diretamente no navegador:

```powershell
start index.html
```

Se preferir servir localmente com um servidor HTTP simples:

```powershell
npx serve .
```

Depois, abra a URL exibida no terminal.

## Como jogar

1. O jogo inicia com 5 cartas na mão e um objetivo aleatório.
2. Cada carta altera as métricas da rodada.
3. Ao selecionar uma carta, ela é jogada automaticamente no primeiro slot vazio da mesa.
4. Você pode descartar uma carta selecionada.
5. Quando a mesa refletir sua estratégia, clique em `Encerrar Turno`.
6. Se a métrica-alvo do objetivo atingir o valor exigido, você ganha pontos.
7. Se falhar, perde uma vida e segue para o próximo turno.

## Mecânicas principais

### Métricas avaliadas

- `Escalabilidade`
- `Disponibilidade`
- `Custo`
- `Simplicidade`

### Exemplos de sinergia

- `Mensageria × Microsserviços`
- `CQRS × Event Sourcing`
- `API Gateway × Microsserviços`
- `Cache Distribuído × Monolítico`

### Regras de pontuação

- O turno avalia a métrica-alvo do objetivo atual.
- Há bônus quando a métrica secundária também atinge o valor exigido.
- Combinar tipos diferentes de cartas adiciona pontuação extra.
- Ao zerar as vidas, o jogo reinicia.

## Estrutura do projeto

```text
.
├── index.html   # aplicação completa: layout, estilos, dados e lógica
└── README.md
```

## Estado atual

Este repositório contém um protótipo funcional e autocontido. Toda a lógica do jogo, os dados das cartas, os objetivos, a interface e as animações estão centralizados em `index.html`.

## Próximos passos possíveis

- Separar `HTML`, `CSS` e `JavaScript` em arquivos próprios
- Adicionar sistema de rounds/fases com dificuldade progressiva
- Persistir pontuação máxima em `localStorage`
- Incluir novos objetivos, cartas e sinergias
- Criar testes para a lógica de pontuação e avaliação de turno
