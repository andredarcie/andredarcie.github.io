# onde-vai-o-dinheiro

Portal de transparência não oficial para os gastos públicos da **Prefeitura de Divinolândia – SP**, com dados do exercício de **2026** (01/01 a 21/05/2026).

## O que é

Um scraper que coleta dados do portal oficial PRONIM TB (Cidade360) e os apresenta num site estático, bonito e fácil de entender — sem precisar navegar pelo sistema da prefeitura.

- **566 credores** coletados e ranqueados por valor empenhado
- **R$ 29,5 milhões** em empenhos registrados no período
- Portal estático em `index.html` — abre direto no browser, sem servidor

## Estrutura

```
.
├── index.html                          # Portal de transparência (abrir no browser)
├── scraping/                           # Scripts Python de coleta
│   ├── scraping_paginado.py            # Script principal — coleta todas as páginas
│   ├── scraping_todas_paginas.py       # Variante via requests (sem JS)
│   ├── extrai_gastos_final.py          # Extração com natureza de despesa
│   ├── captura_form_headless.py        # Exploração inicial do formulário
│   └── ...                             # Scripts de iteração anteriores
├── data/                               # Dados extraídos
│   ├── gastos_divinolandia_2026_completo.csv   # Todos os 566 credores
│   ├── gastos_divinolandia_2026_top50.csv      # Top 50 por valor empenhado
│   └── ...                             # CSVs auxiliares por categoria
└── debug/                              # Artefatos de depuração (HTML, PNG, JSON)
```

## Como usar

### Ver o portal

Abra `index.html` no browser. Não precisa de servidor.

### Rodar o scraper novamente

```bash
pip install playwright beautifulsoup4 pandas
playwright install chromium

python scraping/scraping_paginado.py
```

Os CSVs são gerados em `data/` com o resultado atualizado.

## Portal de origem

Os dados vêm do sistema **PRONIM TB** da Cidade360:  
`https://webapp1-divinolandia.cidade360.cloud/pronimtb/`

O portal usa ASP com sessões server-side e um botão de submit (`#confirma`) ocultado via CSS, que precisa ser ativado por JavaScript para a consulta funcionar.

## Notas técnicas

- O portal exige Playwright (renderização JS) — requests puro não retorna dados
- A paginação usa URLs do tipo `numpag=X` embutidas em `javascript:location.href='...'`
- O ano é armazenado num cookie `ckAno` com formato `2026|DW_LC131_FC_13|`
- Foram 7 páginas de resultados no período consultado

## Aviso

Este é um projeto não oficial, para fins informativos e de transparência cidadã.  
Os dados são públicos e extraídos do portal oficial da prefeitura.
