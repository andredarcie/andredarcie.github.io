# La liste de livres à lire d'un développeur sénior

- **Publicador/curador:** Nathanaël Cherrier / Mindsers Blog
- **URL:** https://mindsers.blog/readings/
- **Domínio:** mindsers.blog
- **Data de publicação/atualização identificada:** não identificada
- **Data de acesso:** 2026-07-26
- **Acessibilidade na checagem final:** HTTP 200 em 2026-07-26
- **Natureza:** `curadoria_individual`
- **Tipo de ordem:** `ordem_editorial`
- **Idioma:** `fr`
- **Quantidade usada:** 14
- **Escopo:** Ofício, algoritmos, DDD, DevOps e documentação.
- **Observações:** Fonte em francês. Foi usada a seção de programação e computação; a seção de finanças pessoais ficou de fora.

## Critério de extração

A posição segue a ordem numérica ou visual da página. Quando a fonte não declara que a
ordem é um ranking comparativo, ela é tratada apenas como ordem editorial. Edições,
subtítulos e pequenas variações foram consolidados no campo `titulo_normalizado`.

O peso de cada posição é:

`peso_posicao = (quantidade_da_lista - posicao + 1) / quantidade_da_lista`

Assim, o primeiro item recebe peso 1 e o último recebe `1 / quantidade_da_lista`.
