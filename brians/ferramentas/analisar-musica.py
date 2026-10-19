# Ficha musical de um arquivo de áudio (PLANO-MUSICA.md, etapa A): os
# parâmetros que a música nova tem de seguir, sem as notas da melodia.
#   andamento (candidatos e batidas), compasso e swing, tom e modo, notas fora
#   da escala, acordes estimados por compasso e ritmo harmônico, registro e
#   intervalos da voz mais aguda (estatística, não a melodia), energia por
#   banda, timbre, dinâmica, estéreo e o período de repetição (loop).
# Gera <saida>.json e as imagens <saida>-espectro.png, -croma.png, -estrutura.png.
# Uso: python ferramentas/analisar-musica.py arquivo saida [--pitch 50]
#   --pitch: analisa como o jogo toca (velocidade e altura × pitch/100)
# Só numpy/scipy; o áudio é lido pelo ffmpeg.
import json, subprocess, sys, zlib, struct
import numpy as np
sys.stdout.reconfigure(encoding='utf-8')
from scipy import signal

SR = 22050
NOTAS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
MAIOR = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
MENOR = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])


def taxa(caminho):
    r = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=sample_rate', '-of', 'csv=p=0', caminho],
                       capture_output=True, text=True, check=True).stdout.strip()
    return int(r.split(',')[0])


def ler(caminho, canais, pitch):
    # pitch como o RGSS: muda a velocidade (e a altura) por pitch/100
    r = taxa(caminho)
    filtro = [] if pitch == 100 else ['-af', f'asetrate={r * pitch / 100:.0f},aresample={r}']
    bruto = subprocess.run(['ffmpeg', '-v', 'error', '-i', caminho, *filtro, '-ac', str(canais), '-ar', str(SR), '-f', 'f32le', '-'],
                           capture_output=True, check=True).stdout
    x = np.frombuffer(bruto, dtype=np.float32).astype(np.float64)
    return x.reshape(-1, canais) if canais > 1 else x


# ------------------------------------------------------------------ imagens (PNG sem dependências)
def png(caminho, rgb):
    h, w, _ = rgb.shape
    linhas = b''.join(b'\x00' + rgb[i].astype(np.uint8).tobytes() for i in range(h))
    def bloco(tipo, dados):
        return struct.pack('>I', len(dados)) + tipo + dados + struct.pack('>I', zlib.crc32(tipo + dados) & 0xffffffff)
    with open(caminho, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n' + bloco(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0))
                + bloco(b'IDAT', zlib.compress(linhas, 9)) + bloco(b'IEND', b''))


PALETA = np.array([[0, 0, 4], [40, 11, 84], [101, 21, 110], [159, 42, 99], [212, 72, 66], [245, 125, 21], [250, 193, 39], [252, 255, 164]], float)


def cores(v):
    v = np.clip(v, 0, 1) * (len(PALETA) - 1)
    i = np.minimum(v.astype(int), len(PALETA) - 2)
    f = (v - i)[..., None]
    return PALETA[i] * (1 - f) + PALETA[i + 1] * f


def ampliar(m, sy, sx):
    return np.repeat(np.repeat(m, sy, axis=0), sx, axis=1)


# ------------------------------------------------------------------ análise
def analisar(caminho, pitch=100):
    x = ler(caminho, 1, pitch)
    est = ler(caminho, 2, pitch)
    dur = len(x) / SR
    n, salto = 4096, 512
    fps = SR / salto
    quadros = np.lib.stride_tricks.sliding_window_view(x, n)[::salto] * np.hanning(n)
    esp = np.abs(np.fft.rfft(quadros, axis=1))
    freqs = np.fft.rfftfreq(n, 1 / SR)
    p = esp ** 2
    total = p.sum() + 1e-12

    # --- envelope de ataques e andamento (com desempate de oitava)
    logesp = np.log1p(100 * esp)
    fluxo = np.maximum(0, np.diff(logesp, axis=0)).sum(axis=1)
    fluxo = np.concatenate([[0], fluxo])
    env = fluxo - signal.medfilt(fluxo, 31)
    env = np.maximum(env, 0)
    env /= env.max() + 1e-9
    ac = np.correlate(env, env, 'full')[len(env) - 1:]
    candidatos = []
    for bpm in np.arange(55, 200.5, 0.5):
        periodo = 60 * fps / bpm
        # pente: soma da autocorrelação nos múltiplos do período
        s = sum(np.interp(k * periodo, np.arange(len(ac)), ac) / k ** 0.3 for k in range(1, 9) if k * periodo < len(ac))
        candidatos.append((s, bpm))
    candidatos.sort(reverse=True)
    topo = []
    for s, b in candidatos:
        if all(abs(b - t) / t > 0.04 for _, t in topo):
            topo.append((s, b))
        if len(topo) == 4:
            break
    # entre o melhor e seu dobro/metade, fica o que tem batida mais regular
    def regularidade(bpm):
        batidas = rastrear(env, fps, bpm)
        if len(batidas) < 8:
            return 0
        return float(np.mean(env[batidas]))
    base = topo[0][1]
    opcoes = [b for b in (base / 2, base, base * 2) if 55 <= b <= 200]
    tempo = max(opcoes, key=lambda b: regularidade(b) * (1.0 if 70 <= b <= 160 else 0.85))
    batidas = rastrear(env, fps, tempo)
    tempos_batida = batidas / fps

    # --- swing: onde caem os ataques entre duas batidas (0,5 = reto; ~0,67 = swing)
    fase = []
    picos, _ = signal.find_peaks(env, height=0.25, distance=int(fps * 0.06))
    for pk in picos:
        i = np.searchsorted(batidas, pk) - 1
        if 0 <= i < len(batidas) - 1:
            f = (pk - batidas[i]) / (batidas[i + 1] - batidas[i])
            if 0.3 < f < 0.85:
                fase.append(f)
    swing = float(np.median(fase)) if fase else None

    # --- croma geral e por batida (mais o croma do baixo)
    validos = (freqs > 60) & (freqs < 2500)
    midi = 69 + 12 * np.log2(np.maximum(freqs, 1e-3) / 440)
    classe = np.round(midi).astype(int) % 12
    def croma(bloco, mascara):
        e = bloco[:, mascara]
        c = np.stack([e[:, classe[mascara] == k].sum(axis=1) for k in range(12)], axis=1)
        return c
    grave = (freqs > 35) & (freqs < 250)
    cr = croma(p, validos)
    crb = croma(p, grave)
    geral = cr.sum(axis=0)
    geral /= geral.max()
    tons = []
    for k in range(12):
        tons.append((float(np.corrcoef(np.roll(MAIOR, k), geral)[0, 1]), NOTAS[k], 'maior', k))
        tons.append((float(np.corrcoef(np.roll(MENOR, k), geral)[0, 1]), NOTAS[k], 'menor', k))
    tons.sort(reverse=True)
    _, tonica_nome, modo, tonica = tons[0]
    escala = [0, 2, 4, 5, 7, 9, 11] if modo == 'maior' else [0, 2, 3, 5, 7, 8, 10]
    fora = [(NOTAS[(tonica + i) % 12], round(float(geral[(tonica + i) % 12]), 2)) for i in range(12)
            if i not in escala and geral[(tonica + i) % 12] > 0.35]

    # por batida
    def sincronizar(m):
        cortes = np.concatenate([[0], batidas, [len(m)]])
        return np.stack([m[a:b].mean(axis=0) if b > a else np.zeros(m.shape[1]) for a, b in zip(cortes[:-1], cortes[1:])])
    cr_b = sincronizar(cr)
    cr_b = cr_b / (cr_b.max(axis=1, keepdims=True) + 1e-12)
    crb_b = sincronizar(crb)

    # --- acordes estimados por compasso (4 batidas): tríades maiores/menores
    tpl = []
    for r in range(12):
        for nome, ints in (('', (0, 4, 7)), ('m', (0, 3, 7))):
            v = np.zeros(12)
            v[[(r + i) % 12 for i in ints]] = 1
            tpl.append((NOTAS[r] + nome, v / np.linalg.norm(v), r))
    compassos = []
    for i in range(0, len(cr_b) - 3, 4):
        c = cr_b[i:i + 4].sum(axis=0)
        cb = crb_b[i:i + 4].sum(axis=0)
        c = c / (np.linalg.norm(c) + 1e-12)
        melhor = max(tpl, key=lambda t: float(c @ t[1]) + 0.15 * (cb[t[2]] / (cb.max() + 1e-12)))
        compassos.append(melhor[0])
    trocas = sum(1 for a, b in zip(compassos, compassos[1:]) if a != b)
    graus = {}
    for a in compassos:
        graus[a] = graus.get(a, 0) + 1

    # --- voz mais aguda: registro e intervalos (estatística, não as notas)
    banda = (freqs > 200) & (freqs < 2000)
    pico = np.argmax(esp[:, banda], axis=1)
    f0 = freqs[banda][pico]
    forte = esp[:, banda].max(axis=1)
    sonoro = forte > np.percentile(forte, 60)
    m0 = np.round(69 + 12 * np.log2(f0 / 440)).astype(int)
    notas = []
    ultimo = None
    for k in range(len(m0)):
        if not sonoro[k]:
            ultimo = None
            continue
        if ultimo is None or m0[k] != ultimo:
            notas.append(m0[k])
            ultimo = m0[k]
    notas = np.array(notas)
    intervalos = np.abs(np.diff(notas)) if len(notas) > 1 else np.array([0])
    intervalos = intervalos[intervalos < 13]
    voz = {
        'extensao_midi': [int(np.percentile(notas, 5)), int(np.percentile(notas, 95))] if len(notas) else None,
        'mediana_midi': int(np.median(notas)) if len(notas) else None,
        'grau_conjunto_%': round(100 * float(np.mean(intervalos <= 2)), 1) if len(intervalos) else None,
        'saltos_%': round(100 * float(np.mean(intervalos >= 5)), 1) if len(intervalos) else None,
        'notas_por_batida': round(len(notas) / max(1, len(batidas)), 2),
    }

    # --- bandas, timbre, dinâmica, estéreo
    def faixa(a, b):
        return round(100 * float(p[:, (freqs >= a) & (freqs < b)].sum() / total), 1)
    bandas = {'sub_<60': faixa(0, 60), 'grave_60-250': faixa(60, 250), 'medio_250-2k': faixa(250, 2000),
              'agudo_2k-6k': faixa(2000, 6000), 'ar_>6k': faixa(6000, SR / 2)}
    centroide = float((p * freqs).sum() / total)
    plano = np.exp(np.mean(np.log(p[:, 5:] + 1e-12), axis=1)) / (np.mean(p[:, 5:], axis=1) + 1e-12)
    rms = np.sqrt((quadros ** 2).mean(axis=1))
    db = 20 * np.log10(rms + 1e-9)
    silencio = float(np.mean(db < np.percentile(db, 95) - 30))
    correl = float(np.corrcoef(est[:, 0], est[:, 1])[0, 1]) if est[:, 0].std() > 0 and est[:, 1].std() > 0 else 1.0
    lado = float(np.sqrt(np.mean((est[:, 0] - est[:, 1]) ** 2) / (np.mean((est[:, 0] + est[:, 1]) ** 2) + 1e-12)))

    # decaimento depois dos ataques fortes (eco/reverb aparente)
    caidas = []
    for pk in picos[env[picos] > 0.5]:
        seg = db[pk: pk + int(fps * 1.5)]
        if len(seg) > 10:
            alvo = seg[0] - 20
            abaixo = np.nonzero(seg < alvo)[0]
            caidas.append(abaixo[0] / fps if len(abaixo) else 1.5)
    decaimento = round(float(np.median(caidas)), 2) if caidas else None

    # --- estrutura: autossimilaridade por compasso e período de repetição
    nb = len(cr_b) // 4
    barras = np.stack([np.concatenate([cr_b[i * 4:(i + 1) * 4].mean(axis=0), crb_b[i * 4:(i + 1) * 4].mean(axis=0) / (crb_b.max() + 1e-12)]) for i in range(nb)]) if nb else np.zeros((1, 24))
    barras = barras / (np.linalg.norm(barras, axis=1, keepdims=True) + 1e-12)
    ss = barras @ barras.T
    periodo = None
    if nb > 8:
        diag = [float(np.mean(np.diag(ss, k))) for k in range(1, nb // 2 + 1)]
        k = int(np.argmax(diag[3:])) + 4 if len(diag) > 4 else None
        if k:
            periodo = {'compassos': k, 'segundos': round(k * 4 * 60 / tempo, 1), 'semelhanca': round(diag[k - 1], 2)}

    ficha = {
        'arquivo': caminho.replace('\\', '/').split('/')[-1], 'pitch': pitch, 'duracao_s': round(dur, 1),
        'andamento': {'bpm': round(tempo, 1), 'candidatos': [round(b, 1) for _, b in topo], 'batidas': len(batidas),
                      'regularidade': round(regularidade(tempo), 2), 'swing_fase': round(swing, 2) if swing else None},
        'tom': {'tonica': tonica_nome, 'modo': modo, 'confianca': round(tons[0][0], 2),
                'alternativas': [f'{t[1]} {t[2]} ({t[0]:.2f})' for t in tons[1:4]],
                'croma': {NOTAS[k]: round(float(geral[k]), 2) for k in range(12)}, 'fora_da_escala': fora},
        'harmonia': {'compassos': len(compassos), 'trocas_por_compasso': round(trocas / max(1, len(compassos) - 1), 2),
                     'acordes_mais_usados': sorted(graus.items(), key=lambda kv: -kv[1])[:6]},
        'voz_aguda': voz,
        'bandas_%': bandas,
        'timbre': {'centroide_hz': round(centroide), 'planicidade': round(float(np.median(plano)), 3)},
        'ataques_por_s': round(len(picos) / dur, 2),
        'dinamica': {'rms_db_mediana': round(float(np.median(db)), 1), 'faixa_db': round(float(np.percentile(db, 95) - np.percentile(db, 10)), 1),
                     'silencio_%': round(100 * silencio, 1)},
        'estereo': {'correlacao': round(correl, 2), 'largura': round(lado, 2)},
        'decaimento_20db_s': decaimento,
        'repeticao': periodo,
    }
    return ficha, {'esp': esp, 'freqs': freqs, 'fps': fps, 'cr_b': cr_b, 'ss': ss, 'batidas': batidas, 'notas': notas}


def rastrear(env, fps, bpm, rigidez=100):
    # programação dinâmica de Ellis: batidas fortes com espaçamento perto do período
    periodo = 60 * fps / bpm
    n = len(env)
    pont = env.copy()
    ant = np.full(n, -1)
    for t in range(n):
        a, b = int(t - 2 * periodo), int(t - periodo / 2)
        if b <= 0:
            continue
        a = max(a, 0)
        j = np.arange(a, b)
        custo = -rigidez * np.log((t - j) / periodo) ** 2
        k = int(np.argmax(pont[j] + custo))
        pont[t] = env[t] + pont[j[k]] + custo[k]
        ant[t] = j[k]
    t = int(np.argmax(pont[-int(periodo * 2):])) + n - int(periodo * 2)
    batidas = []
    while t >= 0:
        batidas.append(t)
        t = ant[t]
    return np.array(batidas[::-1])


def imagens(saida, dados):
    esp, freqs, fps = dados['esp'], dados['freqs'], dados['fps']
    # espectrograma: 30 Hz–8 kHz em escala log, ~ 8 px por segundo
    alvo = np.geomspace(30, 8000, 240)
    idx = np.searchsorted(freqs, alvo).clip(0, len(freqs) - 1)
    passo = max(1, int(fps / 8))
    m = np.log1p(esp[::passo][:, idx]).T[::-1]
    m = (m - np.percentile(m, 5)) / (np.percentile(m, 99.5) - np.percentile(m, 5) + 1e-9)
    png(f'{saida}-espectro.png', cores(m))
    # croma por batida (12 linhas, Dó embaixo)
    c = dados['cr_b'].T[::-1]
    png(f'{saida}-croma.png', cores(ampliar(c, 10, 3)))
    # estrutura: autossimilaridade por compasso
    s = dados['ss']
    s = (s - s.min()) / (s.max() - s.min() + 1e-9)
    png(f'{saida}-estrutura.png', cores(ampliar(s, 4, 4)))


if __name__ == '__main__':
    args = sys.argv[1:]
    pitch = int(args[args.index('--pitch') + 1]) if '--pitch' in args else 100
    arquivo, saida = [a for i, a in enumerate(args) if not a.startswith('--') and (i == 0 or args[i - 1] != '--pitch')][:2]
    ficha, dados = analisar(arquivo, pitch)
    json.dump(ficha, open(f'{saida}.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    imagens(saida, dados)
    print(json.dumps(ficha, ensure_ascii=False))
