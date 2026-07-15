---
name: criar-aula
description: Cria uma aula nova do Curso Dev do André (deck de slides HTML standalone em curso/), seguindo o padrão de qualidade da aula de referência curso/orientacao-a-objetos.html. Usar SEMPRE que o pedido for criar, gerar ou montar uma aula, deck, slides ou apresentação nova do curso — nunca criar uma aula sem esta skill.
---

# Criar aula do curso

A referência de qualidade é **`curso/orientacao-a-objetos.html`** (Aula 03 · Orientação a Objetos). Toda aula nova nasce dela — mesma estética, mesma estrutura, mesmo rigor de conteúdo. As regras completas estão em `curso/CLAUDE.md`; esta skill é o passo a passo que as aplica.

## Passo 1 — Ler as referências (obrigatório, antes de escrever qualquer linha)

1. `curso/CLAUDE.md` — identidade visual, linguagem dos diagramas SVG, padrão de pseudocódigo e o checklist anticorte.
2. `curso/orientacao-a-objetos.html` — o deck-padrão. CSS, JS de navegação e o canvas de rede da capa são copiados dali **intactos**; só o conteúdo dos slides muda.
3. `curso/slides.html` — para descobrir o número da próxima aula e o formato do índice.

## Passo 2 — Fontes canônicas

- Ancorar cada conceito na melhor referência da área (livro, paper ou palestra seminal), mesmo em inglês — nunca blog aleatório. Exemplos do calibre esperado: Alan Kay, Parnas, Liskov, GoF, Booch, Sandi Metz, Fowler, Kleppmann.
- Citações em pt-BR com aspas curvas (“ ”), marcadas "tradução livre", sempre com autor, obra e ano — na linha `.credit` ao pé do slide, ou `.quote` + `.quote-credit` quando a citação é o slide.
- A aula fecha com um slide "As fontes" (Livros · Artigos e palestras, cada item com autor · ano).

## Passo 3 — Roteiro (9 a 21 slides)

Arco padrão:

1. **Capa** — canvas de rede, h1 com quebra manual e `<em>` na palavra-chave, `cover-meta` "Aula NN · Categoria — André N. Darcie".
2. **Contexto/origem** — linha do tempo com dots, quando o tema tiver história relevante.
3. **A ideia central** — citação forte (`.quote`) + diagrama que a ilustra.
4. **Mapa dos conceitos** — grade `.map` 2×2, se a aula tiver 3+ conceitos.
5. **Para CADA conceito**: slide de diagrama SVG → slide `Conceito, <em>em código</em>` com pseudocódigo. O par é obrigatório.
6. **Princípios práticos / anti-padrões** — comparações lado a lado com divisor central.
7. **As fontes.**
8. **"Vamos praticar?"** — exercícios acionáveis + `.contact-links` (E-mail, LinkedIn, GitHub).

## Passo 4 — Construção

- Um conceito por slide; diagrama > texto; listas com no máximo 4–5 itens curtos.
- Diagramas só com o vocabulário fixo (`box`, `wire`, `wire-soft`, `dashed`, `dot`, `tick`, `pulse`) e a coreografia `draw d1–d3` / `fade f1–f5` / `rise r1–r4` contando a história na ordem certa.
- Caixa desenhada sobre outro traço = `box solid` (fill de papel), depois do traço no documento.
- Pseudocódigo: `pre.code`, realce só em `.kw` / `.cm` / `.hi`, pt-BR minúsculo (`classe`, `privado`, `herda de`, `se … então falha`), símbolos unicode (`≠`, `≥`, `π`, `…`). Máximo ~72 colunas em bloco cheio, ~46 dentro de `.cols`.
- Exemplos de domínio neutros e reais (pedido, conta, carrinho, notificador). Sem marcas reais — regra do repositório.
- Acessibilidade: `role="img"` + `aria-label` em todo SVG, `prefers-reduced-motion`, alvos ≥ 44px.
- Marker de seta e ids de pulso com prefixo único por SVG.

## Passo 5 — Checklist anticorte

Rodar em TODO diagrama o checklist do `curso/CLAUDE.md` antes de entregar:

1. Nada fora do viewBox — largura de texto mono ≈ `0,6 × font-size × caracteres`; com `text-anchor="middle"`, conferir `x ± largura/2`; margem mínima de 16px.
2. Nenhum traço atravessando caixa vazada (usar `box solid`).
3. Anotações afastadas ≥ 8px de bordas paralelas.
4. Nada sobreposto ao trajeto de setas ou pulsos.
5. Em comparações lado a lado, cada texto cabe inteiro na sua metade.

## Passo 6 — Registrar

1. `curso/slides.html` — novo `deck-row`: label "Aula NN · Categoria", título, descrição de uma linha, contagem de slides e seta.
2. `curso/README.md` — linha na tabela de arquivos e na lista de aulas.
3. **Não testar** (regra do repositório): não abrir navegador nem servidor; o usuário confere manualmente. Lembrar que o GitHub Pages tem cache de ~10 min.
4. Editar sempre com a ferramenta Edit/Write — nunca reescrever via PowerShell (já corrompeu UTF-8).
