import requests
from bs4 import BeautifulSoup
import pandas as pd
import re
import time

BASE_URL = "https://webapp1-divinolandia.cidade360.cloud/pronimtb"

# Parâmetros extraídos da URL de paginação
ANO = "2026"
MES_INICIAL = "20260101"
MES_FINAL = "20260521"

session = requests.Session()
session.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Referer": BASE_URL + "/index.asp",
})

def to_number(s):
    if not s:
        return 0.0
    s = str(s).replace("R$", "").replace("\xa0", "").replace(" ", "")
    s = s.replace(".", "").replace(",", ".")
    try:
        return float(s)
    except:
        return 0.0

def extract_table_rows(html):
    """Extrai linhas de dados da tabela de credores."""
    soup = BeautifulSoup(html, "html.parser")
    money_pattern = re.compile(r"\d{1,3}(?:\.\d{3})*,\d{2}")

    for table in soup.find_all("table"):
        text = table.get_text()
        if "CNPJ" not in text and "CPF" not in text:
            continue
        if not money_pattern.search(text):
            continue

        rows = table.find_all("tr")
        if len(rows) < 3:
            continue

        # Cabeçalhos estão na linha 1 (índice 1)
        header_row_idx = 0
        for i, row in enumerate(rows[:5]):
            cells = [c.get_text(strip=True) for c in row.find_all(["th","td"])]
            if any(x in cells for x in ["Nome", "CNPJ/CPF", "Valor Empenhado"]):
                header_row_idx = i
                break

        headers = [c.get_text(strip=True) for c in rows[header_row_idx].find_all(["th","td"])]

        data_rows = []
        for row in rows[header_row_idx+1:]:
            cells = [c.get_text(strip=True) for c in row.find_all("td")]
            if not cells or len(cells) < 2:
                continue
            if not any(money_pattern.search(c) for c in cells):
                continue
            # Verifica que não é linha de total
            first_cell = cells[0].lower()
            if "total" in first_cell or first_cell == "":
                continue

            row_dict = {}
            for i, val in enumerate(cells):
                key = headers[i] if i < len(headers) else f"col_{i}"
                row_dict[key] = val
            data_rows.append(row_dict)

        if data_rows:
            return headers, data_rows

    return [], []

def count_pages(html):
    """Conta o número de páginas disponíveis."""
    soup = BeautifulSoup(html, "html.parser")
    max_page = 1
    for a in soup.find_all("a", href=True):
        href = a["href"]
        match = re.search(r"numpag=(\d+)", href)
        if match:
            page_num = int(match.group(1))
            max_page = max(max_page, page_num)
    return max_page

def scrape_all_credores():
    """Busca todos os credores de 2026 iterando por todas as páginas."""
    print("Iniciando scraping de credores 2026...")

    # Primeira requisição: carrega página com cookies de sessão
    url_base = f"{BASE_URL}/index.asp"
    session.get(url_base, timeout=20)

    # URL de consulta com parâmetros completos
    url_template = (
        f"{BASE_URL}/index.asp?acao=3&item=10&visao=1&ano={ANO}"
        f"&mesinicial={MES_INICIAL}&mesfinal={MES_FINAL}"
        f"&unidadegestora=-1&datainicial=-1&datafinal=-1&numpag={{page}}"
    )

    # Carrega página 1
    url_p1 = url_template.format(page=1)
    print(f"Página 1: {url_p1[:80]}...")
    r = session.get(url_p1, timeout=30)
    html_p1 = r.text

    # Conta páginas
    n_pages = count_pages(html_p1)
    print(f"Total de páginas: {n_pages}")

    # Extrai dados da página 1
    headers, rows_p1 = extract_table_rows(html_p1)
    print(f"Página 1: {len(rows_p1)} credores | Cabeçalhos: {headers}")

    all_rows = list(rows_p1)

    # Itera pelas demais páginas
    for page in range(2, n_pages + 1):
        url = url_template.format(page=page)
        print(f"Página {page}/{n_pages}...")
        time.sleep(0.5)  # Rate limiting
        r = session.get(url, timeout=30)
        _, rows = extract_table_rows(r.text)
        print(f"  {len(rows)} credores")
        all_rows.extend(rows)

    print(f"\nTotal de credores coletados: {len(all_rows)}")
    return headers, all_rows

def main():
    print("=" * 60)
    print(f"GASTOS PREFEITURA DIVINOLÂNDIA 2026")
    print(f"Período: 01/01/2026 a 21/05/2026")
    print("=" * 60)

    headers, all_rows = scrape_all_credores()

    if not all_rows:
        print("Nenhum dado coletado!")
        return

    df = pd.DataFrame(all_rows)
    print(f"\nColunas: {df.columns.tolist()}")
    print(f"Total de linhas: {len(df)}")

    # Detecta coluna de valor empenhado
    value_col = "Valor Empenhado" if "Valor Empenhado" in df.columns else None
    if not value_col:
        for col in df.columns:
            if "empenhado" in col.lower() or "valor" in col.lower():
                value_col = col
                break

    if value_col:
        df["_valor"] = df[value_col].apply(to_number)
        df_sorted = df[df["_valor"] > 0].sort_values("_valor", ascending=False).reset_index(drop=True)
        df_sorted.index += 1  # Começa de 1

        # Salva CSV completo
        df_sorted.to_csv("gastos_divinolandia_2026_completo.csv", index=True, index_label="Rank", encoding="utf-8-sig")

        # Salva Top 50
        df_sorted.head(50).to_csv("gastos_divinolandia_2026_top50.csv", index=True, index_label="Rank", encoding="utf-8-sig")

        # Exibe Top 30
        print("\n" + "=" * 70)
        print(f"TOP 30 MAIORES GASTOS POR CREDOR - DIVINOLÂNDIA 2026")
        print(f"(01/01/2026 a 21/05/2026 - Valor Empenhado)")
        print("=" * 70)

        show_cols = ["Nome", "CNPJ/CPF", "Valor Empenhado", "Valor Pago"]
        available_cols = [c for c in show_cols if c in df_sorted.columns]
        available_cols.append("_valor")

        pd.set_option("display.max_colwidth", 45)
        pd.set_option("display.width", 150)
        print(df_sorted[available_cols].head(30).to_string())

        total = df_sorted["_valor"].sum()
        print(f"\nTotal geral empenhado: R$ {total:,.2f}".replace(",","X").replace(".",",").replace("X","."))
        print(f"\nArquivos salvos:")
        print(f"  - gastos_divinolandia_2026_top50.csv (Top 50)")
        print(f"  - gastos_divinolandia_2026_completo.csv (Todos os {len(df_sorted)} credores)")
    else:
        df.to_csv("gastos_divinolandia_2026_todos.csv", index=False, encoding="utf-8-sig")
        print("CSV salvo sem ordenação.")

if __name__ == "__main__":
    main()
