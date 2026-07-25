# Melhores livros para desenvolvimento de software

Levantamento realizado em **2026-07-25** com **36 fontes**, **453 menções**
e **145 títulos normalizados**.

## Resultado rápido

| Rank | Livro | Fontes | Peso acumulado | Bônus médio | Pontuação final |
|---:|---|---:|---:|---:|---:|
| 1 | Clean Code | 33 | 29.259384 | 0.886648 | 33.886648 |
| 2 | The Pragmatic Programmer | 32 | 23.982540 | 0.749454 | 32.749454 |
| 3 | Refactoring | 25 | 13.211685 | 0.528467 | 25.528467 |
| 4 | Design Patterns | 22 | 13.551429 | 0.615974 | 22.615974 |
| 5 | Code Complete | 19 | 13.795000 | 0.726053 | 19.726053 |
| 6 | Designing Data-Intensive Applications | 15 | 7.705128 | 0.513675 | 15.513675 |
| 7 | Cracking the Coding Interview | 13 | 4.556667 | 0.350513 | 13.350513 |
| 8 | The Clean Coder | 11 | 5.940182 | 0.540017 | 11.540017 |
| 9 | Introduction to Algorithms | 11 | 5.160952 | 0.469177 | 11.469177 |
| 10 | The Mythical Man-Month | 10 | 7.690476 | 0.769048 | 10.769048 |

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
- A base contém 3 meta-rankings, 2 rankings explícitos,
  15 listas numeradas e 16 listas em ordem editorial.
- CSVs usam vírgula como delimitador e UTF-8 com BOM para facilitar abertura no Excel.
- As 36 URLs responderam com HTTP 200 na checagem final de 2026-07-25.

## Como interpretar

O resultado mede **consenso de recomendação na web**, não qualidade absoluta. Há vieses de
popularidade, idioma inglês, listas com links de afiliados e sobreposição indireta entre
meta-rankings e algumas fontes primárias. A coluna `natureza` em `fontes.csv` e cada
`fonte.md` tornam esses casos visíveis.

## Página web

A página responsiva em `index.html` apresenta o ranking, permite buscar e filtrar livros,
expande as fontes de cada resultado e reúne as 36 fontes pesquisadas. Como os dados são
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
