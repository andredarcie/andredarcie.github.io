from playwright.sync_api import sync_playwright
import json, re

BASE_URL = "https://webapp1-divinolandia.cidade360.cloud/pronimtb"

def try_submit_and_capture(page, url, name):
    """Carrega página, seleciona 2026, submete e captura dados."""
    print(f"\n{'='*50}")
    print(f"Seção: {name}")

    page.goto(url)
    page.wait_for_timeout(3000)

    # Seleciona ano
    options = page.eval_on_selector("#cmbAno", "el => Array.from(el.options).map(o => ({value: o.value, text: o.text}))")
    year_opt = next((o for o in options if o["text"] == "2026"), None)
    if not year_opt:
        print("Ano 2026 não encontrado")
        return ""

    page.select_option("#cmbAno", value=year_opt["value"])
    page.wait_for_timeout(2000)

    # Preenche datas: 01/01/2026 a 21/05/2026 (data atual)
    try:
        page.fill("#txtDataInicial", "01/01/2026")
        page.fill("#txtDataFinal", "21/05/2026")
    except:
        pass

    # Submete o formulário de todas as formas possíveis
    submitted = False

    # Método 1: clica no botão confirma via JS
    try:
        page.evaluate("""
            var btn = document.getElementById('confirma');
            if (btn) {
                btn.style.display = 'block';
                btn.click();
            }
        """)
        try:
            page.wait_for_load_state("networkidle", timeout=10000)
        except:
            page.wait_for_timeout(5000)
        submitted = True
        print("Submetido via #confirma JS click")
    except Exception as e:
        print(f"Método 1 falhou: {e}")

    # Verifica se há dados
    try:
        html = page.content()
    except:
        page.wait_for_timeout(3000)
        html = page.content()
    money_pattern = re.compile(r'\d{1,3}(?:\.\d{3})*,\d{2}')
    money = money_pattern.findall(html)

    if not money:
        # Método 2: submit do form
        try:
            page.evaluate("document.getElementById('frmFormulario').submit()")
            page.wait_for_load_state("networkidle", timeout=15000)
            html = page.content()
            money = money_pattern.findall(html)
            print("Submetido via form.submit()")
        except Exception as e:
            print(f"Método 2 falhou: {e}")

    if not money:
        # Método 3: tenta com botão de consulta visível
        try:
            page.evaluate("""
                var inputs = document.querySelectorAll('input[type=submit]');
                for (var i = 0; i < inputs.length; i++) {
                    inputs[i].style.display = 'block';
                    inputs[i].style.visibility = 'visible';
                }
            """)
            # Tenta clicar em qualquer botão submit
            for selector in ["input[name=confirma]", "input[value='Consultar']", "input[value='Pesquisar']"]:
                try:
                    page.click(selector, timeout=3000)
                    page.wait_for_timeout(3000)
                    html = page.content()
                    money = money_pattern.findall(html)
                    if money:
                        print(f"Submetido via {selector}")
                        break
                except:
                    pass
        except Exception as e:
            print(f"Método 3 falhou: {e}")

    print(f"Valores monetários encontrados: {len(money)}")
    if money:
        print(f"Exemplos: {money[:5]}")

    return html

def extract_financial_table(html):
    """Extrai tabela com dados financeiros."""
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html, "html.parser")

    money_pattern = re.compile(r'\d{1,3}(?:\.\d{3})*,\d{2}')
    results = []

    for table in soup.find_all("table"):
        text = table.get_text()
        if not money_pattern.search(text):
            continue

        rows = table.find_all("tr")
        if len(rows) < 2:
            continue

        # Pega cabeçalhos
        headers = []
        for cell in rows[0].find_all(["th", "td"]):
            h = cell.get_text(strip=True)
            if h:
                headers.append(h)

        if not headers:
            continue

        print(f"Tabela com valores: headers={headers[:5]}")

        for row in rows[1:]:
            cells = row.find_all(["td"])
            if not cells:
                continue
            vals = [c.get_text(strip=True) for c in cells]
            if any(money_pattern.search(v) for v in vals):
                row_dict = {}
                for i, v in enumerate(vals):
                    key = headers[i] if i < len(headers) else f"col_{i}"
                    row_dict[key] = v
                results.append(row_dict)

    return results

def main():
    import pandas as pd

    print("=" * 60)
    print("EXTRAÇÃO DE DADOS - PREFEITURA DIVINOLÂNDIA 2026")
    print("=" * 60)

    sections = [
        (f"{BASE_URL}/index.asp?acao=3&item=10", "Credores"),
        (f"{BASE_URL}/index.asp?acao=3&item=2", "Natureza_Despesa"),
        (f"{BASE_URL}/index.asp?acao=3&item=1", "Acao_Governo"),
        (f"{BASE_URL}/index.asp?acao=3&item=4", "Classificacao_Institucional"),
    ]

    all_data = {}

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 1024})
        page = context.new_page()

        page.goto(BASE_URL + "/index.asp")
        page.wait_for_timeout(2000)

        for url, name in sections:
            html = try_submit_and_capture(page, url, name)
            if html:
                with open(f"debug_{name}.html", "w", encoding="utf-8") as f:
                    f.write(html)

                rows = extract_financial_table(html)
                print(f"Linhas com valores: {len(rows)}")
                if rows:
                    all_data[name] = rows

        browser.close()

    if not all_data:
        print("\nNenhum dado financeiro extraído via submissão de formulário.")
        print("O portal pode precisar de interação adicional.")
        return

    # Processa dados
    def to_num(s):
        if not s:
            return 0.0
        s = str(s).replace("R$","").replace(" ","").replace(".","").replace(",",".")
        try: return float(s)
        except: return 0.0

    all_rows = []
    for section, rows in all_data.items():
        for row in rows:
            row["_fonte"] = section
            all_rows.append(row)

    df = pd.DataFrame(all_rows)
    print(f"\nTotal de registros: {len(df)}")
    print(f"Colunas: {df.columns.tolist()}")

    # Detecta coluna de valor
    value_col = None
    for col in df.columns:
        if col.startswith("_"): continue
        nums = df[col].apply(lambda x: to_num(str(x)))
        if nums.max() > 10000:
            value_col = col
            break

    print(f"Coluna de valor: {value_col}")

    if value_col:
        df["_valor"] = df[value_col].apply(to_num)
        df_sorted = df[df["_valor"] > 0].sort_values("_valor", ascending=False)
        df_sorted.head(50).to_csv("gastos_divinolandia_2026_top50.csv", index=False, encoding="utf-8-sig")

        print("\n=== TOP 20 MAIORES GASTOS 2026 ===")
        show_cols = [c for c in df_sorted.columns if not c.startswith("_")][:3] + ["_valor"]
        print(df_sorted[show_cols].head(20).to_string(index=False))
        print("\nTop 50 salvo em: gastos_divinolandia_2026_top50.csv")
    else:
        df.to_csv("gastos_divinolandia_2026_todos.csv", index=False, encoding="utf-8-sig")

if __name__ == "__main__":
    main()
