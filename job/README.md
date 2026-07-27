# Radar de vagas dev

Coleta vagas de desenvolvedor em boards públicos, guarda o corpus inteiro em CSV
e agrega tudo em um relatório sobre **o que as vagas mais pedem em comum,
tirando linguagem de programação e framework**.

**→ [Site: andredarcie.github.io/job/](https://andredarcie.github.io/job/)**
**→ [Relatório final: analise/requisitos-comuns.md](analise/requisitos-comuns.md)**
**→ [Dados em CSV: dados/](dados/README.md)**

Última execução: 1.209 vagas de 9 fontes, 506 em português e 703 em inglês. O
Brasil entra por três fontes diferentes — ATS de corporação, página de carreira
de empresa de produto e board de startup —, e elas não pedem as mesmas coisas.

## A pergunta

Todo levantamento de vaga termina em ranking de linguagem e framework — a parte
mais visível e mais volátil do anúncio. Este projeto tira essa camada e mede o
que sobra: processo, comportamento, fundamentos técnicos que independem de
stack, credenciais e contexto de trabalho.

Resposta curta da última execução: **90,0%** dos anúncios pedem ao menos um
fundamento técnico que independe de linguagem, **78,1%** pedem algo de processo
de engenharia e **73,5%** pedem algo comportamental. Os itens isolados mais
frequentes são API/integração (55,4%), banco de dados/SQL (53,3%) e
colaboração (49,3%).

## Como rodar

```bash
npm run pipeline     # tudo: coleta → análise → relatório → site → CSV
```

Ou etapa por etapa:

```bash
npm run coletar      # busca nas 7 fontes e aplica os critérios de busca
npm run analisar     # classifica as vagas e aplica a taxonomia de requisitos
npm run agregar      # monta analise/requisitos-comuns.md
npm run site         # gera site/dados.js, que alimenta a página
npm run exportar     # escreve o corpus em dados/*.csv
```

Sem dependências: Node 20+ e as APIs públicas dos boards.

### Reprocessar sem coletar de novo

```bash
npm run coletar:offline   # reprocessa os snapshots de data/raw/
```

Board público muda todo dia. Para mexer em filtro, taxonomia ou normalização e
comparar o resultado com a rodada anterior, o modo offline reprocessa os
snapshots crus em vez de buscar na rede — mesma entrada, mesmo corpus, só a
regra muda. É assim que os ajustes de precisão do método foram validados.

## Estrutura

```
index.html              a página; abre direto do disco ou pelo GitHub Pages
site/
  estilo.css            tokens de cor, tipografia e componentes
  app.js                monta os gráficos a partir de site/dados.js
  dados.js              gerado por src/site.mjs — não editar à mão
config/
  criterios.json        critérios de busca: fontes, inclusão, exclusão, dedupe, quotas
  taxonomia.json        50 requisitos não-stack em 6 categorias, com padrões e exceções
src/
  fontes/               um módulo por board, cada um normaliza para o mesmo schema
  coletar.mjs           busca, filtra, deduplica → data/corpus/vagas.ndjson
  analisar.mjs          classifica e aplica a taxonomia → analise/estatisticas.json
  agregar.mjs           relatório final → analise/requisitos-comuns.md
  site.mjs              recorte dos dados para a página → site/dados.js
  exportar.mjs          corpus em CSV → dados/
  pipeline.mjs          roda as cinco etapas em ordem
dados/                  o corpus e o dataset em CSV, com dicionário e manifesto do Kaggle
                        vagas.csv tem 1 linha por vaga, com o texto original inteiro
analise/
  requisitos-comuns.md  ARQUIVO FINAL
  estatisticas.json     todos os números crus
  _leitura.md           seção interpretativa escrita à mão, embutida no relatório
docs/
  metodologia.md        critérios, decisões e limitações
data/
  raw/                  snapshots crus das APIs (fora do git, re-obteníveis)
  corpus/               corpus normalizado + funil de triagem da coleta
```

## Fontes

**Brasil:** Gupy (ATS de corporação, varejo e consultoria), Greenhouse das
empresas brasileiras de produto e fintech (Stone, XP, C6, Inter, Arco,
QuintoAndar, Wellhub, EBANX, VTEX, RD Station, Wildlife, Jusbrasil) e
ProgramaThor (startup e empresa pequena).

**Global:** Hacker News "Who is hiring?", We Work Remotely, Himalayas, Jobicy,
Arbeitnow e Remotive.

Remote OK foi desativado — o endpoint público parou de devolver vagas de
tecnologia. O vagas.com.br foi descartado porque proíbe o ClaudeBot no
robots.txt; Trampos e Remotar, porque renderizam a listagem no cliente e este
projeto não usa navegador. Detalhes e critérios em
[docs/metodologia.md](docs/metodologia.md).

## Site

`index.html` é servido pelo GitHub Pages em `/job/`. Não tem build nem
dependência: os dados entram por `site/dados.js`, que é um arquivo `.js` (e não
`.json`) justamente para a página abrir por `file://` sem servidor.

Convenção de cache do repositório: os assets são chamados com `?v=N` e o rodapé
mostra `build N`. **Ao alterar `site/app.js` ou `site/estilo.css`, incremente o
`?v=N` nas duas tags do `index.html` e o `build N` do rodapé para o mesmo
número** — o GitHub Pages guarda cache por cerca de 10 minutos.

A paleta dos gráficos é a paleta validada para daltonismo (azul/laranja
categórico e uma rampa azul de 4 passos para a escala ordinal de senioridade),
conferida contra as superfícies claras e escuras deste projeto.

## Editar a análise

O relatório é gerado, mas a interpretação não. `analise/_leitura.md` é escrito à
mão e embutido no topo do relatório por `agregar.mjs` — assim regerar os números
não apaga o texto. Ao mudar a taxonomia ou coletar de novo, revise os números
citados nele.
