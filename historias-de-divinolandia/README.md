# Histórias de Divinolândia

Um livro aberto sobre a história de Divinolândia (SP), a antiga Sapecado, escrito um capítulo de cada vez a partir de fontes públicas.

Online: <https://andredarcie.github.io/historias-de-divinolandia/index.html>

## Como é o livro

É uma página só (`index.html`) que se lê como um PDF aberto, sem baixar nada: capa, página de apresentação, sumário, capítulos com abertura, cabeçalho, número de página e notas no fim de cada capítulo. Funciona no computador e no celular.

O texto não é dividido em páginas à mão. O script lê os capítulos escondidos em `#fonte` e corta o texto em páginas do tamanho da tela:

- no computador, páginas de 600 × 860 px;
- no celular, páginas da largura da tela (proporção 2:3), com o texto repaginado para continuar legível.

O sumário é montado depois da paginação, com os números de página de verdade. Por isso a numeração muda entre o computador e o celular, como mudaria entre duas edições impressas.

A fonte é a EB Garamond, do Google Fonts. Imprimir a página (Ctrl+P) sai uma página do livro por folha.

## Como escrever um capítulo novo

1. Dentro de `<div id="fonte">`, copie um `<section class="capitulo">` inteiro e ponha no **lugar cronológico** dele: o livro segue a ordem do tempo.
2. Ajuste `data-num`, `data-titulo` e `data-sub`. Se ele entrar no meio, renumere os seguintes: o `data-num` e o prefixo das notas (`c4-n…` vira `c5-n…`).
3. Escreva em `<p>`, com intertítulos em `<h3>`. O primeiro parágrafo pode levar `class="capitular"`, para ter a letra grande.
4. Toda afirmação leva nota: `<sup><a href="#c2-n1">1</a></sup>`. As notas vão no `<ol class="notas">` do fim do capítulo, com `id` iguais (`c2-n1`, `c2-n2`…) e o endereço da fonte.
5. Tire o título da lista `#proximos` (os capítulos em pesquisa, que aparecem no sumário sem página).

## Regras do texto

- Toda afirmação tem fonte, e a fonte tem endereço, para quem quiser conferir.
- Onde as fontes não dizem, o texto diz que não sabe. Nada de completar com suposição.
- Citação só curta e entre aspas; o resto é contado com as nossas palavras.
- Os temas seguem o índice de *Divinolândia... Nos Caminhos do Tempo* (Válter Roberto Lopes e Orlanda Maria Grespan de Faria, 1991), que não está disponível na internet.

## Capítulos

Em ordem do tempo.

| Nº | Título | Período |
|---|---|---|
| 1 | Antes de Sapecado: o sertão, o quilombo, o ouro e o pouso dos tropeiros | séc. XVIII–1865 |
| 2 | As fazendas e a escravidão: do quilombo do Careca aos colonos do café | 1830–1896 |
| 3 | Os imigrantes: mascates, colonos e padeiros no Rio do Peixe | 1880–1940 |
| 4 | O tempo dos coronéis: as famílias que mandavam na freguesia | 1840–1918 |
| 5 | A vida na vila: caminhos, comércio, festa e futebol | 1890–1950 |
| 6 | Quando a guerra chegou: Sapecado na Revolução de 1932 | 1932 |
| 7 | O clima que curava: o sanatório de Sapecado e o Hospital Regional | 1935–1987 |
| 8 | A batata e o café: da capital da batata ao café de montanha | 1930–2025 |
| 9 | De Sapecado a Divinolândia: a emancipação e os primeiros prefeitos | 1898–1992 |
| 10 | A matriz e o padre Ladislau: a fé do Divino Espírito Santo | 1843–1990 |
| 11 | Os bairros: Campestrinho, Três Barras, Pontal e os nomes da serra | — |
| 12 | Divinolândia hoje: a cidade que a história deixou | 2022–2026 |

O que ainda falta (e cada capítulo lista no fim): os nomes das pessoas escravizadas, os colonos das fazendas, os combatentes de 1932, o primeiro cinema, a campanha da emancipação, as igrejas evangélicas e o centro espírita, e a origem do nome Quebra-Machado.
