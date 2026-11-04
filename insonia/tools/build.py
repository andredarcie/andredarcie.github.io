"""Atualiza o import map do index.html com todos os módulos e sobe o número do BUILD.

Uso: python tools/build.py [N]   (sem N, soma 1 ao BUILD atual)
Cada módulo vira "./caminho.js": "./caminho.js?v=N"; o selo "BUILD N" e o script de entrada
usam o mesmo N (convenção do repo: trocar todas as versões juntas).
"""
import os, re, sys, json
RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
html_p = os.path.join(RAIZ, 'index.html')
html = open(html_p, encoding='utf-8').read()
atual = int(re.search(r'BUILD (\d+)', html).group(1))
n = int(sys.argv[1]) if len(sys.argv) > 1 else atual + 1
mods = ['./main.js']
for base, _, fs in os.walk(os.path.join(RAIZ, 'src')):
    for f in sorted(fs):
        if f.endswith('.js'):
            rel = os.path.relpath(os.path.join(base, f), RAIZ).replace(os.sep, '/')
            mods.append('./' + rel)
mapa = {'imports': {m: f'{m}?v={n}' for m in mods}}
bloco = json.dumps(mapa, indent=2, ensure_ascii=False)
html = re.sub(r'(<script type="importmap">\n)(.*?)(\n</script>)', lambda m: m.group(1) + bloco + m.group(3), html, flags=re.S)
html = re.sub(r'BUILD \d+', f'BUILD {n}', html)
html = re.sub(r'main\.js\?v=\d+', f'main.js?v={n}', html)
open(html_p, 'w', encoding='utf-8', newline='\n').write(html)
print('BUILD', n, len(mods), 'módulos')
