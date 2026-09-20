from playwright.sync_api import sync_playwright
import pandas as pd
import re

BASE_URL = "https://webapp1-divinolandia.cidade360.cloud/pronimtb"

def to_number(s):
    if not s:
        return 0.0
    s = str(s).strip().replace("R$", "").replace("\xa0", "").replace(" ", "")
    s = s.replace(".", "").replace(",", ".")
    try:
        return float(s)
    except:
        return 0.0

def extract_data_table(page, expected_cols):
    """Extrai apenas a tabela de dados (não navegação)."""
    page.wait_for_timeout(4000)

    # Aguarda a tabela de dados aparecer - ela tem os headers esperados
    tables = page.query_selector_all("table")

    for table in tables:
        rows = table.query_selector_all("tr")
        if len(rows) < 2:
            continue

        # Pega cabeçalho da primeira linha
        header_cells = rows[0].query_selector_all("th, td")
        headers = [c.inner_text().strip() for c in header_cells]
        headers_text = " ".join(h.lower() for h in headers)

        # Verifica se é uma tabela de dados financeiros (não de navegação)
        has_financial = any(x in headers_text for x in expected_cols)
        is_nav = any(x in headers_text for x in ["administraç", "receitas\n", "despesas\n", "publicações"])

        if has_financial and not is_nav:
            print(f"  Tabela de dados: {headers[:5]}")
            rows_data = []
            for row in rows[1:]:
                cells = row.query_selector_all("td")
                if not cells:
                    continue
                values = [c.inner_text().strip() for c in cells]
                if any(v for v in values):
                    row_dict = {}
                    for i, val in enumerate(values):
                        key = headers[i] if i < len(headers) else f"col_{i}"
                        row_dict[key] = val
                    rows_data.append(row_dict)
            if rows_data:
                return headers, rows_data

    return [], []

def select_year_and_wait(page, year="2026"):
    """Seleciona o ano e aguarda os dados carregarem."""
    try:
        page.wait_for_selector("#cmbAno option[value!='0']", timeout=10000)
    except:
        pass

    options = page.eval_on_selector("#cmbAno", "el => Array.from(el.options).map(o => ({value: o.value, text: o.text}))")
    year_value = next((o["value"] for o in options if o["text"] == year), None)

    if not year_value:
        print(f"  Ano {year} não encontrado. Opções: {[o['text'] for o in options[:5]]}")
        return False

    print(f"  Selecionando ano {year} (value: {year_value[:30]})")
    page.select_option("#cmbAno", value=year_value)
    page.wait_for_timeout(5000)  # Aguarda AJAX carregar dados
    return True

def scrape_credores(page):
    """Scrape da página Credores - maiores beneficiários."""
    print("\n[CREDORES - Maiores beneficiários]")
    page.goto(f"{BASE_URL}/index.asp?acao=3&item=10")
    page.wait_for_timeout(2000)

    if not select_year_and_wait(page, "2026"):
        return []

    expected = ["credor", "empenhado", "pago", "valor", "total", "liquidado"]
    headers, rows = extract_data_table(page, expected)

    if not rows:
        # Tenta aguardar mais
        page.wait_for_timeout(3000)
        headers, rows = extract_data_table(page, expected)

    # Salva screenshot e HTML para debug
    page.screenshot(path="debug_credores.png")
    with open("debug_credores_v2.html", "w", encoding="utf-8") as f:
        f.write(page.content())

    return rows

def scrape_natureza(page):
    """Scrape de Despesas por Natureza."""
    print("\n[NATUREZA DA DESPESA]")
    page.goto(f"{BASE_URL}/index.asp?acao=3&item=2")
    page.wait_for_timeout(2000)

    if not select_year_and_wait(page, "2026"):
        return []

    expected = ["natureza", "despesa", "empenhado", "pago", "valor", "total"]
    headers, rows = extract_data_table(page, expected)

    if not rows:
        page.wait_for_timeout(3000)
        headers, rows = extract_data_table(page, expected)

    return rows

def scrape_acao_governo(page):
    """Scrape de Despesas por Ação de Governo."""
    print("\n[AÇÃO DE GOVERNO]")
    page.goto(f"{BASE_URL}/index.asp?acao=3&item=1")
    page.wait_for_timeout(2000)

    if not select_year_and_wait(page, "2026"):
        return []

    expected = ["ação", "acao", "governo", "empenhado", "pago", "valor"]
    headers, rows = extract_data_table(page, expected)
    return rows

def main():
    print("=" * 60)
    print("MAIORES GASTOS - PREFEITURA DIVINOLÂNDIA 2026")
    print("=" * 60)

    all_results = {}

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox"])
        context = browser.new_context(
            viewport={"width": 1280, "height": 1024},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        )
        page = context.new_page()

        # Sessão inicial
        page.goto(BASE_URL + "/index.asp")
        page.wait_for_timeout(2000)

        # Scrape das principais seções
        credores = scrape_credores(page)
        if credores:
            all_results["Credores"] = credores
            print(f"  {len(credores)} credores capturados")

        natureza = scrape_natureza(page)
        if natureza:
            all_results["Natureza_Despesa"] = natureza
            print(f"  {len(natureza)} naturezas capturadas")

        acao = scrape_acao_governo(page)
        if acao:
            all_results["Acao_Governo"] = acao
            print(f"  {len(acao)} ações capturadas")

        browser.close()

    # Processa e gera relatório final
    if not all_results:
        print("\nNenhum dado extraído. Verifique debug_credores.png e debug_credores_v2.html")
        return

    # Processa cada seção separadamente
    for section, rows in all_results.items():
        if not rows:
            continue

        df = pd.DataFrame(rows)
        # Remove colunas vazias
        df = df.loc[:, (df != "").any(axis=0)]
        df = df.dropna(how="all", axis=1)

        print(f"\n=== {section} ===")
        print(f"Colunas: {df.columns.tolist()}")
        print(df.head(5).to_string())

        # Detecta coluna de valor
        value_col = None
        for col in df.columns:
            samples = df[col].dropna().head(10)
            nums = samples.apply(lambda x: to_number(str(x)))
            if nums.max() > 1000:
                value_col = col
                break

        if value_col:
            df["_valor"] = df[value_col].apply(to_number)
            df_sorted = df[df["_valor"] > 0].sort_values("_valor", ascending=False)
            df_sorted.to_csv(f"top_{section}_2026.csv", index=False, encoding="utf-8-sig")
            print(f"\nTop 20 por {value_col}:")
            print(df_sorted.head(20)[[c for c in df_sorted.columns[:3]] + ["_valor"]].to_string(index=False))
        else:
            df.to_csv(f"dados_{section}_2026.csv", index=False, encoding="utf-8-sig")

    # Tenta consolidar para o arquivo final top50
    print("\n" + "=" * 60)
    print("Gerando arquivo consolidado...")

    all_rows_flat = []
    for section, rows in all_results.items():
        for row in rows:
            row["_fonte"] = section
            all_rows_flat.append(row)

    if all_rows_flat:
        df_all = pd.DataFrame(all_rows_flat)
        # Detecta melhor coluna de valor
        value_col_global = None
        for col in df_all.columns:
            if col.startswith("_"):
                continue
            samples = df_all[col].dropna().apply(lambda x: to_number(str(x)))
            if samples.max() > 10000:
                value_col_global = col
                break

        if value_col_global:
            df_all["_valor_num"] = df_all[value_col_global].apply(to_number)
            df_top = df_all[df_all["_valor_num"] > 0].sort_values("_valor_num", ascending=False)
            df_top.head(50).to_csv("gastos_divinolandia_2026_top50.csv", index=False, encoding="utf-8-sig")
            print(f"Top 50 salvo em: gastos_divinolandia_2026_top50.csv")
        else:
            df_all.to_csv("gastos_divinolandia_2026_todos.csv", index=False, encoding="utf-8-sig")
            print("Dados salvos em: gastos_divinolandia_2026_todos.csv")

if __name__ == "__main__":
    main()
