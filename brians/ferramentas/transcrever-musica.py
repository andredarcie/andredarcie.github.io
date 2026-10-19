# Transcrição aproximada de uma música (PLANO-MUSICA.md, decisão do André:
# "base igual, melodia nova"): grade de batidas e compassos, linha do baixo
# em semicolcheias, acorde por tempo e a voz aguda (ritmo e contorno), numa
# partitura em texto. A base (baixo, acordes, ritmo, forma) é reproduzida na
# música nova; da melodia só se aproveitam o ritmo e o contorno.
# Uso: python ferramentas/transcrever-musica.py arquivo saida.txt [--bpm N] [--inicio s] [--fim s] [--json saida.json]
import importlib.util, json, os, sys
import numpy as np

sys.stdout.reconfigure(encoding='utf-8')
aqui = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('am', os.path.join(aqui, 'analisar-musica.py'))
am = importlib.util.module_from_spec(spec)
spec.loader.exec_module(am)

SR = am.SR
NOMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
nome = lambda m: f'{NOMES[m % 12]}{m // 12 - 1}'


def espectro(x, n, salto):
    q = np.lib.stride_tricks.sliding_window_view(np.pad(x, (n // 2, n // 2)), n)[::salto] * np.hanning(n)
    return np.abs(np.fft.rfft(q, axis=1)), np.fft.rfftfreq(n, 1 / SR)


def saliencia(esp, freqs, midis, harm=5, peso=0.75):
    # soma de harmônicos (interpolando o módulo nas frequências dos harmônicos)
    s = np.zeros((esp.shape[0], len(midis)))
    for j, m in enumerate(midis):
        f0 = 440 * 2 ** ((m - 69) / 12)
        for h in range(1, harm + 1):
            f = f0 * h
            if f >= SR / 2:
                break
            s[:, j] += peso ** (h - 1) * np.array([np.interp(f, freqs, linha) for linha in esp]) if False else peso ** (h - 1) * np.interp(f, freqs, esp.T.mean(axis=1)) * 0
    return s


def saliencia_rapida(esp, freqs, midis, harm=5, peso=0.75):
    # mesmo que acima, vetorizado: índice fracionário de cada harmônico
    passo = freqs[1] - freqs[0]
    s = np.zeros((esp.shape[0], len(midis)))
    for j, m in enumerate(midis):
        f0 = 440 * 2 ** ((m - 69) / 12)
        for h in range(1, harm + 1):
            f = f0 * h
            if f >= freqs[-1]:
                break
            i = f / passo
            i0 = int(i)
            fr = i - i0
            s[:, j] += peso ** (h - 1) * (esp[:, i0] * (1 - fr) + esp[:, i0 + 1] * fr)
    return s


def principal():
    args = sys.argv[1:]
    opc = lambda n, p=None: args[args.index(n) + 1] if n in args else p
    pos = [a for i, a in enumerate(args) if not a.startswith('--') and (i == 0 or not args[i - 1].startswith('--'))]
    arquivo, saida = pos[0], pos[1]
    x = am.ler(arquivo, 1, 100)
    ini, fim = float(opc('--inicio', 0)), float(opc('--fim', len(x) / SR))
    x = x[int(ini * SR):int(fim * SR)]

    # batidas
    ficha, dados = am.analisar(arquivo, 100)
    bpm = float(opc('--bpm', ficha['andamento']['bpm']))
    n_env, salto_env = 4096, 512
    fps = SR / salto_env
    q = np.lib.stride_tricks.sliding_window_view(x, n_env)[::salto_env] * np.hanning(n_env)
    e = np.abs(np.fft.rfft(q, axis=1))
    fl = np.concatenate([[0], np.maximum(0, np.diff(np.log1p(100 * e), axis=0)).sum(axis=1)])
    env = np.maximum(fl - np.convolve(fl, np.ones(31) / 31, 'same'), 0)
    env /= env.max() + 1e-9
    batidas = am.rastrear(env, fps, bpm) / fps   # segundos (no trecho)
    periodo = 60 / bpm

    # espectros: grave (resolução alta) e agudo
    salto = 128
    eg, fg = espectro(x, 8192, salto)
    ea, fa = espectro(x, 2048, salto)
    tq = np.arange(eg.shape[0]) * salto / SR
    graves = list(range(28, 60))      # E1–B3
    agudos = list(range(55, 96))      # G3–B6
    sg = saliencia_rapida(eg, fg, graves, harm=4)
    sa = saliencia_rapida(ea, fa, agudos, harm=5)
    croma = np.zeros((ea.shape[0], 12))
    for j, m in enumerate(agudos):
        croma[:, m % 12] += sa[:, j]
    for j, m in enumerate(graves):
        croma[:, m % 12] += 0.5 * sg[:, j]
    energia_g = sg.max(axis=1)
    energia_a = sa.max(axis=1)
    lim_g = np.percentile(energia_g, 15)
    lim_a = np.percentile(energia_a, 30)

    # onsets por banda (fluxo), para marcar onde nasce nota
    def fluxo(esp, a, b, f):
        m = (f >= a) & (f < b)
        v = np.concatenate([[0], np.maximum(0, np.diff(np.log1p(50 * esp[:, m]), axis=0)).sum(axis=1)])
        return v / (np.percentile(v, 99) + 1e-9)
    on_g = fluxo(eg, 40, 300, fg)
    on_a = fluxo(ea, 300, 4000, fa)

    # grade de semicolcheias a partir das batidas
    passos = []
    for b0, b1 in zip(batidas[:-1], batidas[1:]):
        for k in range(4):
            passos.append(b0 + (b1 - b0) * k / 4)
    passos.append(batidas[-1])
    passos = np.array(passos)

    # acento do primeiro tempo: a fase do compasso com mais ataque grave
    def em(t):
        return min(len(tq) - 1, int(t * SR / salto))
    fases = [sum(on_g[em(batidas[i])] for i in range(f, len(batidas), 4)) for f in range(4)]
    fase = int(np.argmax(fases))

    TEMPLATES = []
    for r in range(12):
        for suf, iv in (('', (0, 4, 7)), ('m', (0, 3, 7)), ('7', (0, 4, 7, 10)), ('m7', (0, 3, 7, 10)), ('dim', (0, 3, 6)), ('aug', (0, 4, 8))):
            v = np.zeros(12); v[[(r + i) % 12 for i in iv]] = 1
            TEMPLATES.append((NOMES[r] + suf, v / np.linalg.norm(v), r))

    linhas, dados_json = [], []
    total_compassos = (len(passos) - 1 - fase * 4) // 16
    for c in range(total_compassos):
        baixo, mel, acordes = [], [], []
        for k in range(16):
            i = fase * 4 + c * 16 + k
            a, b = em(passos[i]), max(em(passos[i]) + 1, em(passos[i + 1]))
            meio = slice(a + (b - a) // 4, max(a + (b - a) // 4 + 1, b))
            gb = sg[meio].mean(axis=0)
            ga = sa[meio].mean(axis=0)
            ataque_g = on_g[a:min(b, a + 4)].max() > 0.25
            ataque_a = on_a[a:min(b, a + 4)].max() > 0.25
            nb = graves[int(np.argmax(gb))] if gb.max() > lim_g else None
            na = agudos[int(np.argmax(ga))] if ga.max() > lim_a else None
            baixo.append((nb, ataque_g))
            mel.append((na, ataque_a))
        for bt in range(4):
            i = fase * 4 + c * 16 + bt * 4
            a, b = em(passos[i]), em(passos[i + 4])
            cr = croma[a:b].mean(axis=0)
            cr = cr / (np.linalg.norm(cr) + 1e-9)
            acordes.append(max(TEMPLATES, key=lambda t: float(cr @ t[1]))[0])

        def texto(seq):
            out, ant = [], None
            for m, at in seq:
                if m is None:
                    out.append('.'); ant = None
                elif m == ant and not at:
                    out.append('-')
                else:
                    out.append(nome(m)); ant = m
            return ' '.join(f'{s:>4}' for s in out)
        t0 = passos[fase * 4 + c * 16] + ini
        linhas.append(f'c{c + 1:02d} {t0:6.2f}s | acordes {" ".join(f"{a:>5}" for a in acordes)}')
        linhas.append(f'      baixo   {texto(baixo)}')
        linhas.append(f'      agudo   {texto(mel)}')
        dados_json.append({'compasso': c + 1, 'inicio_s': round(t0, 3), 'acordes': acordes,
                           'baixo': [[m, bool(at)] for m, at in baixo], 'agudo': [[m, bool(at)] for m, at in mel]})
    # --ciclo N: média de todas as repetições de um ciclo de N compassos (a
    # partir de --ciclo-inicio, em compassos), posição por posição. O nome da
    # nota vem da soma de harmônicos; a oitava, de onde a fundamental tem energia
    # (evita o erro de sub-harmônico). Força 0–9 = presença do ataque.
    ciclo = int(opc('--ciclo', 0))
    if ciclo:
        c0 = int(opc('--ciclo-inicio', 0))
        reps = list(range(c0, total_compassos - ciclo + 1, ciclo))
        passo_hz = fg[1] - fg[0]
        fund = lambda m, linha: linha[int(440 * 2 ** ((m - 69) / 12) / passo_hz)]
        medio_b, medio_a, medio_ac = [], [], []
        for p in range(ciclo * 16):
            sgs, egs, ons, sas = [], [], [], []
            for r in reps:
                i = fase * 4 + r * 16 + p
                a, b = em(passos[i]), max(em(passos[i]) + 1, em(passos[i + 1]))
                meio = slice(a + (b - a) // 4, max(a + (b - a) // 4 + 1, b))
                sgs.append(sg[meio].mean(axis=0)); egs.append(eg[meio].mean(axis=0)); sas.append(sa[meio].mean(axis=0))
                ons.append(on_g[a:min(b, a + 4)].max())
            g = np.mean(sgs, axis=0); espm = np.mean(egs, axis=0); am_ = np.mean(sas, axis=0)
            classe = np.zeros(12)
            for j, m in enumerate(graves):
                classe[m % 12] += g[j]
            pc = int(np.argmax(classe))
            oitavas = [m for m in graves if m % 12 == pc]
            m = max(oitavas, key=lambda mm: fund(mm, espm))
            forte = classe.max() / (classe.sum() + 1e-9)
            medio_b.append((m, float(np.mean(ons)), forte))
            medio_a.append(agudos[int(np.argmax(am_))])
        for bt in range(ciclo * 4):
            crs = []
            for r in reps:
                i = fase * 4 + r * 16 + bt * 4
                crs.append(croma[em(passos[i]):em(passos[i + 4])].mean(axis=0))
            cr = np.mean(crs, axis=0); cr = cr / (np.linalg.norm(cr) + 1e-9)
            medio_ac.append(max(TEMPLATES, key=lambda t: float(cr @ t[1]))[0])
        linhas.append('')
        linhas.append(f'== ciclo médio de {ciclo} compassos ({len(reps)} repetições, a partir do compasso {c0 + 1}); força do ataque 0–9')
        for c in range(ciclo):
            linhas.append(f'cc{c + 1} | acordes {" ".join(f"{a:>5}" for a in medio_ac[c * 4:(c + 1) * 4])}')
            linhas.append('      baixo   ' + ' '.join(f'{nome(m):>4}' for m, _, _ in medio_b[c * 16:(c + 1) * 16]))
            linhas.append('      ataque  ' + ' '.join(f'{min(9, int(o * 10)):>4}' for _, o, _ in medio_b[c * 16:(c + 1) * 16]))
            linhas.append('      agudo   ' + ' '.join(f'{nome(m):>4}' for m in medio_a[c * 16:(c + 1) * 16]))
    cab = [f'{os.path.basename(arquivo)} · {bpm:.1f} BPM · {total_compassos} compassos · semicolcheias ("-" = segura, "." = silêncio)']
    open(saida, 'w', encoding='utf-8').write('\n'.join(cab + linhas) + '\n')
    if opc('--json'):
        json.dump({'bpm': bpm, 'compassos': dados_json}, open(opc('--json'), 'w', encoding='utf-8'))
    print('\n'.join(cab + linhas[:30]))


principal()
