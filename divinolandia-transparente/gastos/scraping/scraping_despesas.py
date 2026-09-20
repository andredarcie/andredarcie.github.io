"""
OBSOLETO: soma os empenhos sem descontar as anulações (2025 saiu R$ 9,97 mi acima do
balanço oficial). Use scraping/despesas_tce.mjs, que parte do TCE-SP e do SICONFI.

Scraper de Despesas (Empenhos) - Prefeitura de Divinolândia/SP
Portal: https://webapp1-divinolandia.cidade360.cloud/pronimtb

Estratégia (idêntica ao scraper de receitas que funcionou):
1. Playwright estabelece sessão navegando para a página de empenhos
2. page.request.get() chama geraxml.asp com os cookies ativos
3. Tenta múltiplos item numbers (3-8) para achar o XML de empenhos completos
4. Baixa o ZIP, extrai o XML, agrega por secretaria / natureza / credor
"""

import sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from playwright.sync_api import sync_playwright
import json, re, os, zipfile, io
import xml.etree.ElementTree as ET

BASE_URL   = "https://webapp1-divinolandia.cidade360.cloud/pronimtb"
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
DEBUG_DIR  = os.path.join(os.path.dirname(__file__), "..", "debug")
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(DEBUG_DIR,  exist_ok=True)

ANO        = "2025"
DATA_INI   = f"{ANO}0101"
DATA_FIM   = f"{ANO}1231"

MES_ORDER = {
    "JANEIRO": 1, "FEVEREIRO": 2, "MARCO": 3, "MARÇO": 3,
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

def parse_xml_bytes(xml_bytes):
    """Parseia o XML respeitando a declaração de encoding (ISO-8859-1 / UTF-8)."""
    # ET.fromstring com bytes respeita a declaração <?xml encoding="..."?>
    try:
        return ET.fromstring(xml_bytes)
    except ET.ParseError:
        pass
    # Fallback: força latin-1, substitui a declaração por utf-8
    try:
        text = xml_bytes.decode("latin-1")
        text = re.sub(r'encoding=["\'][^"\']*["\']', 'encoding="utf-8"', text, count=1, flags=re.IGNORECASE)
        return ET.fromstring(text.encode("utf-8"))
    except Exception:
        pass
    # Último recurso
    text = xml_bytes.decode("utf-8", "replace")
    return ET.fromstring(text)

def extract_records(root):
    """Extrai registros genéricos do XML — tenta diferentes estruturas."""
    records = []
    # Estrutura 1: filhos diretos com sub-elementos (estilo receitas)
    for child in root:
        row = {el.tag: (el.text or "").strip() for el in child}
        if row:
            records.append(row)
    if records:
        return records
    # Estrutura 2: Principal/Itens (estilo empenhos do portal)
    for principal in root.findall(".//Principal"):
        def g(tag):
            el = principal.find(tag)
            return (el.text or "").strip() if el is not None else ""
        # Pega primeiro item como histórico/descrição
        hist = ""
        for item_el in principal.findall(".//Itens/Item"):
            t = item_el.find("Item")
            if t is not None and t.text and t.text.strip():
                hist = t.text.strip()
                break
        row = {el.tag: (el.text or "").strip() for el in principal if el.tag != "Itens"}
        row["_historico"] = hist
        records.append(row)
    return records

def try_geraxml(page, item_num, banco="DW_LC131_FC_13"):
    """Tenta chamar geraxml.asp para o item e banco dados. Retorna (records, zip_bytes) ou ([], None)."""
    url = (
        f"{BASE_URL}/geraxml.asp?item={item_num}"
        f"&banco={banco}"
        f"&exercicio={ANO}"
        f"&dataInicial={DATA_INI}"
        f"&dataFinal={DATA_FIM}"
        f"&unidadeGestora=-1"
        f"&nmFornecedor="
    )
    try:
        resp = page.request.get(url, timeout=120000)
        text = resp.body().decode("utf-8", "replace")
        err  = re.search(r"ERRO[:\s]*([^\n<]{3,80})", text, re.IGNORECASE)
        if err:
            print(f"  item={item_num} banco={banco}: ERRO → {err.group(1).strip()}")
            return [], None
        m = re.search(r"href=['\"]([^'\"]+\.zip)['\"]", text, re.IGNORECASE)
        if not m:
            snippet = text[:120].replace("\n", " ")
            print(f"  item={item_num} banco={banco}: sem ZIP → {snippet}")
            return [], None
        zip_path = m.group(1)
        zip_url  = f"{BASE_URL}/{zip_path}" if not zip_path.startswith("http") else zip_path
        print(f"  item={item_num} banco={banco}: ZIP encontrado >> {zip_url}")
        zip_resp  = page.request.get(zip_url, timeout=60000)
        zip_bytes = zip_resp.body()
        print(f"  ZIP baixado: {len(zip_bytes):,} bytes")
        if len(zip_bytes) < 100:
            print("  ZIP muito pequeno, provavelmente inválido")
            return [], None
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as z:
            xml_bytes = z.read(z.namelist()[0])
        # Salva debug
        debug_name = f"despesas_item{item_num}.xml"
        with open(os.path.join(DEBUG_DIR, debug_name), "wb") as f:
            f.write(xml_bytes)
        root = parse_xml_bytes(xml_bytes)
        records = extract_records(root)
        print(f"  {len(records)} registros extraídos")
        if records:
            print(f"  Colunas: {list(records[0].keys())[:10]}")
        return records, zip_bytes
    except Exception as e:
        print(f"  item={item_num} banco={banco}: excecao >> {e}")
        return [], None

def aggregate(records):
    """Agrega os registros por secretaria, natureza, credor e mês."""
    por_secretaria = {}
    por_natureza   = {}
    por_credor     = {}
    por_mes        = {}

    # Detecta nomes de campos relevantes
    if not records:
        return {}, {}, {}, {}

    sample = records[0]
    keys = list(sample.keys())  # preserva ordem
    keys_lower = [k.lower() for k in keys]

    def find_field(candidates):
        # Tenta match exato primeiro
        for c in candidates:
            if c.lower() in keys_lower:
                return keys[keys_lower.index(c.lower())]
        # Depois match parcial
        for c in candidates:
            for i, k in enumerate(keys_lower):
                if c.lower() in k:
                    return keys[i]
        return None

    # Prefere Funcao (ex: "Saúde", "Educação") sobre UnidadeGestora (só "PREFEITURA MUNICIPAL")
    f_sec   = find_field(["Funcao", "SubFuncao", "Unidade", "Departamento", "Orgao", "Secretaria"])
    f_nat   = find_field(["ModalidadeLicitacao", "GrupoDespesa", "ElementoDespesa", "CategoriaEconomica", "Natureza"])
    f_cred  = find_field(["Credor", "Fornecedor", "NomeFornecedor"])
    f_emp   = find_field(["ValorEmpenhado", "ValorEmpenho", "Empenho"])
    f_pago  = find_field(["ValorPago", "Pago"])
    f_liq   = find_field(["ValorLiquidado", "Liquidado"])
    f_mes   = find_field(["Mes", "DataEmissao"])

    print(f"\n  Campos detectados:")
    print(f"    secretaria={f_sec}, natureza={f_nat}, credor={f_cred}")
    print(f"    valor_emp={f_emp}, valor_pago={f_pago}, valor_liq={f_liq}, mes={f_mes}")

    for r in records:
        val_emp  = parse_brl(r.get(f_emp,  "") if f_emp  else "")
        val_pago = parse_brl(r.get(f_pago, "") if f_pago else "")
        val_liq  = parse_brl(r.get(f_liq,  "") if f_liq  else "")
        if val_emp == 0 and val_pago == 0:
            continue

        # Por secretaria
        sec = (r.get(f_sec, "") if f_sec else "Outros") or "Outros"
        if sec not in por_secretaria:
            por_secretaria[sec] = {"empenhado": 0.0, "pago": 0.0, "liquidado": 0.0}
        por_secretaria[sec]["empenhado"]  += val_emp
        por_secretaria[sec]["pago"]       += val_pago
        por_secretaria[sec]["liquidado"]  += val_liq

        # Por natureza
        nat = (r.get(f_nat, "") if f_nat else "Outros") or "Outros"
        if nat not in por_natureza:
            por_natureza[nat] = {"empenhado": 0.0, "pago": 0.0}
        por_natureza[nat]["empenhado"] += val_emp
        por_natureza[nat]["pago"]      += val_pago

        # Por credor
        cred = (r.get(f_cred, "") if f_cred else "Não identificado") or "Não identificado"
        if cred not in por_credor:
            por_credor[cred] = {"empenhado": 0.0, "pago": 0.0, "count": 0}
        por_credor[cred]["empenhado"] += val_emp
        por_credor[cred]["pago"]      += val_pago
        por_credor[cred]["count"]     += 1

        # Por mês
        mes_raw = (r.get(f_mes, "") if f_mes else "") or ""
        mes = mes_raw.upper().replace("Ç", "C").replace("Ã", "A").replace("Á", "A")[:3]
        # Se for data (DD/MM/YYYY), extrai mês
        if re.match(r"\d{2}/\d{2}/\d{4}", mes_raw):
            num_mes = int(mes_raw[3:5])
            mes_names = ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"]
            mes = mes_names[num_mes - 1] if 1 <= num_mes <= 12 else ""
        if mes:
            if mes not in por_mes:
                por_mes[mes] = {"empenhado": 0.0, "pago": 0.0}
            por_mes[mes]["empenhado"] += val_emp
            por_mes[mes]["pago"]      += val_pago

    return por_secretaria, por_natureza, por_credor, por_mes

def build_json(por_secretaria, por_natureza, por_credor, por_mes):
    funcao_list = sorted(
        [{"funcao": k, "empenhado": round(v["empenhado"], 2), "pago": round(v["pago"], 2)}
         for k, v in por_secretaria.items() if v["empenhado"] > 0],
        key=lambda x: -x["empenhado"]
    )
    nat_list = sorted(
        [{"modalidade": k, "empenhado": round(v["empenhado"], 2), "pago": round(v["pago"], 2)}
         for k, v in por_natureza.items() if v["empenhado"] > 0],
        key=lambda x: -x["empenhado"]
    )[:15]
    cred_list = sorted(
        [{"credor": k, "empenhado": round(v["empenhado"], 2), "pago": round(v["pago"], 2), "empenhos": v["count"]}
         for k, v in por_credor.items() if v["empenhado"] > 0],
        key=lambda x: -x["empenhado"]
    )[:25]
    mes_order = {"JAN": 1, "FEV": 2, "MAR": 3, "ABR": 4, "MAI": 5, "JUN": 6,
                 "JUL": 7, "AGO": 8, "SET": 9, "OUT": 10, "NOV": 11, "DEZ": 12}
    mes_list = sorted(
        [{"mes": k, "empenhado": round(v["empenhado"], 2), "pago": round(v["pago"], 2)}
         for k, v in por_mes.items()],
        key=lambda x: mes_order.get(x["mes"][:3], 99)
    )
    total_emp  = round(sum(v["empenhado"] for v in por_secretaria.values()), 2)
    total_pago = round(sum(v["pago"]      for v in por_secretaria.values()), 2)
    return {
        "ano":           ANO,
        "total_empenhado": total_emp,
        "total_pago":    total_pago,
        "por_funcao":    funcao_list,
        "por_modalidade": nat_list,
        "por_credor":    cred_list,
        "por_mes":       mes_list,
    }

def main():
    print("=" * 65)
    print(f"DESPESAS/EMPENHOS - PREFEITURA DE DIVINOLÂNDIA/SP ({ANO})")
    print("=" * 65)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox"])
        ctx = browser.new_context(
            viewport={"width": 1280, "height": 1024},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        )
        page = ctx.new_page()

        # Navega para a seção de empenhos para estabelecer sessão
        print("\n[1] Estabelecendo sessão...")
        page.goto(f"{BASE_URL}/index.asp?acao=10&item=6", wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(2500)

        # Lê banco diretamente do dropdown cmbAno (formato: "2025|DW_LC131_FC_12|")
        banco_real = ""
        try:
            # O cmbAno tem opcoes no formato "YYYY|banco|"
            opts = page.eval_on_selector(
                "#cmbAno",
                "el => Array.from(el.options).map(o => ({v: o.value, t: o.text.trim()}))"
            )
            for opt in opts:
                if opt["t"] == ANO:
                    partes = opt["v"].split("|")
                    if len(partes) >= 2:
                        banco_real = partes[1]
                    break
            if banco_real:
                print(f"  Banco para {ANO}: {banco_real}")
                page.select_option("#cmbAno", value=f"{ANO}|{banco_real}|")
            else:
                print("  Banco nao encontrado no dropdown, usando FC_12")
                banco_real = f"DW_LC131_FC_12"
                page.select_option("#cmbAno", value=ANO)
            page.wait_for_timeout(1500)
        except Exception as e:
            print(f"  Aviso cmbAno: {e}")
            banco_real = "DW_LC131_FC_12"

        # Preenche datas se disponíveis
        for txt_id, val in [("txtDataInicial", f"01/01/{ANO}"), ("txtDataFinal", f"31/12/{ANO}")]:
            try:
                page.fill(f"#{txt_id}", val)
            except:
                pass

        all_records = []
        used_item   = None

        print("\n[2] Tentando geraxml.asp com diferentes item numbers...")

        # Usa o banco real lido do dropdown + fallbacks
        bancos = [banco_real] if banco_real else ["DW_LC131_FC_12"]
        # Adiciona fallbacks por garantia
        for extra in ["DW_LC131_FC_12", "DW_LC131_FC_13", "DW_LC131_FC_11"]:
            if extra not in bancos:
                bancos.append(extra)

        # Items a tentar: 6=adiantamentos, 7=RestosPagar, 5=DocumentosExtras(encontrado antes)
        # 13=EmpenhosPagar, 3,4,8,9,10,11,12=outros relatorios de despesas
        items_priority = [6, 7, 13, 4, 8, 9, 10, 11, 12, 3, 1]

        for item_num in items_priority:
            for banco in bancos:
                recs, _ = try_geraxml(page, item_num, banco)
                # Aceita apenas se tiver campo de valor empenhado/pago com total relevante
                if recs and len(recs) > 20:
                    # Verifica se tem campos de valor financeiro úteis
                    sample_keys = set(recs[0].keys())
                    has_emp = any("Empenh" in k or "Empenho" in k or "Valor" in k for k in sample_keys)
                    if has_emp:
                        all_records = recs
                        used_item   = item_num
                        print(f"\n  OK Dados encontrados: item={item_num} banco={banco} ({len(recs)} registros)")
                        break
                    else:
                        print(f"  item={item_num}: sem campos de valor empenho, ignorando")
            if all_records:
                break

        browser.close()

    if not all_records:
        print("\nERRO: Nenhum dado encontrado em nenhum item. Verifique debug/")
        return

    print(f"\n[3] Agregando {len(all_records)} registros...")
    por_sec, por_nat, por_cred, por_mes = aggregate(all_records)

    print(f"\n  Secretarias: {len(por_sec)}")
    print(f"  Naturezas:   {len(por_nat)}")
    print(f"  Credores:    {len(por_cred)}")
    print(f"  Meses:       {len(por_mes)}")

    total_emp = sum(v["empenhado"] for v in por_sec.values())
    total_pago = sum(v["pago"] for v in por_sec.values())
    print(f"\n  Total empenhado: R$ {total_emp:,.2f}")
    print(f"  Total pago:      R$ {total_pago:,.2f}")

    print("\n  Top secretarias:")
    for k, v in sorted(por_sec.items(), key=lambda x: -x[1]["empenhado"])[:8]:
        print(f"    {k[:50]}: R$ {v['empenhado']:,.2f}")

    print("\n  Top credores:")
    for k, v in sorted(por_cred.items(), key=lambda x: -x[1]["empenhado"])[:10]:
        print(f"    {k[:50]}: R$ {v['empenhado']:,.2f}")

    out = build_json(por_sec, por_nat, por_cred, por_mes)
    path = os.path.join(OUTPUT_DIR, "despesas.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(f"\nSalvo em {path}")
    print(f"   {len(out['por_funcao'])} funcoes, {len(out['por_modalidade'])} modalidades, {len(out['por_credor'])} credores")

if __name__ == "__main__":
    main()
