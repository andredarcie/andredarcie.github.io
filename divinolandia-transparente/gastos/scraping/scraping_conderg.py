"""
Scraper de Salários do CONDERG - Hospital Regional de Divinolândia
Portal: https://condergdivinolandia.geosiap.net.br/conderg/websis/

Estratégia:
1. Playwright estabelece sessão e dispara a consulta no portal
2. Intercepta a resposta JSON do endpoint AJAX (DataTables)
3. Filtra por prefixo "HOSPITAL -" (Hospital Regional de Divinolândia)
   e "SAMU - DIVINOLANDIA"
4. Agrega por setor, cargo e salário
"""

import sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from playwright.sync_api import sync_playwright
import json, os, re

BASE_URL = "https://condergdivinolandia.geosiap.net.br/conderg/websis/portal_transparencia/financeiro/contas_publicas/index.php?consulta=../lei_acesso/lai_remuneracoes"
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Competência a extrair — usa a mais recente disponível
COMPETENCIA = "04/2026"

def captura_json():
    captured = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox"])
        ctx = browser.new_context(
            viewport={"width": 1280, "height": 900},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        )
        page = ctx.new_page()

        def on_response(resp):
            if "lai_remuneracoes_ajax_grid" in resp.url:
                try:
                    captured.append(resp.body())
                    print(f"  JSON capturado: {len(captured[-1]):,} bytes")
                except Exception as e:
                    print(f"  Erro ao capturar: {e}")

        page.on("response", on_response)

        print("[1] Carregando portal CONDERG...")
        page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
        page.wait_for_timeout(1500)

        print("[2] Selecionando entidade e competência...")
        page.select_option("#ds_schema", index=1)       # CONDERG MATRIZ (todos os setores)
        page.select_option("#competencia", value=COMPETENCIA)
        page.wait_for_timeout(500)

        print("[3] Consultando...")
        page.click('button[type=submit]:has-text("Consultar")')
        page.wait_for_timeout(5000)

        browser.close()

    if not captured:
        print("ERRO: nenhum dado capturado")
        return None
    return json.loads(captured[-1])

def parse_competencia(comp):
    """Converte '04/2026' em {'ano': '2026', 'mes': '04', 'label': 'Abril/2026'}"""
    MESES = {
        "01": "Janeiro", "02": "Fevereiro", "03": "Marco", "04": "Abril",
        "05": "Maio",    "06": "Junho",     "07": "Julho", "08": "Agosto",
        "09": "Setembro","10": "Outubro",   "11": "Novembro","12": "Dezembro",
        "13": "13 Salario",
    }
    mes, ano = comp.split("/")
    return {"ano": ano, "mes": mes, "label": f"{MESES.get(mes, mes)}/{ano}"}

def agregar(rows, filtro_prefix):
    """Agrega registros filtrados pelo prefixo de unidade."""
    por_setor   = {}
    por_cargo   = {}
    detalhes    = []

    for r in rows:
        # r: [cargo, cpf, matricula, nome, cargo2, ?, unidade, horas, ?, salario, btn]
        cargo   = str(r[0]).strip()
        nome    = str(r[3]).strip()
        unidade = str(r[6]).strip()
        sal     = float(r[9]) if r[9] else 0.0

        if not any(unidade.upper().startswith(p) for p in filtro_prefix):
            continue
        if sal <= 0:
            continue

        # Remove prefixo "HOSPITAL - " do nome do cargo para exibição
        cargo_display = re.sub(r'^(?:HOSPITAL|SAMU)\s*-\s*', '', cargo).strip()
        setor_display = unidade.replace("HOSPITAL - ", "").replace("SAMU - ", "SAMU ")

        # Por setor
        if setor_display not in por_setor:
            por_setor[setor_display] = {"total": 0.0, "count": 0}
        por_setor[setor_display]["total"] += sal
        por_setor[setor_display]["count"] += 1

        # Por cargo
        if cargo_display not in por_cargo:
            por_cargo[cargo_display] = {"total": 0.0, "count": 0}
        por_cargo[cargo_display]["total"] += sal
        por_cargo[cargo_display]["count"] += 1

        detalhes.append({
            "nome":    nome,
            "cargo":   cargo_display,
            "setor":   setor_display,
            "salario": round(sal, 2),
        })

    return por_setor, por_cargo, detalhes

def main():
    print("=" * 65)
    print("SALARIOS CONDERG - HOSPITAL REGIONAL DE DIVINOLANDIA")
    print("=" * 65)

    data = captura_json()
    if not data:
        return

    rows = data["data"]
    total_geral = data["recordsTotal"]
    print(f"\nTotal de registros CONDERG: {total_geral}")

    comp = parse_competencia(COMPETENCIA)

    # Filtra: Hospital Regional de Divinolândia + SAMU Divinolândia
    por_setor, por_cargo, detalhes = agregar(
        rows,
        filtro_prefix=["HOSPITAL", "SAMU - DIVINOL"]
    )

    total_sal = sum(d["salario"] for d in detalhes)
    print(f"Servidores filtrados: {len(detalhes)}")
    print(f"Folha total ({comp['label']}): R$ {total_sal:,.2f}")

    print("\nTop setores:")
    for k, v in sorted(por_setor.items(), key=lambda x: -x[1]["total"])[:10]:
        print(f"  {k}: {v['count']} serv | R$ {v['total']:,.2f}")

    print("\nTop cargos:")
    for k, v in sorted(por_cargo.items(), key=lambda x: -x[1]["total"])[:10]:
        print(f"  {k}: {v['count']} serv | R$ {v['total']:,.2f}")

    # Monta JSON de saída
    setor_list = sorted(
        [{"setor": k, "total": round(v["total"], 2), "servidores": v["count"]}
         for k, v in por_setor.items()],
        key=lambda x: -x["total"]
    )
    cargo_list = sorted(
        [{"cargo": k, "total": round(v["total"], 2), "servidores": v["count"]}
         for k, v in por_cargo.items()],
        key=lambda x: -x["total"]
    )[:25]

    # Ordena detalhes por salário desc
    detalhes.sort(key=lambda x: -x["salario"])

    # Faixas salariais
    faixas = {"Ate 2k": 0, "2k-4k": 0, "4k-8k": 0, "8k-15k": 0, "Acima 15k": 0}
    for d in detalhes:
        s = d["salario"]
        if s < 2000:       faixas["Ate 2k"]    += 1
        elif s < 4000:     faixas["2k-4k"]      += 1
        elif s < 8000:     faixas["4k-8k"]      += 1
        elif s < 15000:    faixas["8k-15k"]     += 1
        else:              faixas["Acima 15k"]  += 1

    out = {
        "competencia":  comp["label"],
        "total_salarios": round(total_sal, 2),
        "total_servidores": len(detalhes),
        "media_salarial":   round(total_sal / len(detalhes), 2) if detalhes else 0,
        "por_setor":   setor_list,
        "por_cargo":   cargo_list,
        "faixas":      [{"faixa": k, "count": v} for k, v in faixas.items()],
        "detalhes":    detalhes,
    }

    path = os.path.join(OUTPUT_DIR, "salarios_conderg.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(f"\nSalvo em {path}")

if __name__ == "__main__":
    main()
