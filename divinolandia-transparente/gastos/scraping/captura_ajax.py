from playwright.sync_api import sync_playwright
import json

BASE_URL = "https://webapp1-divinolandia.cidade360.cloud/pronimtb"

def main():
    print("Capturando chamadas AJAX ao selecionar 2026...")

    ajax_calls = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Intercepta todas as requisições de rede
        def on_request(request):
            if "acao.asp" in request.url or "index.asp" in request.url:
                ajax_calls.append({
                    "type": "REQUEST",
                    "method": request.method,
                    "url": request.url,
                    "post_data": request.post_data,
                })

        def on_response(response):
            if "acao.asp" in response.url:
                try:
                    body = response.body().decode("utf-8", errors="replace")
                    ajax_calls.append({
                        "type": "RESPONSE",
                        "url": response.url,
                        "status": response.status,
                        "body_preview": body[:500],
                        "body_len": len(body),
                    })
                except:
                    pass

        page.on("request", on_request)
        page.on("response", on_response)

        # Carrega a página de credores
        print("Carregando página de credores...")
        page.goto(f"{BASE_URL}/index.asp?acao=3&item=10")
        page.wait_for_timeout(3000)

        # Seleciona ano 2026
        print("Selecionando ano 2026...")
        try:
            page.wait_for_selector("#cmbAno option[value!='0']", timeout=8000)
            options = page.eval_on_selector("#cmbAno", "el => Array.from(el.options).map(o => ({value: o.value, text: o.text}))")
            year_opt = next((o for o in options if o["text"] == "2026"), None)
            if year_opt:
                page.select_option("#cmbAno", value=year_opt["value"])
                page.wait_for_timeout(5000)
        except Exception as e:
            print(f"Erro: {e}")

        browser.close()

    print(f"\nTotal de chamadas capturadas: {len(ajax_calls)}")
    print("\n=== CHAMADAS AJAX REGISTRADAS ===")
    for call in ajax_calls:
        if call["type"] == "REQUEST":
            print(f"\n[REQUEST] {call['method']} {call['url']}")
            if call["post_data"]:
                print(f"  POST: {call['post_data'][:200]}")
        else:
            print(f"[RESPONSE] {call['url']} - {call['status']} - {call['body_len']} bytes")
            if call["body_len"] > 0:
                print(f"  Body: {call['body_preview'][:200]}")

    with open("ajax_calls.json", "w", encoding="utf-8") as f:
        json.dump(ajax_calls, f, ensure_ascii=False, indent=2)
    print("\nDetalhes salvos em ajax_calls.json")

if __name__ == "__main__":
    main()
