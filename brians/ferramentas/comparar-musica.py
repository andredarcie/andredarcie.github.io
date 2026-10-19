# Original × nova (PLANO-MUSICA.md, etapa C): as duas fichas no pitch em que o
# jogo toca, a tabela com as tolerâncias do plano e a trava de originalidade
# (trechos de 5 intervalos da voz aguda em comum).
# Uso: python ferramentas/comparar-musica.py original nova.wav [--pitch 50] [--saida prefixo]
#   original: o áudio ou a ficha salva (musica-fichas/<id>-p<pitch>.json)
# Gerar ficha: python ferramentas/comparar-musica.py original.mp3 --salvar-ficha saida.json [--pitch P]
import importlib.util, json, os, sys
sys.stdout.reconfigure(encoding='utf-8')

aqui = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('am', os.path.join(aqui, 'analisar-musica.py'))
am = importlib.util.module_from_spec(spec)
spec.loader.exec_module(am)

args = sys.argv[1:]
opc = lambda nome, padrao=None: args[args.index(nome) + 1] if nome in args else padrao
pitch = int(opc('--pitch', 100))
saida = opc('--saida')
posicionais = [a for i, a in enumerate(args) if not a.startswith('--') and (i == 0 or not args[i - 1].startswith('--'))]
if '--salvar-ficha' in args:
    f, d = am.analisar(posicionais[0], pitch)
    json.dump({'ficha': f, 'notas': [int(n) for n in d['notas']]}, open(opc('--salvar-ficha'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('ficha salva:', opc('--salvar-ficha'))
    sys.exit(0)
original, nova = posicionais[:2]

# a original pode vir como ficha salva (musica-fichas/*.json): os MP3 saíram do projeto
if original.endswith('.json'):
    salva = json.load(open(original, encoding='utf-8'))
    fo, do = salva['ficha'], {'notas': salva['notas']}
else:
    fo, do = am.analisar(original, pitch)
fn, dn = am.analisar(nova, pitch)
if saida:
    if 'esp' in do: am.imagens(f'{saida}-original', do)
    am.imagens(f'{saida}-nova', dn)
    json.dump({'original': fo, 'nova': fn}, open(f'{saida}.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


def oitava(a, b):
    # andamento: aceita o mesmo ou o dobro/metade (a detecção erra por oitava)
    return min(abs(a - b * k) / a for k in (0.5, 1, 2))


graves = lambda f: f['bandas_%']['sub_<60'] + f['bandas_%']['grave_60-250']
linhas = [
    ('andamento (BPM)', fo['andamento']['bpm'], fn['andamento']['bpm'], oitava(fo['andamento']['bpm'], fn['andamento']['bpm']) <= 0.02, '±2% (ou oitava)'),
    ('swing (fase)', fo['andamento']['swing_fase'], fn['andamento']['swing_fase'],
     fo['andamento']['swing_fase'] is None or fn['andamento']['swing_fase'] is None or abs(fo['andamento']['swing_fase'] - fn['andamento']['swing_fase']) <= 0.06, '±0,06'),
    ('tom', f"{fo['tom']['tonica']} {fo['tom']['modo']}", f"{fn['tom']['tonica']} {fn['tom']['modo']}",
     (fo['tom']['tonica'], fo['tom']['modo']) == (fn['tom']['tonica'], fn['tom']['modo']), 'igual'),
    ('centroide (Hz)', fo['timbre']['centroide_hz'], fn['timbre']['centroide_hz'], abs(fn['timbre']['centroide_hz'] / fo['timbre']['centroide_hz'] - 1) <= 0.2, '±20%'),
    ('graves <250 Hz (%)', round(graves(fo), 1), round(graves(fn), 1), abs(graves(fo) - graves(fn)) <= 10, '±10 pts'),
    ('agudo >2 kHz (%)', round(fo['bandas_%']['agudo_2k-6k'] + fo['bandas_%']['ar_>6k'], 1), round(fn['bandas_%']['agudo_2k-6k'] + fn['bandas_%']['ar_>6k'], 1),
     abs((fo['bandas_%']['agudo_2k-6k'] + fo['bandas_%']['ar_>6k']) - (fn['bandas_%']['agudo_2k-6k'] + fn['bandas_%']['ar_>6k'])) <= 5, '±5 pts'),
    ('ataques/s', fo['ataques_por_s'], fn['ataques_por_s'], abs(fn['ataques_por_s'] / max(0.01, fo['ataques_por_s']) - 1) <= 0.25, '±25%'),
    ('volume (RMS dB)', fo['dinamica']['rms_db_mediana'], fn['dinamica']['rms_db_mediana'], abs(fo['dinamica']['rms_db_mediana'] - fn['dinamica']['rms_db_mediana']) <= 2, '±2 dB'),
    ('faixa dinâmica (dB)', fo['dinamica']['faixa_db'], fn['dinamica']['faixa_db'], abs(fo['dinamica']['faixa_db'] - fn['dinamica']['faixa_db']) <= 5, '±5 dB'),
    ('estéreo (correlação)', fo['estereo']['correlacao'], fn['estereo']['correlacao'], abs(fo['estereo']['correlacao'] - fn['estereo']['correlacao']) <= 0.25, '±0,25'),
    ('voz aguda (mediana MIDI)', fo['voz_aguda']['mediana_midi'], fn['voz_aguda']['mediana_midi'],
     fo['voz_aguda']['mediana_midi'] is None or fn['voz_aguda']['mediana_midi'] is None or abs(fo['voz_aguda']['mediana_midi'] - fn['voz_aguda']['mediana_midi']) <= 4, '±4 semitons'),
    ('decaimento 20 dB (s)', fo['decaimento_20db_s'], fn['decaimento_20db_s'], True, '(informativo)'),
]

# originalidade: n-gramas de 5 intervalos (com sinal) da voz aguda, sem os triviais
def ngramas(notas, n=5):
    iv = [int(b - a) for a, b in zip(notas, notas[1:]) if abs(b - a) < 13]
    g = set()
    for i in range(len(iv) - n + 1):
        t = tuple(iv[i:i + n])
        if len(set(t)) >= 3:          # descarta repetição e vai-e-volta de 2 intervalos
            g.add(t)
    return g
go, gn = ngramas(do['notas']), ngramas(dn['notas'])
comuns = go & gn
taxa = len(comuns) / max(1, len(gn))
linhas.append(('originalidade (n-gramas em comum)', f'{len(go)}', f'{len(gn)} ({100 * taxa:.0f}% em comum)', taxa <= 0.15, '≤15% da nova'))

print(f"\n{os.path.basename(original)} × {os.path.basename(nova)} · pitch {pitch}")
print(f"{'parâmetro':<34}{'original':>16}{'nova':>24}  {'ok':<4}tolerância")
for nome, a, b, ok, tol in linhas:
    print(f"{nome:<34}{str(a):>16}{str(b):>24}  {'✓' if ok else '✗':<4}{tol}")
print(f"acordes mais usados  original: {fo['harmonia']['acordes_mais_usados'][:4]}  nova: {fn['harmonia']['acordes_mais_usados'][:4]}")
print(f"repetição            original: {fo['repeticao']}  nova: {fn['repeticao']}")
ok = sum(1 for l in linhas if l[3])
print(f"{ok}/{len(linhas)} dentro da tolerância")
