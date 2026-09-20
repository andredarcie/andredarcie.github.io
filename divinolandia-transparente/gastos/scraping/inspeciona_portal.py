import requests
from bs4 import BeautifulSoup

BASE_URL = "https://webapp1-divinolandia.cidade360.cloud/pronimtb"

session = requests.Session()
session.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
})

# Carrega a página principal
r = session.get(BASE_URL + "/index.asp", timeout=30)
soup = BeautifulSoup(r.text, "html.parser")

# Salva HTML completo
with open("portal_main.html", "w", encoding="utf-8") as f:
    f.write(r.text)
print("HTML salvo em portal_main.html")

# Extrai todos os links
print("\n=== TODOS OS LINKS ===")
for a in soup.find_all("a", href=True):
    href = a["href"]
    text = a.get_text(strip=True)
    if text and href not in ["#", ""]:
        print(f"  [{text}] -> {href}")

# Extrai todos os formulários
print("\n=== FORMULÁRIOS ===")
for i, form in enumerate(soup.find_all("form")):
    print(f"\nFormulário {i+1}:")
    print(f"  Action: {form.get('action')}")
    print(f"  Method: {form.get('method')}")
    for inp in form.find_all(["input", "select", "textarea"]):
        print(f"  {inp.name}: name={inp.get('name')} value={inp.get('value')} type={inp.get('type')}")
        if inp.name == "select":
            for opt in inp.find_all("option"):
                print(f"    option: value={opt.get('value')} text={opt.get_text(strip=True)}")

# Procura scripts com configuração de URLs
print("\n=== SCRIPTS JS (URLs relevantes) ===")
for script in soup.find_all("script"):
    text = script.get_text()
    if any(x in text.lower() for x in ["despesa", "empenho", "acao=", "asp?"]):
        lines = [l.strip() for l in text.split("\n") if any(x in l.lower() for x in ["despesa", "empenho", "acao=", "url", "href"])]
        for line in lines[:20]:
            print(f"  {line}")
