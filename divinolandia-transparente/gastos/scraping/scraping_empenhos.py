"""
Scraper de Empenhos - Prefeitura de Divinolândia/SP
Portal: https://webapp1-divinolandia.cidade360.cloud/pronimtb

Fontes:
  - geraxml.asp?item=6  → empenhos.zip  → Adiantamentos de Viagens 2026
  - geraxml.asp?item=7  → RestosPagar.zip → Empenhos 2025 pendentes de pagamento

Mecanismo:
  - O portal gera um ZIP via geraxml.asp após a sessão ser inicializada
  - Usamos Playwright para disparar downloadXML('6') e interceptar o link
  - Após obter o link, baixamos os ZIPs com a sessão ativa
"""

from playwright.sync_api import sync_playwright
import xml.etree.ElementTree as ET
import requests, zipfile, io, pandas as pd, json, os, re

BASE_URL   = "https://webapp1-divinolandia.cidade360.cloud/pronimtb"
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
DEBUG_DIR  = os.path.join(os.path.dirname(__file__), "..", "debug")

DATA_INICIO = "01/01/2026"
DATA_FIM    = "21/05/2026"

# ── helpers ───────────────────────────────────────────────────────────────────

def to_yyyymmdd(s):
    d, m, y = s.split("/")
    return y + m + d

MONEY_RE = re.compile(r"R\$\s*-?\s*[\d.,]+")

def parse_brl(s):
    if not s:
        return 0.0
    s = re.sub(r"R\$|-|\s", "", s)
    s = s.replace(".", "").replace(",", ".")
    try:
        return abs(float(s))
    except:
        return 0.0

def mascara_cpf(doc):
    """CPF de pessoa física (11 dígitos) só com os 6 do meio, como no Portal da Transparência federal."""
    digitos = re.sub(r"\D", "", str(doc))
    if len(digitos) != 11:
        return doc
    return f"***.{digitos[3:6]}.{digitos[6:9]}-**"

def fmt_br(n):
    return f"R$ {n:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

def save_debug(content, name):
    os.makedirs(DEBUG_DIR, exist_ok=True)
    path = os.path.join(DEBUG_DIR, name)
    mode = "wb" if isinstance(content, bytes) else "w"
    kw = {} if isinstance(content, bytes) else {"encoding": "utf-8"}
    with open(path, mode, **kw) as f:
        f.write(content)

CATEGORIAS = {
    "Veículo / Maquinário": [
        "trator", "veículo", "veiculo", "caminhão", "caminhao", "ônibus",
        "onibus", "motocicleta", "carro", "retroescavadeira", "equipamento",
        "máquina", "maquina", "guincho", "carreta", "reboque",
    ],
    "Saúde / Medicamentos": [
        "medicamento", "remédio", "remedio", "farmácia", "farmacia", "insumo",
        "material hospitalar", "vacina", "exame", "cirurgia", "ubs",
        "ambulância", "ambulancia", "hospital", "saúde", "saude",
    ],
    "Alimentação / Merenda": [
        "merenda", "alimentação", "alimentacao", "gênero alimentício",
        "alimento", "refeição", "refeicao", "lanche", "restaurante",
        "vale alimentação", "vale refeição", "verocheque", "ticket",
        "cestas", "cesta básica", "cesta basica",
    ],
    "Obras / Construção": [
        "obra", "construção", "construcao", "reforma", "pavimentação",
        "pavimentacao", "asfalto", "calçada", "calcada", "muro", "telhado",
        "drenagem", "recapeamento", "ponte", "galeria", "lazer",
    ],
    "Combustível / Manutenção": [
        "combustível", "combustivel", "diesel", "gasolina", "etanol",
        "lubrificante", "manutenção", "manutencao", "reparo", "peça",
        "peca", "pneu", "mecânica", "borracha",
    ],
    "Folha de Pagamento": [
        "folha de pag", "folha pag", "salário", "salario", "décimo",
        "decimo", "rescisão", "rescisao", "acerto de exercicio",
        "acerto de exercício",
    ],
    "Previdência / RPPS": [
        "previd", "rpps", "inss", "parcelamento", "confissão", "confissao",
        "acordo", "parcel",
    ],
    "Serviços Terceirizados": [
        "serviço", "servico", "limpeza", "coleta", "resíduo", "residuo",
        "destinação", "destinacao", "terceiriz", "portaria", "vigilância",
        "vigilancia", "jardinagem",
    ],
    "Tecnologia / Sistemas": [
        "software", "sistema", "tecnologia", "arrecadação", "arrecadacao",
        "gestão", "gestao", "iptu", "iss", "licença", "licenca",
        "informática", "informatica",
    ],
    "Educação": [
        "livro", "material escolar", "didático", "didatico", "educação",
        "educacao", "escola", "creche", "capacitação", "capacitacao",
        "treinamento", "curso",
    ],
    "Eventos / Cultura": [
        "evento", "show", "festa", "banda", "artístico", "artistico",
        "cultura", "esporte", "campeonato", "torneio", "hospedagem",
    ],
    "Repasse / Convênio": [
        "repasse", "convênio", "convenio", "termo de fomento",
        "transferência", "transferencia", "subvenção", "subvencao",
    ],
    "Diárias / Viagens": [
        "adiantamento", "diária", "diaria", "viagem", "passagem",
        "hospedagem", "combustível para viagem",
    ],
}

def classificar(descricao, credor=""):
    texto = (descricao + " " + credor).lower()
    for cat, kws in CATEGORIAS.items():
        if any(k in texto for k in kws):
            return cat
    return "Outros"

# ── parse XML dos ZIPs ────────────────────────────────────────────────────────

def parse_xml_file(xml_bytes, fonte):
    """Parse XML retornado pelo portal. Retorna lista de dicts."""
    # ET respeita a declaração de encoding (ISO-8859-1)
    try:
        root = ET.fromstring(xml_bytes)
    except ET.ParseError as e:
        print(f"  XML parse error ({fonte}): {e}")
        return []

    records = []
    for p in root.findall(".//Principal"):
        def g(tag):
            el = p.find(tag)
            return (el.text or "").strip() if el is not None else ""

        # Primeiro item de Itens como descrição/histórico
        desc = ""
        for item_el in p.findall(".//Itens/Item"):
            t = item_el.find("Item")
            if t is not None and t.text and t.text.strip():
                desc = t.text.strip()
                break

        records.append({
            "fonte":      fonte,
            "numero":     g("NumeroEmpenho"),
            "data":       g("DataEmissaoEmpenho"),
            "categoria":  g("CategoriaEmpenho"),
            "credor":     g("Credor"),
            "cpfcnpj":    mascara_cpf(g("CPFCNPJ")),
            "valor_emp":  parse_brl(g("ValorEmpenhado")),
            "valor_pago": parse_brl(g("ValorPago")),
            "descricao":  desc,
            "secretaria": g("Unidade") or g("Departamento") or g("Orgao"),
            "natureza":   g("CategoriaEconomica/Descricao") or g("ElementoDespesa/Descricao"),
        })
    return records

# ── obtém cookies válidos via Playwright e baixa os ZIPs ─────────────────────

def get_session_cookies():
    """Abre o portal e devolve cookies válidos."""
    cookies_out = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox"])
        ctx = browser.new_context(
            viewport={"width": 1280, "height": 1024},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        )
        page = ctx.new_page()
        page.goto(BASE_URL + "/index.asp?acao=10&item=6",
                  wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(3000)
        for c in ctx.cookies():
            cookies_out[c["name"]] = c["value"]
        browser.close()
    return cookies_out

def download_zip(session, zip_path):
    """Baixa um ZIP do portal usando a sessão ativa."""
    url = BASE_URL + "/" + zip_path
    r = session.get(url, timeout=90)
    if r.status_code != 200 or len(r.content) < 100:
        print(f"  Falha ao baixar {zip_path}: status={r.status_code} size={len(r.content)}")
        return None
    return r.content

def call_geraxml(session, item, d_ini, d_fim, banco="DW_LC131_FC_13"):
    """Chama geraxml.asp e retorna o caminho do ZIP."""
    params = {
        "item": str(item),
        "banco": banco,
        "exercicio": "2026",
        "dataInicial": d_ini,
        "dataFinal": d_fim,
        "unidadeGestora": "-1",
        "nmFornecedor": "",
    }
    r = session.get(BASE_URL + "/geraxml.asp", params=params, timeout=90)
    err = r.headers.get("ERRO", "")
    if err:
        print(f"  ERRO item={item}: {err}")
        return None
    text = r.content.decode("utf-8", errors="replace")
    m = re.search(r"href='([^']+)'", text)
    return m.group(1) if m else None

# ── main ──────────────────────────────────────────────────────────────────────

def main():
    print("=" * 65)
    print("EMPENHOS - PREFEITURA DE DIVINOLÂNDIA/SP")
    print(f"Período: {DATA_INICIO} a {DATA_FIM}")
    print("=" * 65)

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    d_ini = to_yyyymmdd(DATA_INICIO)
    d_fim = to_yyyymmdd(DATA_FIM)

    print("\n[1/3] Obtendo cookies de sessão via Playwright...")
    cookies = get_session_cookies()
    print(f"  Cookies: {list(cookies.keys())}")

    session = requests.Session()
    session.headers.update({
        "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer":         BASE_URL + "/index.asp",
        "Accept-Language": "pt-BR,pt;q=0.9",
    })
    for k, v in cookies.items():
        session.cookies.set(k, v)

    all_records = []

    # ── item=6: empenhos de adiantamento ──────────────────────────────────────
    print("\n[2/3] Baixando empenhos (item=6 — Adiantamentos)...")
    zip_path = call_geraxml(session, 6, d_ini, d_fim)
    if zip_path:
        zip_bytes = download_zip(session, zip_path)
        if zip_bytes:
            save_debug(zip_bytes, "empenhos_adiantamentos.zip")
            zf = zipfile.ZipFile(io.BytesIO(zip_bytes))
            for name in zf.namelist():
                recs = parse_xml_file(zf.read(name), "Adiantamentos 2026")
                print(f"  {name}: {len(recs)} registros")
                all_records.extend(recs)

    # ── item=7: restos a pagar (empenhos 2025 pendentes) ─────────────────────
    print("\n[3/3] Baixando Restos a Pagar (item=7 — Empenhos 2025 pendentes)...")
    zip_path7 = call_geraxml(session, 7, d_ini, d_fim)
    if zip_path7:
        zip_bytes7 = download_zip(session, zip_path7)
        if zip_bytes7:
            save_debug(zip_bytes7, "empenhos_restospagar.zip")
            zf7 = zipfile.ZipFile(io.BytesIO(zip_bytes7))
            for name in zf7.namelist():
                recs = parse_xml_file(zf7.read(name), "Restos a Pagar 2025→2026")
                print(f"  {name}: {len(recs)} registros")
                all_records.extend(recs)

    print(f"\nTotal bruto: {len(all_records)} registros")

    if not all_records:
        print("Nenhum dado. Verifique a sessão e os arquivos debug/")
        return

    df = pd.DataFrame(all_records)

    # Classifica
    df["tipo_despesa"] = df.apply(
        lambda r: classificar(r["descricao"], r["credor"]), axis=1
    )

    # Ordena por valor empenhado
    df = df[df["valor_emp"] > 0].copy()
    df = df.sort_values("valor_emp", ascending=False).reset_index(drop=True)
    df.index += 1

    # CSV completo
    csv_path = os.path.join(OUTPUT_DIR, "empenhos_2026.csv")
    df.to_csv(csv_path, index=True, index_label="Rank", encoding="utf-8-sig")
    print(f"CSV salvo: {csv_path}  ({len(df)} registros)")
    print(f"Valor total empenhado: {fmt_br(df['valor_emp'].sum())}")

    # TOP 20 console
    pd.set_option("display.max_colwidth", 55)
    pd.set_option("display.width", 220)
    show = ["data", "credor", "descricao", "valor_emp"]
    print("\n=== TOP 20 MAIORES EMPENHOS ===")
    print(df[show].head(20).to_string())

    # JSON top 50 para o site
    records_json = []
    for rank, (_, row) in enumerate(df.head(50).iterrows(), 1):
        credor = str(row.get("credor", "")).strip()
        desc   = str(row.get("descricao", "")).strip()
        # Filtra entradas sem descrição útil
        if not desc or desc in ("-", " "):
            desc = credor

        records_json.append({
            "rank":       rank,
            "fonte":      str(row.get("fonte", "")),
            "data":       str(row.get("data", "")),
            "numero":     str(row.get("numero", "")),
            "credor":     credor,
            "cpfcnpj":    str(row.get("cpfcnpj", "")),
            "valor":      round(float(row["valor_emp"]), 2),
            "valor_pago": round(float(row.get("valor_pago", 0) or 0), 2),
            "descricao":  desc,
            "secretaria": str(row.get("secretaria", "")),
            "natureza":   str(row.get("natureza", "")),
            "categoria":  str(row.get("tipo_despesa", "Outros")),
        })

    json_path = os.path.join(OUTPUT_DIR, "empenhos_top50.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(records_json, f, ensure_ascii=False, indent=2)
    print(f"\nJSON gerado: {json_path}  ({len(records_json)} registros)")
    print("Próximo passo: adicionar seção 'Maiores Compras' no index.html")

if __name__ == "__main__":
    main()
