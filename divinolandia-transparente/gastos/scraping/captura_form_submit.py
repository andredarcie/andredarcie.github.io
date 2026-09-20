from playwright.sync_api import sync_playwright
import json

BASE_URL = "https://webapp1-divinolandia.cidade360.cloud/pronimtb"

def main():
    print("Tentando submeter o formulário e capturar dados...")

    all_calls = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)  # headless=False para ver o que acontece
        page = browser.new_page()

        def on_response(response):
            all_calls.append({
                "url": response.url,
                "status": response.status,
                "len": len(response.body()) if response.status == 200 else 0,
            })

        page.on("response", on_response)

        # Carrega a página de credores
        page.goto(f"{BASE_URL}/index.asp?acao=3&item=10")
        page.wait_for_timeout(3000)

        # Seleciona ano 2026
        options = page.eval_on_selector("#cmbAno", "el => Array.from(el.options).map(o => ({value: o.value, text: o.text}))")
        year_opt = next((o for o in options if o["text"] == "2026"), None)
        if year_opt:
            page.select_option("#cmbAno", value=year_opt["value"])
            print(f"Ano selecionado: {year_opt['value']}")
            page.wait_for_timeout(2000)

        # Tenta submeter o formulário via JS
        print("Submetendo formulário via JS...")
        try:
            page.eval_on_selector("#frmFormulario", "form => form.submit()")
        except:
            pass

        # Alternativa: clica no confirma
        try:
            page.evaluate("document.getElementById('confirma').click()")
        except:
            pass

        # Aguarda navegação
        page.wait_for_timeout(5000)

        # Captura o HTML resultado
        html = page.content()
        with open("debug_after_submit.html", "w", encoding="utf-8") as f:
            f.write(html)

        # Screenshot
        page.screenshot(path="screenshot_after_submit.png", full_page=True)
        print("Screenshot salvo em screenshot_after_submit.png")

        # Verifica se há dados monetários
        import re
        money_pattern = re.compile(r'\d{1,3}(?:\.\d{3})*,\d{2}')
        money = money_pattern.findall(html)
        print(f"Valores monetários no HTML: {len(money)}")
        if money:
            print("Exemplos:", money[:10])

        input("Pressione Enter para fechar o browser...")
        browser.close()

if __name__ == "__main__":
    main()
