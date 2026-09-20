from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
import pandas as pd
import re

BASE_URL = "https://webapp1-divinolandia.cidade360.cloud/pronimtb"

def to_number(s):
    if not s:
        return 0.0
    s = str(s).replace("R$", "").replace("\xa0", "").replace(" ", "")
    s = s.replace(".", "").replace(",", ".")
    try:
        return float(s)
    except:
        return 0.0

def mascara_cpf(doc):
    """CPF de pessoa física só com os 6 dígitos do meio, como no Portal da Transparência federal."""
    return re.sub(r"\d{3}\.(\d{3})\.(\d{3})-\d{2}", r"***.\1.\2-**", str(doc))

def extract_table_from_html(html):
    """Extrai credores da tabela com CNPJ e valores."""
    soup = BeautifulSoup(html, "html.parser")
    money_pattern = re.compile(r"\d{1,3}(?:\.\d{3})*,\d{2}")

    for table in soup.find_all("table"):
        text = table.get_text()
        if ("CNPJ" not in text and "CPF" not in text) or not money_pattern.search(text):
            continue

        rows = table.find_all("tr")
        if len(rows) < 3:
            continue

        # Encontra a linha de cabeçalhos
        headers = []
        header_idx = 0
        for i, row in enumerate(rows[:5]):
            cells = [c.get_text(strip=True) for c in row.find_all(["th", "td"])]
            if any(x in cells for x in ["Nome", "CNPJ/CPF", "Valor Empenhado", "Valor Pago"]):
                headers = cells
                header_idx = i
                break

        if not headers:
            continue

        data_rows = []
        for row in rows[header_idx + 1:]:
            cells = [c.get_text(strip=True) for c in row.find_all("td")]
            if len(cells) < 3:
                continue
            if not any(money_pattern.search(c) for c in cells):
                continue
            if "total" in cells[0].lower() or not cells[0]:
                continue

            row_dict = {}
            for i, val in enumerate(cells):
                key = headers[i] if i < len(headers) else f"col_{i}"
                row_dict[key] = val
            data_rows.append(row_dict)

        if data_rows:
            return headers, data_rows

    return [], []

def get_pagination_info(html):
    """Retorna o número total de páginas e se há próxima página."""
    soup = BeautifulSoup(html, "html.parser")
    max_page = 1
    has_next = False

    for a in soup.find_all("a", href=True):
        text = a.get_text(strip=True)
        href = a["href"]

        if "próxima" in text.lower():
            has_next = True

        match = re.search(r"numpag=(\d+)", href)
        if match:
            max_page = max(max_page, int(match.group(1)))

    return max_page, has_next

def submit_credores_form(page):
    """Submete o formulário de credores com período 01/01/2026 a 21/05/2026."""
    page.goto(f"{BASE_URL}/index.asp?acao=3&item=10")
    page.wait_for_timeout(3000)

    # Seleciona ano 2026
    options = page.eval_on_selector(
        "#cmbAno",
        "el => Array.from(el.options).map(o => ({value: o.value, text: o.text}))"
    )
    year_opt = next((o for o in options if o["text"] == "2026"), None)
    if year_opt:
        page.select_option("#cmbAno", value=year_opt["value"])
        page.wait_for_timeout(2000)

    # Define datas
    try:
        page.fill("#txtDataInicial", "01/01/2026")
        page.fill("#txtDataFinal", "21/05/2026")
    except:
        pass

    # Submete
    page.evaluate("document.getElementById('confirma').style.display = 'block'")
    page.evaluate("document.getElementById('confirma').click()")
    try:
        page.wait_for_load_state("networkidle", timeout=12000)
    except:
        page.wait_for_timeout(6000)

def get_page_url(html, page_num):
    """Extrai a URL de uma página específica a partir do HTML atual."""
    soup = BeautifulSoup(html, "html.parser")
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if f"numpag={page_num}" in href:
            # Converte URL relativa para absoluta
            if href.startswith("/"):
                return f"https://webapp1-divinolandia.cidade360.cloud{href}"
            elif href.startswith("javascript:"):
                # Extrai URL do javascript
                match = re.search(r"location\.href='([^']+)'", href)
                if match:
                    url = match.group(1)
                    if url.startswith("/"):
                        return f"https://webapp1-divinolandia.cidade360.cloud{url}"
    return None

def navigate_to_page(page, page_num, current_html):
    """Navega para uma página específica usando a URL extraída do HTML."""
    url = get_page_url(current_html, page_num)
    if url:
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=20000)
            page.wait_for_timeout(3000)
            return True
        except Exception as e:
            print(f"Erro ao navegar para página {page_num}: {e}")
    return False

def main():
    print("=" * 60)
    print("GASTOS PREFEITURA DIVINOLÂNDIA 2026 - TODAS AS PÁGINAS")
    print("Período: 01/01/2026 a 21/05/2026")
    print("=" * 60)

    all_credores = []
    headers = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 1024})
        page = context.new_page()

        page.goto(BASE_URL + "/index.asp")
        page.wait_for_timeout(2000)

        # Submete o formulário
        print("\nSubmetendo formulário (01/01/2026 a 21/05/2026)...")
        submit_credores_form(page)

        # Extrai dados da página 1
        try:
            html = page.content()
        except:
            page.wait_for_timeout(3000)
            html = page.content()

        n_pages, has_next = get_pagination_info(html)
        print(f"Total de páginas: {n_pages}")

        headers, rows = extract_table_from_html(html)
        print(f"Página 1: {len(rows)} credores")
        all_credores.extend(rows)

        current_html = html
        # Navega pelas páginas restantes
        for pg in range(2, n_pages + 1):
            print(f"Navegando para página {pg}...")
            success = navigate_to_page(page, pg, current_html)
            if not success:
                print(f"  Não foi possível navegar para página {pg}")
                break

            try:
                current_html = page.content()
            except:
                page.wait_for_timeout(3000)
                current_html = page.content()

            _, rows_pg = extract_table_from_html(current_html)
            print(f"  {len(rows_pg)} credores")
            all_credores.extend(rows_pg)

        browser.close()

    print(f"\nTotal de credores coletados: {len(all_credores)}")

    if not all_credores:
        print("Nenhum dado coletado!")
        return

    # Processa dados
    df = pd.DataFrame(all_credores)
    print(f"Colunas: {df.columns.tolist()}")

    # Remove duplicatas
    df = df.drop_duplicates(subset=["Nome", "CNPJ/CPF"] if "CNPJ/CPF" in df.columns else df.columns[:2])
    print(f"Após remover duplicatas: {len(df)} credores")
    if "CNPJ/CPF" in df.columns:
        df["CNPJ/CPF"] = df["CNPJ/CPF"].map(mascara_cpf)

    # Ordena por Valor Empenhado
    value_col = "Valor Empenhado" if "Valor Empenhado" in df.columns else None
    if not value_col:
        for col in df.columns:
            if "valor" in col.lower() or "empenh" in col.lower():
                value_col = col
                break

    if value_col:
        df["_valor"] = df[value_col].apply(to_number)
        df_sorted = df[df["_valor"] > 0].sort_values("_valor", ascending=False).reset_index(drop=True)
        df_sorted.index += 1

        # Salva arquivos
        df_sorted.to_csv("gastos_divinolandia_2026_completo.csv", index=True, index_label="Rank", encoding="utf-8-sig")
        df_sorted.head(50).to_csv("gastos_divinolandia_2026_top50.csv", index=True, index_label="Rank", encoding="utf-8-sig")

        # Exibe resultado
        print("\n" + "=" * 72)
        print("TOP 30 MAIORES GASTOS - DIVINOLÂNDIA 2026 (Valor Empenhado)")
        print("=" * 72)

        show_cols = [c for c in ["Nome", "CNPJ/CPF", "Valor Empenhado", "Valor Pago"] if c in df_sorted.columns]

        pd.set_option("display.max_colwidth", 45)
        pd.set_option("display.width", 160)
        print(df_sorted[show_cols].head(30).to_string())

        total = df_sorted["_valor"].sum()
        print(f"\nTotal empenhado (todos credores): R$ {total:,.2f}".replace(",","X").replace(".",",").replace("X","."))
        print(f"\nArquivos gerados:")
        print(f"  gastos_divinolandia_2026_top50.csv ({min(50, len(df_sorted))} credores)")
        print(f"  gastos_divinolandia_2026_completo.csv ({len(df_sorted)} credores)")
    else:
        df.to_csv("gastos_divinolandia_2026_todos.csv", index=False, encoding="utf-8-sig")
        print("Dados salvos sem ordenação.")

if __name__ == "__main__":
    main()
