# Software Development (Listopia)

- **Publicador/curador:** Goodreads
- **URL:** https://www.goodreads.com/list/show/8112.software_development
- **Domínio:** www.goodreads.com
- **Data de publicação/atualização identificada:** não identificada
- **Data de acesso:** 2026-07-26
- **Acessibilidade na checagem final:** HTTP 200 em 2026-07-26
- **Natureza:** `ranking_votos_comunidade`
- **Tipo de ordem:** `ranking_explicito`
- **Idioma:** `en`
- **Quantidade usada:** 20
- **Escopo:** Desenvolvimento de software, algoritmos, arquitetura e ciência da computação.
- **Observações:** Ranking por votos da comunidade, recalculado continuamente; foram usados os 20 primeiros colocados na data de acesso. A lista inclui títulos autopublicados que sobem por votação.

## Critério de extração

A posição segue a ordem numérica ou visual da página. Quando a fonte não declara que a
ordem é um ranking comparativo, ela é tratada apenas como ordem editorial. Edições,
subtítulos e pequenas variações foram consolidados no campo `titulo_normalizado`.

O peso de cada posição é:

`peso_posicao = (quantidade_da_lista - posicao + 1) / quantidade_da_lista`

Assim, o primeiro item recebe peso 1 e o último recebe `1 / quantidade_da_lista`.
