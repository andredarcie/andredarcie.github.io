# Melhores livros para desenvolvimento de software

Levantamento iniciado em **2026-07-25** e atualizado em **2026-07-26**, com
**100 fontes**, **1162 menções** e **369 títulos normalizados**.

## Resultado rápido

| Rank | Livro | Fontes | Peso acumulado | Bônus médio | Pontuação final |
|---:|---|---:|---:|---:|---:|
| 1 | Clean Code | 76 | 63.615895 | 0.837051 | 76.837051 |
| 2 | The Pragmatic Programmer | 73 | 50.948175 | 0.697920 | 73.697920 |
| 3 | Refactoring | 47 | 25.257285 | 0.537389 | 47.537389 |
| 4 | Design Patterns | 45 | 25.878647 | 0.575081 | 45.575081 |
| 5 | Code Complete | 44 | 31.749018 | 0.721569 | 44.721569 |
| 6 | The Mythical Man-Month | 33 | 20.746363 | 0.628678 | 33.628678 |
| 7 | Introduction to Algorithms | 26 | 12.553173 | 0.482814 | 26.482814 |
| 8 | Designing Data-Intensive Applications | 26 | 12.052350 | 0.463552 | 26.463552 |
| 9 | Cracking the Coding Interview | 25 | 10.388485 | 0.415539 | 25.415539 |
| 10 | Head First Design Patterns | 20 | 11.540210 | 0.577011 | 20.577011 |

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

## Seleção e tratamento

- Foram incluídas páginas que recomendam livros para programação ou engenharia de software
  de forma geral e cuja ordem é reproduzível.
- Listas editoriais muito longas foram limitadas aos **20 primeiros itens**. O meta-ranking
  explícito de Pierre de Wulf manteve seus 25 itens.
- Edições, subtítulos e abreviações foram consolidados sob um título canônico. Fontes em
  outros idiomas entram com o título canônico do original; livros publicados somente em um
  idioma local mantêm ali o título original como canônico.
- Um livro conta no máximo uma vez por fonte.
- A base contém 3 meta-rankings, 6 rankings explícitos,
  40 listas numeradas e 51 listas em ordem editorial.
- CSVs usam vírgula como delimitador e UTF-8 com BOM para facilitar abertura no Excel.
- Todas as URLs responderam com HTTP 200 na data registrada em `data_acesso`:
  56 fontes em 2026-07-25 e 44 em 2026-07-26.

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
