"""
Scraper de Salários por Colaborador - Prefeitura de Divinolândia/SP
Portal: https://webapp1-divinolandia.cidade360.cloud/pronimtb
URL:    index.asp?acao=4&item=5

Os campos do formulário GP são hidden por CSS (a página usa um sistema
de abas). Por isso usamos page.evaluate() para definir valores via JS
diretamente, sem precisar que os elementos estejam visíveis.
"""

from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
import pandas as pd
import re
import json
import os

BASE_URL   = "https://webapp1-divinolandia.cidade360.cloud/pronimtb"
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
DEBUG_DIR  = os.path.join(os.path.dirname(__file__), "..", "debug")

# ── helpers ───────────────────────────────────────────────────────────────────

def to_number(s):
    if not s:
        return 0.0
    s = str(s).replace("R$", "").replace("\xa0", "").replace(" ", "")
    s = s.replace(".", "").replace(",", ".")
    try:
        return float(s)
    except:
        return 0.0

def fmt_br(n):
    return f"R$ {n:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

def save_debug(html, name):
    os.makedirs(DEBUG_DIR, exist_ok=True)
    path = os.path.join(DEBUG_DIR, name)
    with open(path, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"  [debug] salvo: {os.path.basename(path)}")

# ── extração de tabela ────────────────────────────────────────────────────────

def extract_salary_table(html):
    """Extrai servidores da tabela de salários. Retorna (headers, rows)."""
    soup = BeautifulSoup(html, "html.parser")
    money = re.compile(r"\d{1,3}(?:\.\d{3})*,\d{2}")

    for table in soup.find_all("table"):
        text = table.get_text()
        keywords = ["bruto", "líquido", "liquido", "vencimento", "salário", "salario",
                    "remuner", "desconto", "deduç", "servidor", "matrícula", "matricula",
                    "colaborador", "funcionário", "funcionario"]
        if not any(k in text.lower() for k in keywords):
            continue
        if not money.search(text):
            continue

        rows = table.find_all("tr")
        if len(rows) < 3:
            continue

        # Detecta linha de cabeçalho
        headers = []
        header_idx = 0
        for i, row in enumerate(rows[:6]):
            cells = [c.get_text(strip=True) for c in row.find_all(["th", "td"])]
            joined = " ".join(cells).lower()
            if any(k in joined for k in ["bruto", "líquido", "liquido", "vencimento",
                                          "nome", "servidor", "cargo", "matrícula"]):
                headers = cells
                header_idx = i
                break

        if not headers:
            continue

        print(f"  Cabeçalhos: {headers[:8]}")

        data_rows = []
        for row in rows[header_idx + 1:]:
            cells = [c.get_text(strip=True) for c in row.find_all("td")]
            if len(cells) < 2:
                continue
            joined = " ".join(cells[:3]).lower()
            if any(x in joined for x in ["total", "média", "media", "subtotal"]):
                continue
            if not any(money.search(c) for c in cells):
                continue

            row_dict = {}
            for i, val in enumerate(cells):
                key = headers[i] if i < len(headers) else f"col_{i}"
                row_dict[key] = val
            data_rows.append(row_dict)

        if data_rows:
            return headers, data_rows

    return [], []

def get_max_page(html):
    soup = BeautifulSoup(html, "html.parser")
    max_pg = 1
    for a in soup.find_all("a", href=True):
        m = re.search(r"numpag=(\d+)", a["href"])
        if m:
            max_pg = max(max_pg, int(m.group(1)))
    return max_pg

def navigate_page(page, pg, current_html):
    soup = BeautifulSoup(current_html, "html.parser")
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if f"numpag={pg}" not in href:
            continue
        if href.startswith("/"):
            url = f"https://webapp1-divinolandia.cidade360.cloud{href}"
        elif href.startswith("javascript:"):
            m = re.search(r"location\.href='([^']+)'", href)
            url = f"https://webapp1-divinolandia.cidade360.cloud{m.group(1)}" if m else None
        else:
            url = href
        if url:
            try:
                page.goto(url, wait_until="domcontentloaded", timeout=20000)
                page.wait_for_timeout(3000)
                return True
            except Exception as e:
                print(f"  Erro pág {pg}: {e}")
    return False

# ── leitura das opções via JS (ignora visibilidade) ───────────────────────────

def get_select_options(page, select_id):
    return page.evaluate(f"""() => {{
        const sel = document.getElementById('{select_id}');
        if (!sel) return [];
        return Array.from(sel.options).map(o => ({{value: o.value, text: o.text.trim()}}));
    }}""")

def set_select_value(page, select_id, value):
    """Define valor de um select hidden via JS e dispara o evento change."""
    page.evaluate(f"""() => {{
        const sel = document.getElementById('{select_id}');
        if (!sel) return;
        sel.value = '{value}';
        sel.dispatchEvent(new Event('change', {{bubbles: true}}));
    }}""")

# ── scraping principal ────────────────────────────────────────────────────────

def scrape_salarios(page):
    print("\n[SALÁRIOS POR COLABORADOR — acao=4&item=5]")
    page.goto(f"{BASE_URL}/index.asp?acao=4&item=5")
    page.wait_for_timeout(4000)
    save_debug(page.content(), "debug_salarios_form.html")

    # --- Lê opções dos campos GP (todos hidden, por isso usamos evaluate) ---
    unidade_opts = get_select_options(page, "cmbUnidadeGP")
    vinculo_opts  = get_select_options(page, "cmbVinculoGP")
    ano_opts      = get_select_options(page, "cmbAnoGP")
    mes_ini_opts  = get_select_options(page, "cmbMesInicialGP")
    mes_fim_opts  = get_select_options(page, "cmbMesFinalGP")

    print(f"  Unidades GP:  {[o['text'] for o in unidade_opts[:5]]}")
    print(f"  Vínculos GP:  {[o['text'] for o in vinculo_opts[:5]]}")
    print(f"  Anos GP:      {[o['text'] for o in ano_opts]}")
    print(f"  Meses início: {[o['text'] for o in mes_ini_opts]}")
    print(f"  Meses fim:    {[o['text'] for o in mes_fim_opts]}")

    # Dispara onchange de cmbUnidadeGP para preencher cmbDataGP (se necessário)
    unidade_val = unidade_opts[0]["value"] if unidade_opts else ""
    if unidade_val:
        set_select_value(page, "cmbUnidadeGP", unidade_val)
        page.wait_for_timeout(2000)

    # Seleciona ano 2026 (ou o mais recente disponível)
    ano_opts = get_select_options(page, "cmbAnoGP")  # recarrega após trigger
    ano_val = next((o["value"] for o in ano_opts if "2026" in o["text"]), None)
    if not ano_val:
        valid = [o for o in ano_opts if o["value"] and o["text"] != "SELECIONE"]
        ano_val = valid[0]["value"] if valid else ""
    if ano_val:
        set_select_value(page, "cmbAnoGP", ano_val)
        print(f"  Ano definido: {ano_val}")
        page.wait_for_timeout(1500)

    # Seleciona mês inicial = Janeiro (01) e mês final = Maio (05) ou maior disponível
    valid_meses = [o for o in mes_ini_opts if o["value"] and o["text"] != "SELECIONE"]
    mes_ini_val = next((o["value"] for o in valid_meses if o["text"].upper() in ["JANEIRO", "01"]), None)
    if not mes_ini_val and valid_meses:
        mes_ini_val = valid_meses[0]["value"]
    if mes_ini_val:
        set_select_value(page, "cmbMesInicialGP", mes_ini_val)
        print(f"  Mês inicial:  {mes_ini_val}")

    valid_meses_fim = [o for o in mes_fim_opts if o["value"] and o["text"] != "SELECIONE"]
    mes_fim_val = next((o["value"] for o in valid_meses_fim if o["text"].upper() in ["MAIO", "05"]), None)
    if not mes_fim_val and valid_meses_fim:
        mes_fim_val = valid_meses_fim[-1]["value"]
    if mes_fim_val:
        set_select_value(page, "cmbMesFinalGP", mes_fim_val)
        print(f"  Mês final:    {mes_fim_val}")

    page.wait_for_timeout(1000)

    # Submete o formulário via JS (botão tem visibility:hidden)
    print("  Submetendo formulário...")
    submitted = page.evaluate("""() => {
        const btn = document.getElementById('confirma');
        if (btn) {
            btn.style.visibility = 'visible';
            btn.style.display    = 'block';
            btn.click();
            return true;
        }
        return false;
    }""")
    print(f"  Formulário submetido: {submitted}")

    try:
        page.wait_for_load_state("networkidle", timeout=20000)
    except:
        page.wait_for_timeout(8000)

    try:
        html = page.content()
    except:
        page.wait_for_timeout(4000)
        html = page.content()

    save_debug(html, "debug_salarios_resultado.html")

    n_money = len(re.findall(r"\d{1,3}(?:\.\d{3})*,\d{2}", html))
    print(f"  Valores monetários no HTML: {n_money}")

    n_pages = get_max_page(html)
    print(f"  Total de páginas: {n_pages}")

    headers, rows = extract_salary_table(html)
    print(f"  Página 1: {len(rows)} servidores")

    all_rows = list(rows)
    current_html = html

    for pg in range(2, n_pages + 1):
        print(f"  Página {pg}...")
        ok = navigate_page(page, pg, current_html)
        if not ok:
            print(f"  Não encontrou link para página {pg}")
            break
        try:
            current_html = page.content()
        except:
            page.wait_for_timeout(3000)
            current_html = page.content()
        _, rows_pg = extract_salary_table(current_html)
        print(f"  Página {pg}: {len(rows_pg)} servidores")
        all_rows.extend(rows_pg)

    return headers, all_rows

# ── detecção de colunas ───────────────────────────────────────────────────────

def detect_columns(df):
    cols_lower = {c.lower(): c for c in df.columns}

    def find(keywords):
        for kw in keywords:
            for cl, c in cols_lower.items():
                if kw in cl:
                    return c
        return None

    return {
        "nome":       find(["nome", "servidor", "colaborador", "funcionário", "funcionario"]),
        "cargo":      find(["cargo", "função", "funcao"]),
        "secretaria": find(["secretaria", "lotação", "lotacao", "departamento", "unidade", "orgão", "orgao"]),
        "bruto":      find(["bruto", "vencimento", "total venc", "salário bruto", "salario bruto", "remuner"]),
        "deducoes":   find(["desconto", "deduç", "dedução", "deducao", "total desc"]),
        "liquido":    find(["líquido", "liquido", "a receber", "total a pagar"]),
    }

# ── classificação de área ────────────────────────────────────────────────────

AREA_KEYWORDS = {
    "exec":   ["prefeito", "vice-prefeito", "secretário", "secretario", "gabinete", "chefe de"],
    "saude2": ["saúde", "saude", "médic", "medic", "hospital", "enferm", "farmac", "dentist",
               "odonto", "psicol", "nutrici", "fonoaudio"],
    "edu2":   ["educação", "educacao", "escola", "professor", "pedagog", "ensino", "creche"],
    "eng":    ["obras", "engenharia", "engenheiro", "infra", "urbanismo", "fiscal de obras"],
    "jur":    ["jurídic", "juridic", "procurador", "advogad", "assessor juríd", "assessor jur"],
    "adm":    [],  # fallback
}

def classify_area(cargo, secretaria=""):
    text = (cargo + " " + secretaria).lower()
    for area, kws in AREA_KEYWORDS.items():
        if any(k in text for k in kws):
            return area
    return "adm"

# ── main ──────────────────────────────────────────────────────────────────────

def main():
    print("=" * 65)
    print("SALÁRIOS SERVIDORES - PREFEITURA DE DIVINOLÂNDIA/SP")
    print(f"Fonte: {BASE_URL}/index.asp?acao=4&item=5")
    print("=" * 65)

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 1024})
        page = context.new_page()
        page.goto(BASE_URL + "/index.asp")
        page.wait_for_timeout(2000)

        headers, rows = scrape_salarios(page)
        browser.close()

    print(f"\nTotal coletado: {len(rows)} servidores")

    if not rows:
        print("Nenhum dado. Verifique debug/debug_salarios_resultado.html")
        return

    df = pd.DataFrame(rows)
    print(f"Colunas: {df.columns.tolist()}")

    col_map = detect_columns(df)
    print(f"Mapeamento: {col_map}")

    bruto_col = col_map.get("bruto")
    dedu_col  = col_map.get("deducoes")
    liq_col   = col_map.get("liquido")
    nome_col  = col_map.get("nome") or df.columns[0]
    cargo_col = col_map.get("cargo", "")
    sec_col   = col_map.get("secretaria", "")

    if not bruto_col:
        # Fallback: coluna com maior soma numérica
        best_col, best_sum = None, 0
        for col in df.columns:
            s = df[col].apply(to_number).sum()
            if s > best_sum:
                best_sum, best_col = s, col
        bruto_col = best_col

    df["_bruto"]    = df[bruto_col].apply(to_number) if bruto_col else 0.0
    df["_deducoes"] = df[dedu_col].apply(to_number)  if dedu_col  else 0.0
    df["_liquido"]  = df[liq_col].apply(to_number)   if liq_col   else df["_bruto"] - df["_deducoes"]

    df = df[df["_bruto"] > 0].copy()
    df_sorted = df.sort_values("_bruto", ascending=False).reset_index(drop=True)
    df_sorted.index += 1

    # Salva CSV completo
    csv_path = os.path.join(OUTPUT_DIR, "salarios_divinolandia.csv")
    df_sorted.to_csv(csv_path, index=True, index_label="Rank", encoding="utf-8-sig")
    print(f"CSV salvo: {csv_path}  ({len(df_sorted)} servidores)")

    # Top 20
    show_cols = [c for c in [nome_col, cargo_col, bruto_col, dedu_col, liq_col]
                 if c and c in df_sorted.columns]
    print("\n" + "=" * 72)
    print("TOP 20 MAIORES SALÁRIOS")
    print("=" * 72)
    pd.set_option("display.max_colwidth", 40)
    pd.set_option("display.width", 160)
    print(df_sorted[show_cols].head(20).to_string())

    total_bruto  = df_sorted["_bruto"].sum()
    media_bruto  = df_sorted["_bruto"].mean()
    print(f"\nTotal servidores: {len(df_sorted)}")
    print(f"Folha bruta total: {fmt_br(total_bruto)}")
    print(f"Média salarial:    {fmt_br(media_bruto)}")

    # Gera JSON top 20 para o site
    top20 = df_sorted.head(20).copy()
    salary_max = float(top20["_bruto"].max())

    records = []
    for rank, (_, row) in enumerate(top20.iterrows(), start=1):
        nome_v  = str(row.get(nome_col, f"Servidor {rank}")).strip()
        cargo_v = str(row.get(cargo_col, "")).strip() if cargo_col else ""
        sec_v   = str(row.get(sec_col, "")).strip()   if sec_col   else ""
        bruto_v = float(row["_bruto"])
        dedu_v  = float(row["_deducoes"])

        records.append({
            "rank":       rank,
            "nome":       nome_v,
            "cargo":      cargo_v or "Servidor",
            "area":       classify_area(cargo_v, sec_v),
            "secretaria": sec_v or "Prefeitura Municipal",
            "bruto":      round(bruto_v, 2),
            "deducoes":   round(dedu_v, 2),
        })

    json_path = os.path.join(OUTPUT_DIR, "salarios_top20.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)
    print(f"\nJSON gerado: {json_path}")
    print("Execute agora: python scraping/atualiza_site_salarios.py")

if __name__ == "__main__":
    main()
