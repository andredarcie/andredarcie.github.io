# Protocolo de inclusão de fontes

Versão 1.1 · 2026-07-27

Este documento define, **antes** de olhar uma página candidata, o que faz dela uma fonte
válida para o ranking. Serve para tornar a decisão repetível por outra pessoa e para evitar
que o critério seja moldado depois, em função do resultado que ele produz.

Base metodológica: revisão sistemática adaptada a *grey literature*.

- Kitchenham & Charters (2007), *Guidelines for performing Systematic Literature Reviews in
  Software Engineering*, EBSE-2007-01. De onde vem a ideia de critérios definidos a priori.
- Garousi, Felderer & Mäntylä (2019), *Guidelines for including grey literature and conducting
  multivocal literature reviews in software engineering*, IST 106. De onde vem a grade de
  qualidade da seção 4.
- Wohlin (2014), *Guidelines for snowballing in systematic literature studies*, EASE '14.
  De onde vem a busca por encadeamento e o critério de parada.
- PRISMA 2020 (Page et al., BMJ). De onde vem o registro de fluxo da seção 6.

---

## 1. Pergunta que o levantamento responde

> Quais livros são mais recomendados quando páginas públicas indicam leitura para
> programação ou engenharia de software de forma geral?

A medida é **consenso de recomendação publicada**, não qualidade do livro. Todo o protocolo
existe para manter a coleta fiel a essa pergunta e nada além dela.

---

## 2. Estratégia de busca

Duas vias, ambas obrigatórias.

**Busca direta**, em sete idiomas, variando as chaves em torno de "melhores livros" e "livros
que todo programador deveria ler":

```
en  best programming books
    best books for software developers
    books every programmer should read
    top software engineering books
    software engineering reading list        (ementas de universidade)
    awesome programming books site:github.com
    most recommended programming books       (meta-rankings)
pt  melhores livros de programação
    livros que todo desenvolvedor deveria ler
es  mejores libros de programación
    libros para programadores
fr  meilleurs livres pour développeur
    livres à lire développeur
it  migliori libri di programmazione
    libri che ogni programmatore dovrebbe leggere
de  beste Programmierbücher
    Bücher für Softwareentwickler
pl  najlepsze książki dla programistów
```

**Encadeamento (snowballing)**: seguir os links que os meta-rankings e listas já incluídas
citam como origem. Cada página assim encontrada passa pelos mesmos portões.

**Critério de parada**: encerrar quando duas rodadas consecutivas de encadeamento não
produzirem nenhuma fonte nova aprovada. Parar em um número redondo de fontes é conveniência,
não saturação, e deve ser registrado como tal se acontecer.

---

## 3. Portões eliminatórios

Falhou em um, a fonte não entra. Não há compensação entre portões.

### G1 · Disponibilidade

A URL responde **HTTP 200** na data da coleta, sem paywall, sem login e sem bloqueio a
leitura automatizada. Registrar `data_acesso` e `status_http_na_coleta`.

### G2 · Escopo geral (regra dos 70%)

Pelo menos **70% dos itens contados** precisam ser livros de programação ou engenharia de
software de escopo geral.

Conta como **geral**: construção e qualidade de código, design e arquitetura, algoritmos e
estruturas de dados, testes, processo e método, sistemas distribuídos, fundamentos de
computação, ofício e carreira em engenharia de software.

**Não** conta como geral:

- manual de linguagem, framework ou ferramenta (*Learning Python*, *Head First C#*, *Modern PHP*, *Drupal 9 Module Development*);
- livro de nicho de aplicação (jogos, front-end puro, um único banco de dados);
- autoajuda, produtividade genérica, negócios e liderança fora de engenharia;
- biografia, história empresarial e ficção;
- material que não é livro (curso, artigo avulso, vídeo, documentação).

O cálculo usa o **conjunto que seria contado** depois do corte da seção 5, não a página
inteira. Registrar a fração no campo `observacoes`.

### G3 · Ordem reproduzível

Precisa existir uma ordem que outra pessoa reconstrói olhando a página: numeração, ranking
declarado, ou a ordem visual de exibição. Se a página só cita títulos em prosa corrida sem
sequência determinável, não entra.

Classificar em `tipo_ordem`:

| valor | significado |
|---|---|
| `ranking_explicito` | a fonte declara que é uma classificação comparativa |
| `meta_ranking` | a fonte agrega outras listas e ordena pelo resultado |
| `lista_numerada` | numerada de 1 a N, sem declarar comparação |
| `ordem_editorial` | só a ordem de exibição na página |

**Ordenação alfabética por título é motivo de recusa.** A posição passa a medir a letra
inicial, não a preferência, e isso favorece sistematicamente *Clean Code* e *Code Complete*.

### G4 · Tamanho mínimo

Pelo menos **3 livros** contados. Abaixo disso o peso de posição fica grosso demais
(com N=2, os pesos são 1,00 e 0,50) e uma única página distorce o desempate.

### G5 · Originalidade

Recusar se a lista for cópia substancial de fonte já incluída: **80% ou mais de sobreposição
de títulos na mesma ordem**. Isso impede que o mesmo julgamento entre duas vezes por vias
diferentes. Registrar de qual fonte é cópia.

### G6 · Unidade autoral

O voto pertence ao **autor ou veículo**, não à URL. Mesmo autor publicando duas listas em
sites diferentes conta uma vez: mantém-se a mais completa e recente, e a outra é registrada
como descartada por G6.

### G7 · Itens são livros

Contar apenas livros publicados ou livros de acesso livre com identidade de obra. Artigo,
post, curso, vídeo, documentação e coletânea de manuscritos ficam de fora da contagem, e a
exclusão vai para `observacoes`.

---

## 4. Grade de qualidade

Aplicada às fontes que passaram nos portões. Não elimina, mas fica registrada e serve para
desempate e para leitura crítica do resultado. Adaptada de Garousi et al. (2019).

| # | Critério | 0 | 1 | 2 |
|---|---|---|---|---|
| Q1 | Autoridade de quem produziu | anônimo | autor identificado | autor com trajetória verificável na área |
| Q2 | Método declarado | nenhum | menciona como escolheu | descreve critério ou base de dados |
| Q3 | Objetividade | afiliado ou vende o que indica | comercial, mas separado da lista | sem interesse financeiro declarado |
| Q4 | Datação | sem data | data de publicação | data de publicação e de atualização |
| Q5 | Controle editorial do veículo | sem revisão | veículo com linha editorial | revisão por pares ou curricular |
| Q6 | Posição frente a outras fontes | ignora as demais | cita influências | compara e justifica divergências |
| Q7 | Autopromoção | indica os próprios livros sem avisar | indica e identifica | não indica os próprios |

Máximo 14 pontos. Faixas: **0–4 frágil**, **5–9 aceitável**, **10–14 sólida**.

### Como a nota é derivada

A grade é calculada por regra em `scripts/gerar_ranking.py` (`quality_grade`), a partir dos
campos já registrados de cada fonte, para que outra pessoa chegue ao mesmo número sem
depender de julgamento. O mapa:

| # | 2 pontos | 1 ponto | 0 ponto |
|---|---|---|---|
| Q1 | `natureza` de especialista, acadêmica, curricular ou ranking de especialistas | qualquer outra natureza, com veículo identificado | veículo não identificado |
| Q2 | `tipo_ordem` é `meta_ranking`, ou `natureza` começa com `ranking_` | curadoria acadêmica ou curricular, ou a página declara seu critério | nada declarado |
| Q3 | demais naturezas | `curadoria_empresa` ou `curadoria_editorial` | `curadoria_comercial` |
| Q4 | atualização declarada na página | tem data de publicação | sem data |
| Q5 | acadêmica ou curricular | veículo com linha editorial | blog pessoal ou repositório |
| Q6 | `meta_ranking` | `natureza` começa com `ranking_` | demais |
| Q7 | não indica os próprios livros | indica e identifica | indica sem avisar |

Quando a evidência anotada em `observacoes` contradiz a regra geral, a fonte entra em
`QUALITY_OVERRIDES` no mesmo arquivo, com o motivo por escrito. É o caso de páginas que
declaram não usar afiliado (Q3 sobe) e de listas que incluem livro do próprio autor
(Q7 desce).

**Limite desta derivação:** ela lê o que foi registrado na coleta, não relê as 100 páginas.
Q2 e Q6 em especial tendem a ser subestimados, porque uma página pode declarar seu método
sem que isso tenha sido anotado. A grade serve para comparar fontes e para leitura crítica,
não como medida absoluta de confiabilidade.

### Distribuição na base de 2026-07-27

| faixa | fontes |
|---|---:|
| sólida (10 a 14) | 9 |
| aceitável (5 a 9) | 89 |
| frágil (0 a 4) | 2 |

A grade é exibida em cada card na seção de fontes do site, com filtro por faixa, e no
`fonte.md` de cada fonte. As notas por critério estão nas colunas `qualidade_q1` a
`qualidade_q7` do `fontes.csv`.

---

## 5. Regras de extração

Valem depois da fonte ser aceita.

1. **Corte em 20.** Listas com mais de 20 itens entram só com os 20 primeiros, na ordem
   publicada. Exceção registrada: o meta-ranking de Pierre de Wulf manteve os 25 lugares.
2. **Um livro por fonte.** Repetição na mesma página conta uma vez, na melhor posição.
3. **Título canônico.** Edições, subtítulos, traduções e abreviações são consolidados sob um
   nome único. Fonte em outro idioma entra com o canônico do original. Livro publicado apenas
   em um idioma local mantém ali o título original como canônico.
4. **Bônus, honorários e extras** citados fora da lista principal não entram, e a exclusão é
   registrada.
5. **Posição.** Segue a numeração ou a ordem visual. Lista em contagem regressiva é invertida
   para que a posição 1 seja o primeiro lugar declarado, e isso vai para `observacoes`.
6. **Peso.** `peso_posicao = (N - posição + 1) / N`, com `N` igual à quantidade contada
   naquela fonte.

---

## 6. Registro de fluxo

Toda rodada de coleta registra os números no formato PRISMA:

```
Identificadas pela busca ............. N
Identificadas por encadeamento ....... N
  Removidas por duplicidade (G5, G6) . N
Avaliadas contra os portões .......... N
  Excluídas por G1 (indisponível) .... N
  Excluídas por G2 (escopo) .......... N
  Excluídas por G3 (ordem) ........... N
  Excluídas por G4 (tamanho) ......... N
  Excluídas por G7 (não é livro) ..... N
Incluídas ............................ N
```

Cada exclusão fica em `descartes.csv` com URL, portão que falhou e uma linha de motivo.
Fonte descartada não some do registro: some do ranking.

### Auditoria automática

`gerar_ranking.py` reaplica em toda execução os portões que dá para checar por conta própria
(G4, G5 e G6) e grava o resultado em `auditoria.csv`. Isso impede que a base se afaste do
protocolo em silêncio.

**Pendências abertas na base de 2026-07-27 (7).** Estão registradas, não resolvidas:

| portão | caso | leitura |
|---|---|---|
| G4 | `calpoly_cpe205` tem 2 livros | abaixo do mínimo de 3; entrou antes do protocolo existir |
| G5 | `bytebytego` × `devto_javinpaul` | 10 títulos, 100% da menor lista, mesma ordem |
| G5 | `bytebytego` × `javaguides` | 9 títulos, 90%, mesma ordem |
| G5 | `devto_javinpaul` × `javaguides` | 9 títulos, 90%, mesma ordem |
| G5 | `geeksforgeeks` × `thepower` | 10 títulos, 100% da menor lista, mesma ordem |
| G6 | `medium_javinpaul` e `devto_javinpaul` | mesmo autor em dois veículos |
| G6 | `pragmatic_engineer_holiday` e `pragmatic_engineer_reading` | mesmo autor em duas páginas |

As três primeiras de G5 formam um único agrupamento: `bytebytego`, `devto_javinpaul` e
`javaguides` publicam praticamente a mesma lista de dez livros na mesma ordem, o que faz o
mesmo julgamento entrar três vezes na contagem. Resolver isso significa manter uma e
descartar duas, com reposição, e por isso está registrado como pendência em vez de aplicado.

**Nota sobre G6:** a checagem compara identidade autoral declarada em `AUTHOR_IDENTITIES`,
não o domínio. Dev.to, Medium e GitHub hospedam autores distintos, e duas páginas ali não são
a mesma voz. Cursos diferentes da mesma universidade também não contam como repetição,
porque têm ementa e responsável próprios.

---

## 7. Reavaliação

- Uma fonte incluída é reavaliada quando a URL sai do ar ou quando a página muda a lista.
- Fonte com ordem recalculada continuamente (ranking por votos, vitrine dinâmica) falha em
  G3 na reavaliação, porque a coleta não é reprodutível em outra data.
- Mudança de critério exige subir a versão deste documento e reprocessar a base inteira, não
  só as fontes novas.

---

## 8. Limites conhecidos que o protocolo não resolve

Registrados para não serem confundidos com rigor.

1. **Um único avaliador.** G2 e a grade da seção 4 têm margem de julgamento. O tratamento
   padrão seria dois avaliadores independentes com kappa de Cohen. Aqui há um só.
2. **Ordem editorial dominante.** Cerca de metade das fontes é `ordem_editorial`, onde a
   posição é a ordem da página, não uma preferência declarada. O bônus é aplicado igual.
   Recomenda-se rodar a análise de sensibilidade descrita abaixo a cada atualização.
3. **Sobreposição de meta-rankings.** Fontes secundárias reinjetam o consenso de fontes
   primárias que já estão na base. O ideal seria mantê-las fora da síntese principal e usá-las
   só como validação.
4. **Viés de idioma e de popularidade.** A busca é feita em sete idiomas, mas 80% das fontes
   estão em inglês, e listas otimizadas para busca se copiam entre si.

**Análise de sensibilidade recomendada:** refazer o ranking dando peso fixo de 0,5 a toda
menção em `ordem_editorial` e comparar o top 15. Se a ordem mudar pouco, o resultado não
depende da parte frágil da medida. Na base de 2026-07-27 essa troca move apenas posições
vizinhas e não altera o topo.

---

## 9. Exemplos resolvidos

**Aceita.** `profile.es`, *10 libros esenciales para desarrolladores y programadores*.
G1 responde 200. G2 com 10 de 10 gerais. G3 numerada de 1 a 10. G4 com 10 itens. G5 sem
sobreposição alta. G6 primeiro registro do veículo. G7 todos livros. Grade: Q1 1, Q2 1,
Q3 2, Q4 1, Q5 1, Q6 0, Q7 2, total 8, aceitável.

**Recusada por G2.** `bootdev_web`, *The Best 10 Web Development Books*. Sete dos dez itens
são HTML, CSS, jQuery, PHP e design web. Fração geral de 30%, abaixo do corte.

**Recusada por G2.** Lista polonesa *Top 9 książek dla programistów*. Seis dos nove itens são
biografia, produtividade e um livro sobre design de apresentações. Fração geral de 33%.

**Recusada por G3.** `goodreads_listopia`. A ordem vem de votação recalculada continuamente,
então a coleta não é reproduzível em outra data.

**Recusada por G5.** Newsletter publicada como *The Software Engineer's Reading List for 2026*.
Dez livros idênticos aos do guia do ByteByteGo, na mesma ordem e nas mesmas categorias.

**Recusada por G6.** Segunda lista de javinpaul em outro veículo, com sobreposição parcial de
títulos e mesmo autor da fonte já incluída.

---

## Histórico

| versão | data | mudança |
|---|---|---|
| 1.0 | 2026-07-27 | Primeira versão escrita. Formaliza os portões que já eram aplicados de modo informal, acrescenta a regra dos 70% (G2), a checagem de originalidade (G5), a unidade autoral (G6), a recusa de ordem alfabética em G3 e a grade de qualidade da seção 4. |
| 1.1 | 2026-07-27 | Grade de qualidade aplicada às 100 fontes por regra derivada dos metadados, com a tabela de derivação e os `QUALITY_OVERRIDES`. G4, G5 e G6 passam a ser reaplicados a cada execução e gravados em `auditoria.csv`. Registradas as 7 pendências abertas. |
