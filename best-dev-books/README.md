# Melhores livros para desenvolvimento de software

Levantamento iniciado em **2026-07-25** e atualizado em **2026-07-27**, com
**100 fontes**, **1179 menções** e **352 títulos normalizados**.

## Resultado rápido

| Rank | Livro | Fontes | Peso acumulado | Bônus médio | Pontuação final |
|---:|---|---:|---:|---:|---:|
| 1 | Clean Code | 76 | 64.890895 | 0.853828 | 76.853828 |
| 2 | The Pragmatic Programmer | 73 | 50.227234 | 0.688044 | 73.688044 |
| 3 | Refactoring | 51 | 27.427740 | 0.537799 | 51.537799 |
| 4 | Code Complete | 49 | 34.636897 | 0.706875 | 49.706875 |
| 5 | Design Patterns | 49 | 28.145314 | 0.574394 | 49.574394 |
| 6 | The Mythical Man-Month | 35 | 21.329697 | 0.609420 | 35.609420 |
| 7 | Introduction to Algorithms | 27 | 13.403173 | 0.496414 | 27.496414 |
| 8 | Designing Data-Intensive Applications | 25 | 11.635684 | 0.465427 | 25.465427 |
| 9 | Working Effectively with Legacy Code | 24 | 12.155859 | 0.506494 | 24.506494 |
| 10 | The Clean Coder | 23 | 15.126654 | 0.657681 | 23.657681 |

O ranking completo está em [`ranking_final.csv`](ranking_final.csv). O índice das fontes
está em [`fontes.csv`](fontes.csv), e a pasta [`fontes/`](fontes/) contém uma subpasta
por fonte com `fonte.md` e `livros.csv`.

## Metodologia

Cada aparição de um livro vale **1 ponto de recorrência**. A posição acrescenta um bônus
normalizado:

`peso_posicao = (N - posição + 1) / N`

onde `N` é o total de livros usado naquela fonte. Portanto, o primeiro recebe peso `1`,
e o último recebe `1/N`.

`bônus_médio = soma_dos_pesos_de_posição / ocorrências`

`pontuação_final = ocorrências + bônus_médio`

Esse desenho garante que a recorrência entre fontes seja o componente dominante e evita
contá-la duas vezes. As posições altas fornecem um bônus entre 0 e 1 para reforçar e
desempatar o consenso. Todas as fontes recebem o mesmo peso-base.

## Coleta das fontes

As fontes vieram de busca na web em sete idiomas, variando as chaves em torno de
"melhores livros" e "livros que todo programador deveria ler", mais os links citados
pelos meta-rankings já existentes:

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

## Seleção e tratamento

Os critérios completos estão em [`PROTOCOLO-FONTES.md`](PROTOCOLO-FONTES.md), que define os
portões eliminatórios, a grade de qualidade e as regras de extração. Resumo:

- Foram incluídas páginas que recomendam livros para programação ou engenharia de software
  de forma geral e cuja ordem é reproduzível.
- Uma revisão de escopo descartou 10 fontes: 8 que eram, na maior parte, listas de nicho ou
  de linguagem específica, e 2 cuja ordem não era reproduzível (ranking por votos recalculado
  continuamente e vitrine comercial dinâmica). Outras 10 fontes entraram no lugar.
- O corte usado nessa revisão foi de pelo menos **70% de livros de programação ou engenharia
  de software de escopo geral** por fonte, descontando manuais de linguagem, autoajuda,
  biografias e ficção.
- Listas editoriais muito longas foram limitadas aos **20 primeiros itens**. O meta-ranking
  explícito de Pierre de Wulf manteve seus 25 itens.
- Edições, subtítulos e abreviações foram consolidados sob um título canônico. Fontes em
  outros idiomas entram com o título canônico do original; livros publicados somente em um
  idioma local mantêm ali o título original como canônico.
- Um livro conta no máximo uma vez por fonte.
- A base contém 3 meta-rankings, 5 rankings explícitos,
  39 listas numeradas e 53 listas em ordem editorial.
- CSVs usam vírgula como delimitador e UTF-8 com BOM para facilitar abertura no Excel.
- Todas as URLs responderam com HTTP 200 na data registrada em `data_acesso`:
  53 em 2026-07-25, 37 em 2026-07-26, 10 em 2026-07-27.

## Como interpretar

O resultado mede **consenso de recomendação na web**, não qualidade absoluta. Há vieses de
popularidade, idioma, listas com links de afiliados e sobreposição indireta entre
meta-rankings e algumas fontes primárias. 80 das 100 fontes estão em
inglês; as outras 20 se dividem entre de, es, fr, it, pl, pt.
As colunas `natureza` e `idioma` em `fontes.csv`, além de cada `fonte.md`, tornam esses casos
visíveis.

## Página web

A página responsiva em `index.html` apresenta o ranking, permite buscar e filtrar livros,
expande as fontes de cada resultado e reúne as 100 fontes pesquisadas. Como os dados são
carregados dos CSVs, abra a pasta por um servidor local:

```powershell
python -m http.server 8000
```

Depois visite `http://localhost:8000/`.

## Reproduzir

Execute:

```powershell
python scripts/gerar_ranking.py
python scripts/validar_resultados.py
```
