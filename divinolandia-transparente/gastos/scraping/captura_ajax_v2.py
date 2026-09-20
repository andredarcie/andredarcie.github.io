from playwright.sync_api import sync_playwright
import json

BASE_URL = "https://webapp1-divinolandia.cidade360.cloud/pronimtb"
DW_CODE = "2026|DW_LC131_FC_13|"

def capture_all_ajax(section_url, section_name, wait_ms=8000):
    """Captura todas as chamadas AJAX de uma seção, aguardando os dados carregarem."""
    ajax_calls = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        def on_response(response):
            if "acao.asp" in response.url:
                try:
                    body = response.body().decode("utf-8", errors="replace")
                    ajax_calls.append({
                        "url": response.url,
                        "status": response.status,
                        "body": body,
                        "len": len(body),
                    })
                except:
                    pass

        page.on("response", on_response)

        page.goto(section_url)
        page.wait_for_timeout(2000)

        # Seleciona ano 2026
        try:
            page.wait_for_timeout(2000)
            options = page.eval_on_selector("#cmbAno", "el => Array.from(el.options).map(o => ({value: o.value, text: o.text}))")
            year_opt = next((o for o in options if o["text"] == "2026"), None)
            if year_opt:
                page.select_option("#cmbAno", value=year_opt["value"])
                print(f"  Ano selecionado. Aguardando dados ({wait_ms}ms)...")
                page.wait_for_timeout(wait_ms)
        except Exception as e:
            print(f"  Erro ao selecionar ano: {e}")

        # Aguarda mais para garantir todas as chamadas
        page.wait_for_timeout(3000)

        browser.close()

    return ajax_calls

def find_data_calls(ajax_calls):
    """Identifica as chamadas que retornam dados reais."""
    data_calls = []
    for call in ajax_calls:
        body = call["body"]
        # Descarta chamadas de configuração
        if any(x in body for x in ["DW_LC131", "TipoProduto", "BuscaFavoritos", "text"]):
            if "Dados" in body and len(body) > 200:
                data_calls.append(call)
    return data_calls

def main():
    print("=" * 60)
    print("CAPTURANDO DADOS REAIS - DIVINOLÂNDIA 2026")
    print("=" * 60)

    sections = [
        (f"{BASE_URL}/index.asp?acao=3&item=10", "Credores"),
        (f"{BASE_URL}/index.asp?acao=3&item=2", "Natureza_Despesa"),
        (f"{BASE_URL}/index.asp?acao=3&item=1", "Acao_Governo"),
    ]

    all_section_data = {}

    for url, name in sections:
        print(f"\n--- {name} ---")
        calls = capture_all_ajax(url, name, wait_ms=10000)
        print(f"  Total chamadas acao.asp: {len(calls)}")

        # Mostra todas as chamadas
        for c in calls:
            acao = c["url"].split("acao=")[1].split("&")[0] if "acao=" in c["url"] else "?"
            print(f"  [{c['status']}] {acao} - {c['len']} bytes")
            if c["len"] > 200:
                print(f"    Preview: {c['body'][:200]}")

        # Salva todas as respostas para análise
        with open(f"ajax_{name}.json", "w", encoding="utf-8") as f:
            json.dump(calls, f, ensure_ascii=False, indent=2)

        all_section_data[name] = calls

    print("\n\nAnálise completa. Veja os arquivos ajax_*.json para detalhes.")

if __name__ == "__main__":
    main()
