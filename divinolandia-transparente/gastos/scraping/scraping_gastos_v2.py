import requests
from bs4 import BeautifulSoup
import pandas as pd
import re

BASE_URL = "https://webapp1-divinolandia.cidade360.cloud/pronimtb"

session = requests.Session()
session.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Referer": BASE_URL + "/index.asp",
    "Content-Type": "application/x-www-form-urlencoded",
})

# Campos hidden base que o portal exige
BASE_FIELDS = {
    "anlLicenca": "09001027852",
    "anlSistema": "TB",
    "anlCliente": "webapp1-divinolandia.cidade360.cloud",
    "anlOpcao": "SU_INF_0004",
    "anlLogin": "govbr",
    "anlDescr": "",
    "hndvisao": "0",
    "hndTipoEsportacaoDados": "",
    "ckEmpenhoOrcamentario": "1",
    "ckEmpenhoExtra": "4",
    "ckEmpenhoResto": "2",
}

def get_page(acao, item, extra_fields=None):
    """Carrega uma página do portal via GET."""
    url = f"{BASE_URL}/index.asp?acao={acao}&item={item}"
    r = session.get(url, timeout=30)
    return r.text

def post_page(acao, item, extra_fields=None):
    """Faz POST no portal com os campos corretos."""
    data = dict(BASE_FIELDS)
    data["hndAcao"] = str(acao)
    data["hndItem"] = str(item)
    if extra_fields:
        data.update(extra_fields)
    r = session.post(BASE_URL + "/index.asp", data=data, timeout=30)
    return r.text

def extract_year_options(html):
    """Extrai opções de ano disponíveis no select cmbAno."""
    soup = BeautifulSoup(html, "html.parser")
    years = []
    for sel in soup.find_all("select"):
        if sel.get("name") in ["cmbAno", "cmbExercicio", "cmbAnoGP"]:
            for opt in sel.find_all("option"):
                val = opt.get("value", "").strip()
                if val and val.isdigit():
                    years.append(val)
    return years

def parse_table_data(html):
    """Extrai dados de tabelas relevantes do HTML."""
    soup = BeautifulSoup(html, "html.parser")
    all_data = []

    for table in soup.find_all("table"):
        rows = table.find_all("tr")
        if len(rows) < 2:
            continue

        # Extrai cabeçalhos
        headers = []
        header_row = rows[0]
        for cell in header_row.find_all(["th", "td"]):
            headers.append(cell.get_text(strip=True))

        if not headers or len(headers) < 2:
            continue

        # Verifica se parece uma tabela de dados financeiros
        text_concat = " ".join(headers).lower()
        if not any(x in text_concat for x in ["valor", "descri", "fornec", "credor", "nature", "total", "empenho", "pago"]):
            continue

        # Extrai linhas de dados
        for row in rows[1:]:
            cells = row.find_all(["td", "th"])
            if not cells:
                continue
            values = [c.get_text(strip=True) for c in cells]
            if len(values) >= 2 and any(v for v in values):
                row_dict = {}
                for i, val in enumerate(values):
                    key = headers[i] if i < len(headers) else f"col_{i}"
                    row_dict[key] = val
                all_data.append(row_dict)

    return all_data

def to_number(s):
    """Converte string de valor monetário para float."""
    if not s:
        return 0.0
    s = str(s).strip()
    s = re.sub(r'[R$\s]', '', s)
    s = s.replace('.', '').replace(',', '.')
    try:
        return float(s)
    except:
        return 0.0

def scrape_credores_2026():
    """Busca gastos por credor em 2026 (acao=3, item=10)."""
    print("\n[CREDORES] Carregando página...")
    html = get_page(3, 10)

    years = extract_year_options(html)
    print(f"  Anos disponíveis no select: {years}")

    # POST com ano 2026
    print("  Filtrando por 2026...")
    html2 = post_page(3, 10, {
        "hndAno": "2026",
        "cmbAno": "2026",
        "hndExercicio": "2026",
        "cmbExercicio": "2026",
    })

    data = parse_table_data(html2)
    print(f"  Registros encontrados: {len(data)}")

    # Salva HTML para debug
    with open("debug_credores.html", "w", encoding="utf-8") as f:
        f.write(html2)

    return data

def scrape_natureza_2026():
    """Busca gastos por natureza em 2026 (acao=3, item=2)."""
    print("\n[NATUREZA DESPESA] Carregando página...")
    html = get_page(3, 2)

    years = extract_year_options(html)
    print(f"  Anos disponíveis no select: {years}")

    print("  Filtrando por 2026...")
    html2 = post_page(3, 2, {
        "hndAno": "2026",
        "cmbAno": "2026",
        "hndExercicio": "2026",
        "cmbExercicio": "2026",
    })

    data = parse_table_data(html2)
    print(f"  Registros encontrados: {len(data)}")

    with open("debug_natureza.html", "w", encoding="utf-8") as f:
        f.write(html2)

    return data

def scrape_acao_governo_2026():
    """Busca gastos por ação de governo em 2026 (acao=3, item=1)."""
    print("\n[AÇÃO DE GOVERNO] Carregando página...")
    html = get_page(3, 1)
    years = extract_year_options(html)
    print(f"  Anos disponíveis: {years}")

    html2 = post_page(3, 1, {
        "hndAno": "2026",
        "cmbAno": "2026",
    })

    data = parse_table_data(html2)
    print(f"  Registros encontrados: {len(data)}")

    with open("debug_acao_governo.html", "w", encoding="utf-8") as f:
        f.write(html2)

    return data

def scrape_export_empenhos_2026():
    """Tenta exportar CSV de empenhos de 2026 (acao=10, item=6)."""
    print("\n[EXPORT EMPENHOS] Tentando exportar CSV...")
    html = get_page(10, 6)
    years = extract_year_options(html)
    print(f"  Anos disponíveis: {years}")

    # Tenta exportar como CSV
    data_csv = dict(BASE_FIELDS)
    data_csv.update({
        "hndAcao": "10",
        "hndItem": "6",
        "hndAno": "2026",
        "cmbAno": "2026",
        "hndTipoEsportacaoDados": "6",  # empenhos
        "cmbTipoEsportacaoDados": "6",
        "exportarCSV": "Exportar CSV",
    })

    r = session.post(BASE_URL + "/index.asp", data=data_csv, timeout=60)
    content_type = r.headers.get("Content-Type", "")
    print(f"  Content-Type: {content_type}")

    if "csv" in content_type.lower() or "text/plain" in content_type.lower():
        with open("empenhos_2026.csv", "wb") as f:
            f.write(r.content)
        print("  CSV salvo em empenhos_2026.csv")
        return True
    else:
        with open("debug_export.html", "w", encoding="utf-8") as f:
            f.write(r.text)
        print("  Não retornou CSV. HTML salvo em debug_export.html")
        return False

def build_top50(all_datasets):
    """Consolida todos os dados e retorna o top 50 por valor."""
    consolidated = []
    for dataset_name, rows in all_datasets.items():
        for row in rows:
            row["_fonte"] = dataset_name
            consolidated.append(row)

    if not consolidated:
        return None

    df = pd.DataFrame(consolidated)

    # Detecta coluna de valor
    value_col = None
    for col in df.columns:
        col_lower = col.lower()
        if any(x in col_lower for x in ["empenhado", "pago", "liquidado", "total", "valor"]):
            sample = df[col].dropna().head(5).tolist()
            if any(re.search(r'\d', str(s)) for s in sample):
                value_col = col
                break

    print(f"\nColuna de valor detectada: {value_col}")
    print(f"Colunas disponíveis: {df.columns.tolist()}")

    if value_col:
        df["_valor_num"] = df[value_col].apply(to_number)
        df_sorted = df[df["_valor_num"] > 0].sort_values("_valor_num", ascending=False)
        return df_sorted
    else:
        return df

def main():
    print("=" * 60)
    print("SCRAPING - MAIORES GASTOS PREFEITURA DIVINOLÂNDIA 2026")
    print("=" * 60)

    # Tenta exportar CSV primeiro (mais completo)
    csv_ok = scrape_export_empenhos_2026()

    datasets = {}

    if not csv_ok:
        # Fallback: scraping de tabelas
        credores = scrape_credores_2026()
        if credores:
            datasets["Credores"] = credores

        natureza = scrape_natureza_2026()
        if natureza:
            datasets["Natureza_Despesa"] = natureza

        acao = scrape_acao_governo_2026()
        if acao:
            datasets["Acao_Governo"] = acao

    if datasets:
        df = build_top50(datasets)
        if df is not None and len(df) > 0:
            output_file = "gastos_divinolandia_2026_top50.csv"
            df.head(50).to_csv(output_file, index=False, encoding="utf-8-sig")
            print(f"\n✓ Top 50 maiores gastos salvo em: {output_file}")
            print("\n=== TOP 20 MAIORES GASTOS ===")
            cols_show = [c for c in df.columns if not c.startswith("_")][:4]
            if "_valor_num" in df.columns:
                cols_show.append("_valor_num")
            print(df[cols_show].head(20).to_string(index=False))
        else:
            print("\nNenhum dado com valores monetários identificado.")
            print("Verifique os arquivos debug_*.html para inspecionar as respostas.")
    elif not csv_ok:
        print("\nNenhum dado retornado. Verifique os arquivos de debug.")

if __name__ == "__main__":
    main()
