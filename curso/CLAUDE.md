# Instruções para o Claude Code — curso/

Regras para criar e editar aulas e slides do curso. O objetivo é que qualquer deck novo seja indistinguível dos existentes em estética, estrutura e rigor de conteúdo.

## Aula nova? Use a skill (obrigatório)

- **Toda aula nova é criada com a skill `criar-aula`** (`.claude/skills/criar-aula/SKILL.md`). Nunca montar um deck do zero sem invocá-la — ela contém o passo a passo que aplica estas regras.
- A **referência de qualidade é `curso/orientacao-a-objetos.html`** (Aula 03). Aula nova copia dela o CSS, o JS de navegação e o canvas da capa, intactos; só o conteúdo dos slides muda.

## Regras gerais

- Todo texto visível é em **pt-BR** (diferente dos jogos do repositório, que são em inglês).
- Cada deck é um HTML **standalone**: CSS, SVG e JS inline. Nada de build, frameworks ou bibliotecas — a única dependência externa é Google Fonts.
- Não há cache-busting `?v=N` aqui (isso é convenção dos jogos). GitHub Pages tem cache de ~10 min.
- **Nunca testar nada** (regra do repositório): não abrir navegador, não subir servidor. `node --check` é permitido só para JS puro; HTML é revisado manualmente pelo usuário.
- Ao criar um deck novo: partir de um existente como base (ex.: `orientacao-a-objetos.html`), adicionar a entrada em `slides.html` (deck-row com label "Aula NN · Categoria", título, descrição de uma linha e contagem de slides) e atualizar a tabela do `README.md`.

## Identidade visual (não mudar)

Paleta — só estes tons, sem cores de destaque:

```css
--ink: #1e1e1e;          /* texto e traços principais */
--mid: #4a4a4a;          /* texto secundário */
--soft: #7a7a7a;         /* rótulos, créditos */
--line: #e8e4df;         /* bordas suaves */
--line-strong: #d9d3ca;  /* bordas/tracejados de apoio */
--paper: #f4f1ec;        /* fundo */
```

Tipografia:

- **Playfair Display** (400, itálico para ênfase) — h1 da capa (96px), h2 dos slides (54px), texto `.serif` dentro de SVG (27px), citações `.quote` (31px itálico).
- **IBM Plex Mono** — rótulos uppercase com letter-spacing, textos de diagrama, chips, créditos, links.
- **IBM Plex Sans** — corpo e listas.

Proibido: sombras, gradientes, cantos arredondados, emojis, cores novas, negrito decorativo.

## Estrutura de um deck

- Stage fixo de **1280×720** centralizado e escalado via `--stage-scale` (função `setScale`). Todo deck usa o mesmo JS de navegação: setas/espaço/Home/End, `F` para tela cheia, swipe no touch, hash `#N` na URL, barra de progresso de 2px no rodapé.
- Capa: `<canvas id="net">` com a animação de rede de nós (copiar o IIFE inteiro), h1 com quebra manual e `<em>` na palavra-chave, `cover-meta` ("Aula NN · Categoria — André N. Darcie") e `cover-hint` com as teclas.
- Slides internos: `h2` curto + um bloco principal, que é **um** destes:
  - `.dwrap` com diagrama SVG (o caso padrão);
  - `.cols` com lista/citação à esquerda e diagrama à direita;
  - `.map` (grade 2×2 de células com ícone + h3 + parágrafo) para mapas/resumos;
  - `pre.code` com pseudocódigo (ver seção abaixo);
  - `.item-list` para listas de fechamento.
- **Todo slide de conceito com diagrama é seguido por um slide de pseudocódigo** do mesmo conceito, com h2 no padrão `Conceito, <em>em código</em>` e `data-title="Conceito · código"`. Slides de história, mapa/resumo, fontes e fechamento não precisam de par.
- Fechamento: slide "Vamos praticar?" (ou equivalente) com exercícios acionáveis + `.contact-links` (E-mail, LinkedIn, GitHub).
- Tamanho alvo: 9 a 21 slides por aula (conceituais dobram por causa do par diagrama + código).

## Linguagem dos diagramas SVG

Vocabulário fixo — não inventar estilos novos:

- `.box` — retângulos/círculos de traço fino (1.3px), sem preenchimento. Métodos "na superfície" de um objeto = caixinha `box solid` atravessando a borda.
- `.box.solid` — caixa com `fill: var(--paper)`. **Obrigatória** sempre que uma caixa fica em cima de outro traço (caixa atravessando a borda de outra caixa, selo sobre uma linha): sem o fill de papel, o traço de baixo atravessa a caixa e ela aparece "cortada". Mesma técnica do `.dot`. Atenção à ordem no documento: a caixa `solid` precisa vir DEPOIS do traço que ela mascara.
- `.wire` + marker de seta aberta — fluxo/mensagem. `.wire-soft` — linhas de anotação. `.dashed` — abstrações, fluxos secundários, "o que vier".
- `.dot` / `.dot-fill` — pontos de linha do tempo e âncoras de anotação. `.tick` — hachuras de dados.
- Textos: `.t-ink` (destaque), `.t-sm` (12.5px), `.t-soft`, `.t-caption` (LEGENDA EM CAIXA ALTA com letter-spacing), `.serif` (palavra-conceito em Playfair).
- Rótulos dentro de diagramas em **minúsculas** ("api", "fila", "pedido #4821").
- `.pulse` + `animateMotion` — bolinhas percorrendo os fios para mostrar movimento (durações variadas, 2.4s–7s; opacidade 0 → .55/.6 → 0).
- Coreografia de entrada: traços com `class="draw d1|d2|d3"` e `pathLength="1"`; textos/apoios com `fade`/`dlabel` + `f1`–`f5`; blocos HTML com `rise r1`–`r4`. A ordem dos delays deve contar a história do diagrama (primeiro a estrutura, depois os rótulos, por fim as anotações).
- Comparações lado a lado: divisor vertical `wire-soft` no meio (x=440 num viewBox de 920), legenda `t-caption` + sublinha `t-sm t-soft` centralizadas sob cada metade.
- Marker de seta e ids de path de pulso com prefixo único por SVG (`ar-abs`, `b-m1`…) para não colidir.

### Checklist anticorte (verificar em TODO diagrama antes de entregar)

O SVG tem overflow hidden: tudo que sair do viewBox é cortado, e traços que passam por baixo de caixas vazadas as "cortam" visualmente. Antes de fechar um slide:

1. **Nada fora do viewBox.** Estimar a largura de cada texto: mono ≈ `0,6 × font-size × nº de caracteres` (t-sm 12.5px ≈ 7.5px/char; texto padrão 14px ≈ 8.4px/char; t-caption soma o letter-spacing ≈ 9.6px/char). Com `text-anchor="middle"`, conferir `x ± largura/2` contra 0 e a largura do viewBox — margem mínima de **16px** em todos os lados. Textos longos perto das bordas: encurtar o texto ou puxar o ponto para dentro.
2. **Nenhum traço atravessando caixa vazada.** Caixa desenhada sobre qualquer linha/borda usa `box solid` (fill de papel) e vem depois da linha no documento.
3. **Anotações não correm coladas em bordas.** Linha de anotação (`wire-soft`) paralela a uma borda de caixa: afastar ≥ 8px para não parecer prolongamento do traço.
4. **Nada sobreposto a setas.** Marcas (✗, rótulos) ficam ao lado/acima do fio, nunca em cima do trajeto da seta ou do pulso.
5. Em comparações lado a lado, cada texto centralizado precisa caber inteiro na sua metade (não invadir o divisor).

## Pseudocódigo

- Bloco `pre.code`: IBM Plex Mono 16.5px, borda `--line-strong`, `white-space: pre`, `align-self: flex-start`. Dentro de `.cols`, 15px e largura total da coluna.
- Realce em três tons, nada de cores: `.kw` (palavras-chave estruturais, ink + peso 500), `.cm` (comentários, soft), `.hi` (a mensagem/linha que é o ponto do slide, ink). Não marcar tudo — só o que conta a história.
- Pseudocódigo em pt-BR, minúsculo e enxuto: `classe`, `privado`, `método`, `interface`, `herda de`, `se … então falha`, `retorna`, `novo`, `para cada … em`. Símbolos unicode (`≠`, `≥`, `π`, `…`) em vez de ASCII feio.
- Comentários `//` fazem o papel de anotação do diagrama (ex.: `// identidade`, `// estado`, `// comportamento`) — alinhados numa mesma coluna com espaços.
- **Limite de largura** (o `pre` não quebra linha): ~72 caracteres por linha em bloco de largura cheia; ~46 em bloco dentro de `.cols`. Linha maior que isso: quebrar com indentação.
- Comparações lado a lado: `.cols.top` com `sub-label` em cada coluna (ex.: "Estado exposto" / "Estado protegido").

## Padrão de conteúdo

- **Um conceito por slide.** Se precisa de dois diagramas, são dois slides.
- **Diagrama > texto.** Parágrafos longos não existem; listas têm no máximo 4–5 itens curtos.
- **Fontes canônicas obrigatórias.** Cada conceito central é ancorado na melhor referência da área (mesmo em inglês): Alan Kay, Parnas, Liskov, GoF, Booch, Sandi Metz, Fowler, Hunt & Thomas etc. Nada de blog aleatório.
- **Citações traduzidas.** Citações aparecem em pt-BR com aspas curvas (“ ”), marcadas "tradução livre", creditadas com autor, obra e ano — na linha `.credit` ao pé do slide (ou `.quote` + `.quote-credit` quando a citação é o slide).
- Aula conceitual termina com: slide "As fontes" (livros e artigos com autor · ano) e slide de prática com exercícios concretos.
- Exemplos de domínio: coisas reais e neutras (pedido, conta, carrinho, notificador). Sem marcas reais — regra do repositório.

## Acessibilidade (obrigatório)

- Todo SVG de diagrama: `role="img"` + `aria-label` descrevendo o diagrama em uma frase.
- `aria-label` nas sections, `aria-live="polite"` no container, `aria-hidden` em decorações (canvas, setas).
- Bloco `@media (prefers-reduced-motion: reduce)` desligando draw/fade/rise/pulse e transições.
- Links/botões com `min-height: 44px`; `:focus-visible` com outline visível.
