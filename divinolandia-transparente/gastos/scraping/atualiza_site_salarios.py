"""
Atualiza o SALARY_DATA do index.html com os dados reais de
data/salarios_top20.json (gerado pelo scraping_salarios.py).

Uso:
  python scraping/atualiza_site_salarios.py
"""

import json
import re
import os

BASE_DIR  = os.path.join(os.path.dirname(__file__), "..")
JSON_PATH = os.path.join(BASE_DIR, "data", "salarios_top20.json")
HTML_PATH = os.path.join(BASE_DIR, "index.html")


def main():
    # Carrega JSON
    if not os.path.exists(JSON_PATH):
        print(f"Arquivo não encontrado: {JSON_PATH}")
        print("Execute primeiro: python scraping/scraping_salarios.py")
        return

    with open(JSON_PATH, encoding="utf-8") as f:
        salary_data = json.load(f)

    if not salary_data:
        print("JSON vazio. Verifique o scraping.")
        return

    print(f"Carregados {len(salary_data)} servidores do JSON.")

    # Calcula SALARY_MAX
    salary_max = max(d["bruto"] for d in salary_data)
    print(f"Maior salário bruto: R$ {salary_max:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."))

    # Formata novo bloco JS
    js_array = json.dumps(salary_data, ensure_ascii=False, indent=2)
    new_block = f"const SALARY_DATA = {js_array};\n\nconst SALARY_MAX = {salary_max:.2f};"

    # Lê HTML
    with open(HTML_PATH, encoding="utf-8") as f:
        html = f.read()

    # Substitui o bloco SALARY_DATA + SALARY_MAX
    pattern = r"// ── SALARY DATA.*?const SALARY_MAX = [\d.]+;"
    replacement = (
        "// ── SALARY DATA (extraído do portal oficial — atualizado automaticamente) ──\n"
        + new_block
    )

    new_html, n = re.subn(pattern, replacement, html, flags=re.DOTALL)
    if n == 0:
        print("Bloco SALARY_DATA não encontrado no HTML. Verifique o index.html.")
        return

    # Remove o aviso de dados ilustrativos (substitui por aviso de dados reais)
    new_html = new_html.replace(
        "⚠️ <strong>Dados ilustrativos</strong> — Baseados em referências do IBGE e TCE-SP para municípios de porte similar. Consulte o <a href=\"https://webapp1-divinolandia.cidade360.cloud/pronimtb/\" target=\"_blank\" style=\"color:#7A5000;font-weight:600;\">portal oficial</a> para os valores exatos de cada servidor.",
        "✅ <strong>Dados oficiais</strong> — Extraídos diretamente do <a href=\"https://webapp1-divinolandia.cidade360.cloud/pronimtb/\" target=\"_blank\" style=\"color:#7A5000;font-weight:600;\">Portal de Transparência</a> (Gestão de Pessoas › Salários por Colaborador)."
    )

    # Atualiza a observação no demo-notice (estilo também muda)
    new_html = new_html.replace(
        "background: var(--amber-lt);\n    border: 1px solid rgba(198,139,42,0.3);\n    border-radius: 8px;\n    padding: 0.65rem 1rem;\n    font-size: 0.78rem;\n    color: #7A5000;",
        "background: #E8FFF0;\n    border: 1px solid rgba(26,107,60,0.3);\n    border-radius: 8px;\n    padding: 0.65rem 1rem;\n    font-size: 0.78rem;\n    color: #1B5E20;"
    )

    with open(HTML_PATH, "w", encoding="utf-8") as f:
        f.write(new_html)

    print(f"\nindex.html atualizado com {len(salary_data)} servidores.")
    print(f"Maior salário: R$ {salary_max:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."))
    print("Pronto! Abra o index.html no navegador para ver os dados reais.")


if __name__ == "__main__":
    main()
