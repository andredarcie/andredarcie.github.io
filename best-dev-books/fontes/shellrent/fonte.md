# I libri da leggere se ami programmare

- **Publicador/curador:** Shellrent
- **URL:** https://www.shellrent.com/blog/i-libri-da-leggere-se-ami-programmare/
- **Domínio:** www.shellrent.com
- **Data de publicação/atualização identificada:** 2022-04-22
- **Data de acesso:** 2026-07-27
- **Acessibilidade na checagem final:** HTTP 200 em 2026-07-27
- **Natureza:** `curadoria_empresa`
- **Tipo de ordem:** `ordem_editorial`
- **Idioma:** `it`
- **Quantidade usada:** 5
- **Escopo:** Código limpo, padrões, ofício, decisão algorítmica e gestão de projetos.
- **Observações:** Fonte em italiano, com cinco indicações em ordem editorial.

## Critério de extração

A posição segue a ordem numérica ou visual da página. Quando a fonte não declara que a
ordem é um ranking comparativo, ela é tratada apenas como ordem editorial. Edições,
subtítulos e pequenas variações foram consolidados no campo `titulo_normalizado`.

O peso de cada posição é:

`peso_posicao = (quantidade_da_lista - posicao + 1) / quantidade_da_lista`

Assim, o primeiro item recebe peso 1 e o último recebe `1 / quantidade_da_lista`.
