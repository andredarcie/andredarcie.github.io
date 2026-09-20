# AGENTS.md

Instruções para agentes de IA trabalhando neste repositório.

## Contexto do projeto

Scraper + portal estático de transparência para a Prefeitura de Divinolândia (SP).  
O portal de origem é o PRONIM TB (Cidade360), um sistema ASP legado com comportamento não trivial.

## Arquitetura

- **Coleta**: Python + Playwright (necessário — o portal não funciona sem JS)
- **Dados**: CSVs em `data/`, com colunas `Nome`, `CNPJ/CPF`, `Valor Empenhado`, `Valor Pago`, etc.
- **Apresentação**: `index.html` único, autocontido, com dados embutidos como JSON no `<script>`

## Peculiaridades do portal de origem

Antes de alterar qualquer lógica de scraping, leia estas regras — foram aprendidas na prática:

1. **Playwright obrigatório** — requisições HTTP diretas retornam apenas o HTML de navegação, sem dados.

2. **Botão de submit oculto** — o botão `#confirma` está com `display:none` no CSS. É necessário torná-lo visível via JS antes de clicar:
   ```python
   page.evaluate("document.getElementById('confirma').style.display = 'block'")
   page.evaluate("document.getElementById('confirma').click()")
   ```

3. **Sessão server-side** — o ano selecionado fica em cookie `ckAno` com valor `2026|DW_LC131_FC_13|`. A sessão deve ser mantida entre navegações (mesmo contexto Playwright).

4. **Paginação via URL, não via click** — clicar nos links de paginação destrói o contexto JS ("Execution context was destroyed"). A solução correta é extrair a URL do `href` e usar `page.goto(url)`:
   ```python
   # href pode ser: javascript:location.href='/pronimtb/index.asp?...&numpag=2'
   match = re.search(r"location\.href='([^']+)'", href)
   url = "https://webapp1-divinolandia.cidade360.cloud" + match.group(1)
   page.goto(url)
   ```

5. **Datas explícitas necessárias** — sem preencher `#txtDataInicial` e `#txtDataFinal`, a consulta retorna apenas o mês corrente. Preencher antes de submeter.

6. **Cabeçalhos da tabela** — estão na linha de índice 1 (não 0) da `<table>`. A linha 0 é um cabeçalho de seção sem dados úteis.

## Script principal

`scraping/scraping_paginado.py` — coleta todas as páginas e gera os CSVs em `data/`.  
Os demais scripts em `scraping/` são iterações anteriores, mantidos para referência.

## Atualizar o portal (index.html)

O `index.html` embute os dados como um array JSON na variável `DATA` no `<script>`.  
Para atualizar com novos dados:
1. Rodar `scraping_paginado.py` para gerar `data/gastos_divinolandia_2026_top50.csv`
2. Converter o CSV para o formato JSON esperado e substituir o array `DATA`
3. Atualizar a constante `MAX_VAL` com o maior `valor_num` do novo dataset
4. Atualizar as datas no header e footer do HTML

## O que não fazer

- Não usar `requests` puro para coletar dados — retorna só navegação
- Não clicar em links de paginação com `link.click()` — quebra o contexto JS
- Não remover o `page.wait_for_timeout()` após submissão — o portal é lento
- Não assumir que a tabela começa na linha 0
