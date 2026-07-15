# Curso Dev do André

Curso individual de engenharia de software na prática — aulas ao vivo, plano sob medida, foco em C# e .NET. Este diretório contém o site do curso e os slides das aulas, feitos para a web.

## Estrutura

| Arquivo | O que é |
|---|---|
| `index.html` | Landing page do curso (conteúdo vem de `content.js`) |
| `content.js` | Textos da landing em um único objeto JS |
| `slides.html` | Índice dos decks de slides |
| `aula-01.html` | Aula 01 · Introdução — Engenharia de Software na Prática |
| `avaliacao-de-nivel.html` | Aula 02 · Diagnóstico — Avaliação de Nível |
| `orientacao-a-objetos.html` | Aula 03 · Fundamentos — Orientação a Objetos |
| `modelagem-oo.html` | Aula 04 · Fundamentos — Modelagem no Mundo Real |
| `solid.html` | Aula 05 · Fundamentos — Princípios SOLID |

Cada deck é um arquivo HTML **standalone**: CSS, SVG e JS inline, sem build e sem dependências (exceto Google Fonts). Publicado via GitHub Pages.

## Como usar os slides

- `←` `→` (ou espaço) navegam; `Home`/`End` pulam para o início/fim
- `F` entra e sai de tela cheia
- Swipe horizontal funciona no celular
- A URL guarda o slide atual no hash (`#5`), então dá para compartilhar um slide específico

## Padrão de qualidade das aulas

A **aula de referência é a Aula 03** (`orientacao-a-objetos.html`): toda aula nova nasce dela, criada pela skill `criar-aula` (`.claude/skills/criar-aula/`), que aplica o passo a passo completo. O padrão detalhado (com as regras técnicas) está no `CLAUDE.md`. O resumo:

1. **Minimalismo tipográfico** — estética "papel": fundo `#f4f1ec`, tinta `#1e1e1e`, títulos em Playfair Display, rótulos e diagramas em IBM Plex Mono. Sem cores de destaque, sem sombras, sem gradientes.
2. **Um conceito por slide** — cada slide tem um título curto e *uma* ideia, quase sempre expressa por um diagrama SVG line-art, não por parágrafos. Todo conceito com diagrama ganha, no slide seguinte, o mesmo exemplo em pseudocódigo elegante.
3. **Diagramas falam a mesma língua** — caixas de traço fino, setas com ponta aberta, tracejado para abstrações/fluxos secundários, pulsos animados para mostrar movimento de dados/mensagens.
4. **Fontes canônicas, traduzidas** — todo conceito é ancorado na melhor referência da área (Alan Kay, Barbara Liskov, Parnas, GoF, Sandi Metz…). Citações aparecem em pt-BR marcadas como "tradução livre", com autor, obra e ano em linha de crédito.
5. **Acessibilidade** — todo SVG tem `aria-label` descritivo, animações respeitam `prefers-reduced-motion`, navegação completa por teclado, alvos de toque ≥ 44px.

## Aulas

- **Aula 01 · Introdução** — a tese do curso (tutorial vs. produção), formato e o mapa dos quatro módulos
- **Aula 02 · Diagnóstico** — júnior, pleno e sênior: o alcance de cada degrau
- **Aula 03 · Fundamentos** — orientação a objetos pelas fontes originais: mensagens, os quatro pilares, composição sobre herança e "diga, não pergunte"
- **Aula 04 · Fundamentos** — modelagem OO no mundo real: os quatro erros clássicos (substantivos sem dono, primitivos, estados impossíveis, herança como cadastro), errado vs. certo em pseudocódigo
- **Aula 05 · Fundamentos** — SOLID pelas fontes originais: de Parnas e Meyer a Martin, um princípio por letra, com violação e conserto em diagrama e pseudocódigo
