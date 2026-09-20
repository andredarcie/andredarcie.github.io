from playwright.sync_api import sync_playwright
import pandas as pd
import re
import json
from datetime import datetime

BASE_URL = "https://webapp1-divinolandia.cidade360.cloud/pronimtb"

def to_number(s):
    if not s:
        return 0.0
    s = str(s).strip().replace("R$", "").replace(" ", "")
    s = s.replace(".", "").replace(",", ".")
    try:
        return float(s)
    except:
        return 0.0

def extract_table(page):
    """Extrai dados da tabela principal de resultados."""
    rows_data = []
    try:
        # Aguarda a tabela de resultados carregar
        page.wait_for_selector("table", timeout=10000)
        tables = page.query_selector_all("table")

        for table in tables:
            rows = table.query_selector_all("tr")
            if len(rows) < 3:
                continue

            # Pega cabeçalhos
            header_cells = rows[0].query_selector_all("th, td")
            headers = [c.inner_text().strip() for c in header_cells]

            if not headers or len(headers) < 2:
                continue

            # Verifica se é tabela de dados financeiros
            headers_text = " ".join(headers).lower()
            if not any(x in headers_text for x in ["valor", "empenh", "credor", "fornec", "nature", "pago", "descri", "total"]):
                continue

            print(f"Tabela encontrada: {headers}")
            for row in rows[1:]:
                cells = row.query_selector_all("td")
                if not cells:
                    continue
                values = [c.inner_text().strip() for c in cells]
                if len(values) >= 2 and any(v for v in values):
                    row_dict = {}
                    for i, val in enumerate(values):
                        key = headers[i] if i < len(headers) else f"col_{i}"
                        row_dict[key] = val
                    rows_data.append(row_dict)

    except Exception as e:
        print(f"Erro ao extrair tabela: {e}")

    return rows_data

def select_year_2026(page):
    """Seleciona o ano 2026 no dropdown."""
    try:
        # Aguarda o select de ano estar disponível
        page.wait_for_selector("#cmbAno", timeout=8000)

        # Espera até ter opções no select
        for _ in range(10):
            options = page.eval_on_selector("#cmbAno", "el => Array.from(el.options).map(o => o.value)")
            if len(options) > 1:
                break
            page.wait_for_timeout(500)

        options = page.eval_on_selector("#cmbAno", "el => Array.from(el.options).map(o => ({value: o.value, text: o.text}))")
        print(f"Anos disponíveis: {options}")

        # Seleciona 2026
        page.select_option("#cmbAno", label="2026")
        page.wait_for_timeout(1500)
        print("Ano 2026 selecionado")
        return True
    except Exception as e:
        print(f"Erro ao selecionar ano: {e}")
        return False

def click_consultar(page):
    """Clica no botão de consultar/pesquisar."""
    try:
        for selector in ["input[type=submit][name=confirma]", "input[value='Consultar']",
                         "input[value='Pesquisar']", "button[type=submit]", "#confirma"]:
            btn = page.query_selector(selector)
            if btn:
                btn.click()
                page.wait_for_timeout(3000)
                print(f"Botão clicado: {selector}")
                return True
    except Exception as e:
        print(f"Erro ao clicar botão: {e}")
    return False

def scrape_section(page, url, section_name, wait_extra=0):
    """Scrape uma seção específica do portal."""
    print(f"\n{'='*50}")
    print(f"Scraping: {section_name}")
    print(f"URL: {url}")

    page.goto(url)
    page.wait_for_timeout(2000 + wait_extra)

    year_ok = select_year_2026(page)
    if not year_ok:
        print("Não foi possível selecionar 2026, tentando sem filtro de ano...")

    click_consultar(page)
    page.wait_for_timeout(3000)

    # Screenshot para debug
    page.screenshot(path=f"screenshot_{section_name.replace(' ', '_')}.png")

    rows = extract_table(page)
    print(f"Registros extraídos: {len(rows)}")
    return rows

def main():
    print("=" * 60)
    print("SCRAPING PLAYWRIGHT - GASTOS DIVINOLÂNDIA 2026")
    print("=" * 60)

    all_data = {}

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1280, "height": 900},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        )
        page = context.new_page()

        # Carrega a página inicial para estabelecer sessão
        print("Carregando página inicial...")
        page.goto(BASE_URL + "/index.asp")
        page.wait_for_timeout(2000)

        sections = [
            (f"{BASE_URL}/index.asp?acao=3&item=10", "Credores"),
            (f"{BASE_URL}/index.asp?acao=3&item=2", "Natureza_Despesa"),
            (f"{BASE_URL}/index.asp?acao=3&item=1", "Acao_Governo"),
            (f"{BASE_URL}/index.asp?acao=3&item=4", "Classificacao_Institucional"),
        ]

        for url, name in sections:
            rows = scrape_section(page, url, name)
            if rows:
                all_data[name] = rows
                df_section = pd.DataFrame(rows)
                df_section.to_csv(f"dados_{name}.csv", index=False, encoding="utf-8-sig")
                print(f"Salvos em dados_{name}.csv ({len(rows)} registros)")

        browser.close()

    # Consolida e identifica top gastos
    if all_data:
        all_rows = []
        for section, rows in all_data.items():
            for row in rows:
                row["_secao"] = section
                all_rows.append(row)

        df = pd.DataFrame(all_rows)
        print(f"\nTotal de registros: {len(df)}")
        print(f"Colunas: {df.columns.tolist()}")

        # Detecta coluna de valor
        value_col = None
        for col in df.columns:
            if col.startswith("_"):
                continue
            col_lower = col.lower()
            if any(x in col_lower for x in ["empenhado", "pago", "liquidado", "total", "valor"]):
                if df[col].dropna().apply(lambda x: bool(re.search(r'\d', str(x)))).any():
                    value_col = col
                    break

        print(f"Coluna de valor: {value_col}")

        if value_col:
            df["_valor_num"] = df[value_col].apply(to_number)
            df_sorted = df[df["_valor_num"] > 0].sort_values("_valor_num", ascending=False)
            df_top50 = df_sorted.head(50)
            df_top50.to_csv("gastos_divinolandia_2026_top50.csv", index=False, encoding="utf-8-sig")

            print("\n" + "="*60)
            print("TOP 20 MAIORES GASTOS - DIVINOLÂNDIA 2026")
            print("="*60)
            cols_show = [c for c in df_top50.columns if not c.startswith("_")][:4] + [value_col, "_valor_num"]
            cols_show = list(dict.fromkeys(cols_show))
            print(df_top50[cols_show].head(20).to_string(index=False))
            print(f"\nArquivo completo: gastos_divinolandia_2026_top50.csv")
        else:
            df.to_csv("gastos_divinolandia_2026_todos.csv", index=False, encoding="utf-8-sig")
            print("\nColunas de valor não detectadas. Dados salvos sem ordenação.")
            print("Primeiras linhas:")
            print(df.head(10).to_string())
    else:
        print("\nNenhum dado extraído. Verifique os screenshots para diagnóstico.")

if __name__ == "__main__":
    main()
