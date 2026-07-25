# Melhores livros para desenvolvimento de software

Levantamento realizado em **2026-07-25** com **56 fontes**, **690 menções**
e **241 títulos normalizados**.

## Resultado rápido

| Rank | Livro | Fontes | Peso acumulado | Bônus médio | Pontuação final |
|---:|---|---:|---:|---:|---:|
| 1 | The Pragmatic Programmer | 44 | 31.394156 | 0.713504 | 44.713504 |
| 2 | Clean Code | 43 | 36.723020 | 0.854024 | 43.854024 |
| 3 | Refactoring | 31 | 16.026836 | 0.516995 | 31.516995 |
| 4 | Design Patterns | 30 | 17.923651 | 0.597455 | 30.597455 |
| 5 | Code Complete | 27 | 20.578333 | 0.762160 | 27.762160 |
| 6 | Designing Data-Intensive Applications | 20 | 9.255128 | 0.462756 | 20.462756 |
| 7 | The Mythical Man-Month | 19 | 13.301587 | 0.700084 | 19.700084 |
| 8 | Introduction to Algorithms | 16 | 7.760952 | 0.485060 | 16.485060 |
| 9 | Cracking the Coding Interview | 15 | 6.165758 | 0.411051 | 15.411051 |
| 10 | Code | 14 | 6.543810 | 0.467415 | 14.467415 |

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
- Edições, subtítulos e abreviações foram consolidados sob um título canônico.
- Um livro conta no máximo uma vez por fonte.
- A base contém 3 meta-rankings, 4 rankings explícitos,
  20 listas numeradas e 29 listas em ordem editorial.
- CSVs usam vírgula como delimitador e UTF-8 com BOM para facilitar abertura no Excel.
- As 56 URLs responderam com HTTP 200 na checagem final de 2026-07-25.

## Como interpretar

O resultado mede **consenso de recomendação na web**, não qualidade absoluta. Há vieses de
popularidade, idioma inglês, listas com links de afiliados e sobreposição indireta entre
meta-rankings e algumas fontes primárias. A coluna `natureza` em `fontes.csv` e cada
`fonte.md` tornam esses casos visíveis.

## Página web

A página responsiva em `index.html` apresenta o ranking, permite buscar e filtrar livros,
expande as fontes de cada resultado e reúne as 56 fontes pesquisadas. Como os dados são
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
