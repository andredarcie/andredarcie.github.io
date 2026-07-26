# Książki dla programistów, które polecamy przeczytać

- **Publicador/curador:** Droptica
- **URL:** https://www.kariera.droptica.pl/blog/lista-najlepszych-ksiazek-dla-programistow/
- **Domínio:** www.kariera.droptica.pl
- **Data de publicação/atualização identificada:** 2021-12-16
- **Data de acesso:** 2026-07-26
- **Acessibilidade na checagem final:** HTTP 200 em 2026-07-26
- **Natureza:** `curadoria_empresa`
- **Tipo de ordem:** `ordem_editorial`
- **Idioma:** `pl`
- **Quantidade usada:** 7
- **Escopo:** Código limpo, arquitetura, PHP, carreira e Drupal.
- **Observações:** Fonte em polonês; edições polonesas de livros internacionais foram mapeadas para o título canônico.

## Critério de extração

A posição segue a ordem numérica ou visual da página. Quando a fonte não declara que a
ordem é um ranking comparativo, ela é tratada apenas como ordem editorial. Edições,
subtítulos e pequenas variações foram consolidados no campo `titulo_normalizado`.

O peso de cada posição é:

`peso_posicao = (quantidade_da_lista - posicao + 1) / quantidade_da_lista`

Assim, o primeiro item recebe peso 1 e o último recebe `1 / quantidade_da_lista`.
