# Vagas de desenvolvedor: o que se pede além da stack

1.209 anúncios de vaga de desenvolvedor coletados em 27/07/2026 de 9 boards
públicos, com **50 requisitos não-stack anotados por anúncio**. Linguagem de
programação e framework ficam de fora de propósito: a pergunta do conjunto é o
que se repete nos requisitos depois que você tira "sabe React/Java" da conta.

Metade é do mercado brasileiro (565 vagas de 3 fontes diferentes) e metade do
mercado internacional remoto (644 vagas de 6 fontes).

Gerado por `npm run exportar` a partir do pipeline em
[andredarcie.github.io/job](https://andredarcie.github.io/job/).

## Formato

Todos os arquivos são CSV, UTF-8 sem BOM, separados por vírgula, decimal com
ponto, datas em `AAAA-MM-DD` e aspas conforme RFC 4180. A coluna `descricao`
contém quebras de linha dentro do campo (são os parágrafos do anúncio), o que é
válido em CSV e é lido corretamente por `pandas.read_csv` sem nenhum argumento
extra.

```python
import pandas as pd

vagas   = pd.read_csv("vagas.csv")                      # 1 linha por vaga
matriz  = pd.read_csv("vagas_requisitos_matriz.csv")    # 1 linha por vaga, 50 colunas 0/1
longo   = pd.read_csv("vagas_requisitos.csv")           # 1 linha por vaga × requisito

reqs = [c for c in matriz.columns if c.startswith("req_")]
(matriz.groupby("mercado")[reqs].mean() * 100).round(1).T.sort_values("brasil", ascending=False)
```

## Arquivos

| Arquivo | Grão | Linhas |
| --- | --- | --- |
| `vagas.csv` | uma vaga | 1.209 |
| `vagas_requisitos.csv` | um par vaga × requisito | 11.989 |
| `vagas_requisitos_matriz.csv` | uma vaga, requisitos em colunas 0/1 | 1.209 |
| `taxonomia.csv` | um requisito | 50 |
| `fontes.csv` | uma fonte | 9 |
| `ranking_requisitos.csv` | um requisito, já agregado | 50 |

`vagas.csv` e `vagas_requisitos_matriz.csv` têm a mesma chave `id`, única nos
dois. `vagas_requisitos.csv` referencia essa chave em `vaga_id`.

Os dois arquivos com `_` e `.json` na pasta não são dados: `dataset-metadata.json`
é o manifesto do `kaggle datasets create` e `_manifesto.json` é o índice que a
página de download do site consome.

### vagas.csv

| Coluna | Tipo | Descrição |
| --- | --- | --- |
| `id` | texto | Chave única. Prefixo é a fonte |
| `fonte` | categoria | Board de origem; ver `fontes.csv` |
| `mercado` | categoria | `brasil` ou `global`, derivado da fonte |
| `idioma` | categoria | `pt` ou `en`, detectado por palavras funcionais do texto |
| `titulo` | texto | Cargo, como publicado |
| `empresa` | texto | Empresa contratante |
| `local` | texto | Como o anúncio informa. 8 vazios |
| `modalidade` | categoria | `remoto`, `hibrido`, `presencial`, `nao_informado` |
| `senioridade` | categoria | `estagio`, `junior`, `pleno`, `senior`, `staff_plus`, `nao_informado` — inferida do título |
| `familia` | categoria | `backend`, `frontend`, `fullstack`, `mobile`, `devops_sre`, `dados_ml`, `qa`, `embarcado`, `jogos`, `generico` — inferida do título |
| `anos_experiencia_min` | inteiro | Anos mínimos exigidos, quando o anúncio crava um número. Vazio em 878 das 1.209 |
| `data_publicacao` | data | Como informada pela fonte |
| `data_coleta` | data | Quando este conjunto foi montado |
| `caracteres_descricao` | inteiro | Tamanho de `descricao` |
| `n_requisitos` | inteiro | Quantos dos 50 requisitos foram identificados |
| `url` | texto | Anúncio original |
| `descricao` | texto | Texto integral do anúncio, com HTML removido |

### vagas_requisitos_matriz.csv

As mesmas colunas de contexto (`id`, `fonte`, `mercado`, `idioma`,
`senioridade`, `familia`, `modalidade`, `anos_experiencia_min`,
`n_requisitos`), mais **50 colunas `req_<id>`** com 0 ou 1. A soma das 50
colunas de uma linha é igual a `n_requisitos`. **Este é o único arquivo sem
texto de terceiros**, e por isso o mais seguro de redistribuir.

### taxonomia.csv

O dicionário. `requisito_id`, `requisito` (rótulo legível), `categoria`,
`categoria_nome`, `n_padroes`, `padroes` (as expressões regulares usadas na
detecção, separadas por ` | `), `excecoes` e `nota`. É o que permite auditar
como cada número foi produzido.

As 6 categorias: comunicação e idioma, comportamento e colaboração, processo e
prática de engenharia, fundamentos técnicos que independem de linguagem,
credenciais e contexto, produto e negócio.

### fontes.csv

Uma linha por board, com o funil de triagem: quantos anúncios foram coletados,
quantos caíram fora do escopo de desenvolvimento, quantos foram excluídos por
título, quantos vieram sem descrição e quantos eram duplicados.

## Como os requisitos foram anotados

Cada requisito é detectado por padrões de texto sobre o título e a descrição
normalizados (minúsculas, sem acento). **A medida é presença ou ausência por
vaga**: um anúncio que repete "comunicação" oito vezes conta igual a um que
menciona uma vez.

Três limpezas importantes, todas aplicadas antes da detecção:

1. **O bloco final de benefícios é descartado** quando um cabeçalho reconhecido
   ("Benefícios", "Informações adicionais", "What we offer"…) aparece na metade
   final do texto — 52,9% das vagas, ~949 caracteres em média. Sem isso, "curso
   de inglês in company" contaria como exigência de inglês. **Atenção:** a coluna
   `descricao` guarda o texto **inteiro**, inclusive esse bloco. Quem refizer a
   detecção a partir do CSV precisa repetir o recorte para chegar aos mesmos
   números.
2. **URLs e e-mails são removidos**, senão um link para um repositório marcava a
   vaga como exigindo controle de versão.
3. **A flexão inclusiva sai do título** na hora de classificar: "Engenheiro(a) de
   Software" vira "engenheiro de software".

## Limitações

- **Presença de padrão não é exigência formal.** "Arquitetura" pode ser requisito
  ou descrição do produto. Por isso `descricao` está aqui: dá para conferir.
- **Silêncio não é ausência de exigência.** Anúncios do Hacker News são escritos
  pela própria engenharia e quase não listam requisitos: "trabalho em equipe"
  aparece em 7,5% deles contra 65,6% na Gupy. Compare fontes antes de concluir.
- **`senioridade` e `familia` vêm do título**, não de um campo estruturado. Metade
  das vagas não declara senioridade no título.
- **As faixas júnior e pleno são pequenas** (41 e 111 vagas) e majoritariamente
  brasileiras, enquanto staff é majoritariamente internacional. Curvas por
  senioridade misturam carreira com mercado.
- **Viés de board.** Boards remotos sobre-representam empresa de produto; a Gupy
  sobre-representa corporação e consultoria. Vaga que circula por indicação não
  aparece em lugar nenhum.
- **É uma foto**, de 27/07/2026.

## Origem e redistribuição

Os textos em `descricao` foram publicados pelas empresas contratantes em boards
públicos e **são conteúdo de terceiros** — este conjunto não reivindica direitos
sobre eles. Alguns boards pedem atribuição ou restringem redistribuição nos
próprios termos de uso. Antes de republicar `vagas.csv` em qualquer lugar,
verifique os termos das fontes listadas em `fontes.csv`.

`vagas_requisitos_matriz.csv`, `taxonomia.csv`, `fontes.csv` e
`ranking_requisitos.csv` não contêm texto de terceiros: são anotação e agregação
derivadas, e é por eles que se deve começar quando a dúvida existir.

Nenhum dado pessoal de candidato foi coletado. Os nomes que aparecem são de
empresas contratantes.
