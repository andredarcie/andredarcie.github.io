# Selección de libros de programación

- **Publicador/curador:** Dinahosting
- **URL:** https://dinahosting.com/blog/libros-de-programacion/
- **Domínio:** dinahosting.com
- **Data de publicação/atualização identificada:** não identificada
- **Data de acesso:** 2026-07-26
- **Acessibilidade na checagem final:** HTTP 200 em 2026-07-26
- **Natureza:** `curadoria_empresa`
- **Tipo de ordem:** `ordem_editorial`
- **Idioma:** `es`
- **Quantidade usada:** 20
- **Escopo:** Clássicos, livros específicos de tecnologia e novidades recentes.
- **Observações:** Fonte em espanhol, com 24 títulos divididos em clássicos, específicos e atualização de 2025; foram usados os 20 primeiros.

## Critério de extração

A posição segue a ordem numérica ou visual da página. Quando a fonte não declara que a
ordem é um ranking comparativo, ela é tratada apenas como ordem editorial. Edições,
subtítulos e pequenas variações foram consolidados no campo `titulo_normalizado`.

O peso de cada posição é:

`peso_posicao = (quantidade_da_lista - posicao + 1) / quantidade_da_lista`

Assim, o primeiro item recebe peso 1 e o último recebe `1 / quantidade_da_lista`.
