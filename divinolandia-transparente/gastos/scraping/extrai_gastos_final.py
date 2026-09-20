from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
import pandas as pd
import re
from datetime import datetime

BASE_URL = "https://webapp1-divinolandia.cidade360.cloud/pronimtb"
DATA_INICIO = "01/01/2026"
DATA_FIM = "21/05/2026"

def to_number(s):
    if not s:
        return 0.0
    s = str(s).replace("R$", "").replace("\xa0", "").replace(" ", "")
    s = s.replace(".", "").replace(",", ".")
    try:
        return float(s)
    except:
        return 0.0

def extract_credores_table(html):
    """Extrai a tabela de credores com cabeçalhos corretos."""
    soup = BeautifulSoup(html, "html.parser")
    money_pattern = re.compile(r"\d{1,3}(?:\.\d{3})*,\d{2}")

    for table in soup.find_all("table"):
        rows = table.find_all("tr")
        if len(rows) < 3:
            continue

        text = table.get_text()
        # Verifica se é tabela de credores
        if not ("CNPJ" in text or "Empenhado" in text or "Pago" in text):
            continue
        if not money_pattern.search(text):
            continue

        # Pega cabeçalhos da segunda linha (Row 1)
        header_row = rows[1] if len(rows) > 1 else rows[0]
        headers = [c.get_text(strip=True) for c in header_row.find_all(["th", "td"])]

        if not headers or "Nome" not in headers[0] and "Credor" not in headers[0]:
            # Tenta a primeira linha
            headers = [c.get_text(strip=True) for c in rows[0].find_all(["th", "td"])]

        print(f"Cabeçalhos encontrados: {headers[:7]}")

        data_rows = []
        start = 2 if "Nome" in (headers[0] if headers else "") or "Credor" in (headers[0] if headers else "") else 1

        for row in rows[start:]:
            cells = [c.get_text(strip=True) for c in row.find_all("td")]
            if not cells or len(cells) < 2:
                continue
            if not any(money_pattern.search(c) for c in cells):
                continue

            row_dict = {}
            for i, val in enumerate(cells):
                key = headers[i] if i < len(headers) else f"col_{i}"
                row_dict[key] = val
            data_rows.append(row_dict)

        if data_rows:
            return headers, data_rows

    return [], []

def scrape_credores_ano(page):
    """Extrai gastos por credor para o ano de 2026."""
    print("\n[CREDORES 2026]")
    page.goto(f"{BASE_URL}/index.asp?acao=3&item=10")
    page.wait_for_timeout(3000)

    # Seleciona ano 2026
    options = page.eval_on_selector(
        "#cmbAno",
        "el => Array.from(el.options).map(o => ({value: o.value, text: o.text}))"
    )
    year_opt = next((o for o in options if o["text"] == "2026"), None)
    if not year_opt:
        print("Ano 2026 não encontrado!")
        return []

    page.select_option("#cmbAno", value=year_opt["value"])
    page.wait_for_timeout(2000)

    # Define período completo do ano
    try:
        page.fill("#txtDataInicial", DATA_INICIO)
        page.fill("#txtDataFinal", DATA_FIM)
        print(f"Período: {DATA_INICIO} a {DATA_FIM}")
    except Exception as e:
        print(f"Campos de data não encontrados: {e}")

    # Seleciona tipo orçamentário (todos)
    try:
        page.check("#ckEmpenhoOrcamentario")
    except:
        pass

    # Submete formulário
    try:
        page.evaluate("document.getElementById('confirma').style.display = 'block'")
        page.evaluate("document.getElementById('confirma').click()")
        try:
            page.wait_for_load_state("networkidle", timeout=15000)
        except:
            page.wait_for_timeout(8000)
        print("Formulário submetido.")
    except Exception as e:
        print(f"Erro ao submeter: {e}")

    try:
        html = page.content()
    except:
        page.wait_for_timeout(5000)
        html = page.content()

    # Debug: conta valores monetários
    money = re.findall(r"\d{1,3}(?:\.\d{3})*,\d{2}", html)
    print(f"Valores monetários no HTML: {len(money)}")

    # Salva debug
    with open("debug_credores_ano.html", "w", encoding="utf-8") as f:
        f.write(html)

    headers, rows = extract_credores_table(html)
    print(f"Credores extraídos: {len(rows)}")
    return rows

def scrape_natureza_ano(page):
    """Extrai gastos por natureza de despesa em 2026."""
    print("\n[NATUREZA DA DESPESA 2026]")
    page.goto(f"{BASE_URL}/index.asp?acao=3&item=2")
    page.wait_for_timeout(3000)

    options = page.eval_on_selector(
        "#cmbAno",
        "el => Array.from(el.options).map(o => ({value: o.value, text: o.text}))"
    )
    year_opt = next((o for o in options if o["text"] == "2026"), None)
    if year_opt:
        page.select_option("#cmbAno", value=year_opt["value"])
        page.wait_for_timeout(2000)

    try:
        page.fill("#txtDataInicial", DATA_INICIO)
        page.fill("#txtDataFinal", DATA_FIM)
    except:
        pass

    try:
        page.evaluate("document.getElementById('confirma').style.display = 'block'")
        page.evaluate("document.getElementById('confirma').click()")
        try:
            page.wait_for_load_state("networkidle", timeout=15000)
        except:
            page.wait_for_timeout(8000)
    except Exception as e:
        print(f"Erro: {e}")

    try:
        html = page.content()
    except:
        page.wait_for_timeout(5000)
        html = page.content()
    with open("debug_natureza_ano.html", "w", encoding="utf-8") as f:
        f.write(html)

    headers, rows = extract_credores_table(html)
    print(f"Naturezas extraídas: {len(rows)}")
    return rows

def main():
    print("=" * 60)
    print(f"MAIORES GASTOS - DIVINOLÂNDIA 2026 ({DATA_INICIO} a {DATA_FIM})")
    print("=" * 60)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 1024})
        page = context.new_page()

        page.goto(BASE_URL + "/index.asp")
        page.wait_for_timeout(2000)

        credores = scrape_credores_ano(page)
        natureza = scrape_natureza_ano(page)

        browser.close()

    # Processa credores
    if credores:
        df = pd.DataFrame(credores)
        print(f"\nColunas: {df.columns.tolist()}")

        # Detecta coluna de valor principal (Empenhado ou Pago)
        value_col = None
        for col in df.columns:
            col_lower = col.lower()
            if "empenhado" in col_lower or "pago" in col_lower or "valor" in col_lower:
                nums = df[col].apply(to_number)
                if nums.max() > 0:
                    if value_col is None or "empenhado" in col_lower:
                        value_col = col

        if value_col:
            df["_valor_empenhado"] = df[value_col].apply(to_number)
        else:
            # Usa primeira coluna numérica
            for col in df.columns:
                nums = df[col].apply(to_number)
                if nums.max() > 1000:
                    df["_valor_empenhado"] = nums
                    value_col = col
                    break

        print(f"Coluna de valor: {value_col}")
        df_sorted = df[df["_valor_empenhado"] > 0].sort_values("_valor_empenhado", ascending=False)

        # Salva CSV
        output_file = "gastos_divinolandia_2026_top50.csv"
        df_sorted.head(50).to_csv(output_file, index=False, encoding="utf-8-sig")

        # Exibe resultado
        print("\n" + "=" * 70)
        print(f"TOP 30 MAIORES GASTOS POR CREDOR - DIVINOLÂNDIA 2026")
        print(f"Período: {DATA_INICIO} a {DATA_FIM}")
        print("=" * 70)

        show_cols = [c for c in df_sorted.columns if not c.startswith("_")]
        if len(show_cols) > 5:
            show_cols = show_cols[:5]

        df_display = df_sorted[show_cols].head(30).copy()
        df_display.index = range(1, len(df_display) + 1)
        print(df_display.to_string())

        print(f"\nTotal de credores: {len(df_sorted)}")
        print(f"\nTop 50 completo salvo em: {output_file}")

        # Estatísticas
        total_emp = df_sorted["_valor_empenhado"].sum()
        print(f"\nTotal empenhado por todos os credores: R$ {total_emp:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."))

    if natureza:
        df_nat = pd.DataFrame(natureza)
        df_nat.to_csv("natureza_despesa_2026.csv", index=False, encoding="utf-8-sig")
        print(f"\nNatureza da despesa salva em: natureza_despesa_2026.csv")

if __name__ == "__main__":
    main()
