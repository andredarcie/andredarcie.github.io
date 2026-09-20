"""
Scraper de Receitas - Prefeitura de Divinolândia/SP
Portal: https://webapp1-divinolandia.cidade360.cloud/pronimtb

Estratégia:
1. Playwright estabelece sessão
2. geraxml.asp?item=2 retorna link para dll/Lancamento.zip
3. Baixa ZIP, extrai XML com 1983 registros individuais
4. Agrega por TipoReceita e por Mês
"""

from playwright.sync_api import sync_playwright
import json, re, os, zipfile, io
import xml.etree.ElementTree as ET

BASE_URL   = "https://webapp1-divinolandia.cidade360.cloud/pronimtb"
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
DEBUG_DIR  = os.path.join(os.path.dirname(__file__), "..", "debug")
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(DEBUG_DIR,  exist_ok=True)

ANO = "2025"

MES_ORDER = {
    "JANEIRO": 1, "FEVEREIRO": 2, "MARÇO": 3, "MARCO": 3,
    "ABRIL": 4, "MAIO": 5, "JUNHO": 6, "JULHO": 7,
    "AGOSTO": 8, "SETEMBRO": 9, "OUTUBRO": 10,
    "NOVEMBRO": 11, "DEZEMBRO": 12,
}

def parse_brl(s):
    if not s:
        return 0.0
    s = re.sub(r"[R$\s]", "", s).replace(".", "").replace(",", ".")
    try:
        return abs(float(s))
    except:
        return 0.0

def parse_xml(xml_bytes):
    for enc in ("utf-8", "latin-1", "cp1252"):
        try:
            root = ET.fromstring(xml_bytes.decode(enc))
            break
        except Exception:
            continue
    else:
        root = ET.fromstring(xml_bytes.decode("utf-8", "replace").replace("�", "?"))
    rows = []
    for child in root:
        row = {tag.tag: (tag.text or "").strip() for tag in child}
        if row:
            rows.append(row)
    return rows

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox"])
        ctx = browser.new_context(
            viewport={"width": 1280, "height": 1024},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        )
        page = ctx.new_page()

        # Estabelece sessão
        page.goto(f"{BASE_URL}/index.asp?acao=2&item=1", wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(2000)
        try:
            page.wait_for_selector("#cmbAno", timeout=8000)
            page.select_option("#cmbAno", value=ANO)
            page.wait_for_timeout(1500)
            print(f"Sessão: ano {ANO} selecionado")
        except:
            pass

        # geraxml.asp?item=2 → link para ZIP de lançamentos
        geraxml_url = (
            f"{BASE_URL}/geraxml.asp?item=2"
            f"&banco=DW_LC131_FA_0"
            f"&exercicio={ANO}"
            f"&dataInicial={ANO}0101"
            f"&dataFinal={ANO}1231"
            f"&unidadeGestora=999"
            f"&nmFornecedor="
        )
        resp = page.request.get(geraxml_url)
        text = resp.body().decode("utf-8", "replace")
        print(f"geraxml: {text[:100]}")

        m = re.search(r"href=['\"]([^'\"]+\.zip)['\"]", text, re.IGNORECASE)
        if not m:
            print("Nenhum ZIP encontrado")
            browser.close()
            return

        zip_url = f"{BASE_URL}/{m.group(1)}"
        print(f"ZIP: {zip_url}")
        zip_resp = page.request.get(zip_url)
        zip_bytes = zip_resp.body()
        print(f"ZIP baixado: {len(zip_bytes)} bytes")
        browser.close()

    # Extrai XML
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as z:
        xml_bytes = z.read(z.namelist()[0])

    with open(os.path.join(DEBUG_DIR, "receitas_lancamento.xml"), "wb") as f:
        f.write(xml_bytes)

    rows = parse_xml(xml_bytes)
    print(f"\n{len(rows)} registros individuais")
    if rows:
        print("Colunas:", list(rows[0].keys()))

    # ── Agrega por TipoReceita ───────────────────────────────────────────
    por_tipo = {}
    for r in rows:
        tipo = r.get("TipoReceita", "Outros") or "Outros"
        val  = parse_brl(r.get("ValorLancadoExercicio", ""))
        val += parse_brl(r.get("ValorLancadoDividaAtiva", ""))
        por_tipo[tipo] = por_tipo.get(tipo, 0.0) + val

    tipo_list = sorted(
        [{"tipo": k, "valor": round(v, 2)} for k, v in por_tipo.items() if v > 0],
        key=lambda x: -x["valor"]
    )
    print(f"\nPor TipoReceita: {len(tipo_list)} tipos")
    for t in tipo_list:
        print(f"  {ascii(t['tipo'])}: R$ {t['valor']:,.2f}")

    # ── Agrega por Mês ───────────────────────────────────────────────────
    por_mes = {}
    for r in rows:
        mes = (r.get("Mes", "") or "").upper().replace("Ç", "C").replace("Ã", "A")
        val = parse_brl(r.get("ValorLancadoExercicio", ""))
        val += parse_brl(r.get("ValorLancadoDividaAtiva", ""))
        if mes:
            por_mes[mes] = por_mes.get(mes, 0.0) + val

    mes_list = sorted(
        [{"mes": k, "valor": round(v, 2)} for k, v in por_mes.items()],
        key=lambda x: MES_ORDER.get(x["mes"], 99)
    )
    print(f"\nPor Mes: {len(mes_list)} meses")
    for m2 in mes_list:
        print(f"  {m2['mes']}: R$ {m2['valor']:,.2f}")

    # ── Agrega por Tributo (sub-tipo) ────────────────────────────────────
    por_tributo = {}
    for r in rows:
        tipo    = r.get("TipoReceita", "Outros") or "Outros"
        tributo = r.get("Tributo", "") or ""
        key     = (tipo, tributo)
        val     = parse_brl(r.get("ValorLancadoExercicio", ""))
        val    += parse_brl(r.get("ValorLancadoDividaAtiva", ""))
        por_tributo[key] = por_tributo.get(key, 0.0) + val

    tributo_list = sorted(
        [{"tipo": k[0], "tributo": k[1], "valor": round(v, 2)} for k, v in por_tributo.items() if v > 0],
        key=lambda x: (-x["valor"])
    )[:50]  # top 50

    # ── Salva JSON final ─────────────────────────────────────────────────
    out = {
        "ano":       ANO,
        "por_tipo":  tipo_list,
        "por_mes":   mes_list,
        "por_tributo": tributo_list,
    }
    path = os.path.join(OUTPUT_DIR, "receitas.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(f"\nSalvo em {path}")

    total = sum(t["valor"] for t in tipo_list)
    print(f"Total lançado: R$ {total:,.2f}")

if __name__ == "__main__":
    main()
