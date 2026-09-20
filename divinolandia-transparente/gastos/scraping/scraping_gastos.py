import requests
from bs4 import BeautifulSoup
import pandas as pd
import json
from datetime import datetime

BASE_URL = "https://webapp1-divinolandia.cidade360.cloud/pronimtb"

session = requests.Session()
session.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Referer": BASE_URL + "/index.asp",
})

def fetch_page(url, params=None, data=None):
    try:
        if data:
            r = session.post(url, data=data, timeout=30)
        else:
            r = session.get(url, params=params, timeout=30)
        r.raise_for_status()
        return r.text
    except Exception as e:
        print(f"Erro ao acessar {url}: {e}")
        return None

def parse_table(html):
    if not html:
        return []
    soup = BeautifulSoup(html, "html.parser")
    rows = []
    for table in soup.find_all("table"):
        headers = [th.get_text(strip=True) for th in table.find_all("th")]
        if not headers:
            headers = [td.get_text(strip=True) for td in table.find("tr").find_all("td")] if table.find("tr") else []
        for tr in table.find_all("tr")[1:]:
            cols = [td.get_text(strip=True) for td in tr.find_all("td")]
            if cols and len(cols) >= 2:
                row = dict(zip(headers, cols)) if headers else {"col_" + str(i): v for i, v in enumerate(cols)}
                rows.append(row)
    return rows

def try_empenhos_2026():
    """Tenta acessar empenhos/despesas de 2026 via diferentes endpoints."""
    endpoints = [
        "/index.asp?acao=despesa&item=2",
        "/index.asp?acao=3&item=2",
        "/index.asp?acao=4&item=2",
        "/index.asp?acao=5&item=2",
        "/empenhos.asp",
        "/despesas.asp",
        "/consulta_empenhos.asp",
    ]
    for ep in endpoints:
        url = BASE_URL + ep
        html = fetch_page(url)
        if html and "Redirecionando" not in html and "404" not in html:
            soup = BeautifulSoup(html, "html.parser")
            forms = soup.find_all("form")
            if forms:
                print(f"Formulário encontrado em: {url}")
                for form in forms:
                    print("  Action:", form.get("action"))
                    for inp in form.find_all(["input", "select"]):
                        print(f"    {inp.name}: name={inp.get('name')} value={inp.get('value')}")
                return url, html
    return None, None

def scrape_fornecedores_2026():
    """Tenta acessar gastos por fornecedor em 2026."""
    url = BASE_URL + "/index.asp"

    # Tenta diferentes combinações de POST
    payloads = [
        {"acao": "1", "item": "2", "ano": "2026"},
        {"acao": "despesa", "ano": "2026", "periodo": "01/01/2026", "periodo_fim": "31/12/2026"},
        {"ano": "2026", "tipo": "empenho"},
        {"cmbAno": "2026", "acao": "pesquisar"},
        {"Ano": "2026", "acao": "1"},
    ]

    for payload in payloads:
        html = fetch_page(url, data=payload)
        if html and len(html) > 1000 and "Redirecionando" not in html:
            rows = parse_table(html)
            if rows:
                print(f"Dados encontrados com payload: {payload}")
                return rows
    return []

def scrape_via_api():
    """Tenta endpoints de API/JSON que alguns portais PRONIM expõem."""
    api_endpoints = [
        "/api/despesas?ano=2026",
        "/api/empenhos?ano=2026",
        "/ws/despesas.asp?ano=2026&formato=json",
        "/pronimtb/consulta.asp?ano=2026&tipo=despesa",
    ]
    for ep in api_endpoints:
        url = "https://webapp1-divinolandia.cidade360.cloud" + ep
        html = fetch_page(url)
        if html and len(html) > 100:
            try:
                data = json.loads(html)
                print(f"API JSON encontrada: {url}")
                return data
            except:
                pass
    return None

def scrape_despesas_natureza_2026():
    """Acessa despesas por natureza/função com filtro 2026."""
    url = BASE_URL + "/index.asp"

    # Faz GET na página principal para capturar o session state
    html_main = fetch_page(url)
    if not html_main:
        return []

    soup = BeautifulSoup(html_main, "html.parser")

    # Procura formulários e campos hidden
    forms = soup.find_all("form")
    print(f"\nFormulários encontrados na página principal: {len(forms)}")

    all_data = []

    # Tenta acessar página de natureza da despesa
    nature_urls = [
        BASE_URL + "/index.asp?acao=natureza&ano=2026",
        BASE_URL + "/index.asp?acao=N&ano=2026",
        BASE_URL + "/natureza.asp?ano=2026",
        BASE_URL + "/index.asp?acao=1&item=natureza&ano=2026",
    ]

    for url in nature_urls:
        html = fetch_page(url)
        if html and "Redirecionando" not in html and len(html) > 500:
            rows = parse_table(html)
            if rows:
                all_data.extend(rows)
                print(f"Dados de natureza encontrados: {url} ({len(rows)} registros)")
                break

    return all_data

def main():
    print("=" * 60)
    print("SCRAPING - GASTOS PREFEITURA DE DIVINOLÂNDIA 2026")
    print("=" * 60)

    # Tenta encontrar formulários e endpoints
    print("\n[1] Explorando endpoints disponíveis...")
    url_found, html_found = try_empenhos_2026()

    print("\n[2] Tentando scraping de fornecedores 2026...")
    rows_forn = scrape_fornecedores_2026()

    print("\n[3] Tentando endpoints de API...")
    api_data = scrape_via_api()

    print("\n[4] Tentando despesas por natureza 2026...")
    rows_nat = scrape_despesas_natureza_2026()

    # Consolida resultados
    all_rows = rows_forn + rows_nat

    if api_data:
        print(f"\nDados de API: {type(api_data)}")
        if isinstance(api_data, list):
            all_rows.extend(api_data)

    if all_rows:
        df = pd.DataFrame(all_rows)
        print(f"\nTotal de registros coletados: {len(df)}")
        print("\nColunas:", df.columns.tolist())
        print("\nAmostra:")
        print(df.head())

        # Tenta identificar coluna de valor
        value_cols = [c for c in df.columns if any(x in c.lower() for x in ["valor", "total", "empenhado", "pago", "liquidado"])]
        if value_cols:
            col_val = value_cols[0]
            df["_valor_num"] = df[col_val].str.replace(".", "").str.replace(",", ".").str.replace("R$", "").str.strip()
            df["_valor_num"] = pd.to_numeric(df["_valor_num"], errors="coerce")
            df_sorted = df.sort_values("_valor_num", ascending=False).head(50)
            df_sorted.to_csv("gastos_divinolandia_2026_top50.csv", index=False, encoding="utf-8-sig")
            print(f"\nTop 50 maiores gastos salvos em: gastos_divinolandia_2026_top50.csv")
        else:
            df.to_csv("gastos_divinolandia_2026_todos.csv", index=False, encoding="utf-8-sig")
            print("\nDados salvos em: gastos_divinolandia_2026_todos.csv")
    else:
        print("\nNenhum dado tabular encontrado via scraping direto.")
        print("O portal usa ASP com sessão e JavaScript, necessitando de acesso interativo.")
        print("\nSugestão: Usar Selenium/Playwright para renderizar o JavaScript.")

        # Salva HTML da página principal para inspeção
        if html_found:
            with open("portal_html_debug.html", "w", encoding="utf-8") as f:
                f.write(html_found)
            print("HTML da página salvo em: portal_html_debug.html")

if __name__ == "__main__":
    main()
