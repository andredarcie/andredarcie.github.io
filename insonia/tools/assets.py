"""Gera os gráficos do jogo a partir dos pacotes originais (não versionados).

Uso:  python tools/assets.py <pasta-rtp-png> <pasta-mack>

- <pasta-rtp-png>: PNGs do RTP do RPG Maker VX Ace (RPGVXAce_RTP.zip, assets.rpgmakerweb.com),
  extraídos do Setup-1.bin; os nomes são o índice de ordem no instalador (ex.: 0367_512x512.png).
- <pasta-mack>: tiles do Mack (REFMAP, refmap-l.blog.jp, fsmvx_map.zip): TileA4.png etc.

O jogo de 2014 rodava com tela em tons de cinza (tom do mapa com cinza no máximo), então
todo gráfico de mapa e personagem sai aqui já convertido para cinza. Os termos do Mack só
permitem redistribuir versões editadas; estas são.
"""
import os, sys
from PIL import Image

RTP, MACK = sys.argv[1], sys.argv[2]
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets')

TILES = {
    # RTP VX Ace
    'iA2': 'rtp:0364', 'iA4': 'rtp:0365', 'iA5': 'rtp:0366', 'iB': 'rtp:0367', 'iC': 'rtp:0368',
    'dA2': 'rtp:0358', 'dA4': 'rtp:0359', 'dA5': 'rtp:0360', 'dB': 'rtp:0361', 'dC': 'rtp:0362',
    # Mack
    'mA2': 'mack:TileA2', 'mA4': 'mack:TileA4', 'mA5': 'mack:TileA5', 'mD': 'mack:TileD', 'mE': 'mack:TileE',
}

def acha(spec):
    kind, name = spec.split(':')
    if kind == 'rtp':
        for f in os.listdir(RTP):
            if f.startswith(name + '_'):
                return os.path.join(RTP, f)
        raise FileNotFoundError(spec)
    return os.path.join(MACK, name + '.png')

def cinza(im, chave=False):
    im = im.convert('RGBA')
    if chave:
        # As folhas do Mack usam a cor do pixel (0,0) como transparência (padrão do RPG Maker 2000).
        k = im.getpixel((0, 0))[:3]
        px = im.load()
        for y in range(im.height):
            for x in range(im.width):
                if px[x, y][:3] == k:
                    px[x, y] = (0, 0, 0, 0)
    a = im.getchannel('A')
    g = im.convert('L')
    out = Image.merge('RGBA', (g, g, g, a))
    return out

def main():
    os.makedirs(os.path.join(OUT, 'tiles'), exist_ok=True)
    os.makedirs(os.path.join(OUT, 'chars'), exist_ok=True)
    for nome, spec in TILES.items():
        cinza(Image.open(acha(spec))).save(os.path.join(OUT, 'tiles', nome + '.png'), optimize=True)
        print('tiles', nome)
    # Personagens: folhas do RTP (384x256, 8 personagens de 3x4 quadros de 32x32).
    for f in sorted(os.listdir(RTP)):
        if f.endswith('_384x256.png'):
            idx = f.split('_')[0]
            if idx in CHARS:
                cinza(Image.open(os.path.join(RTP, f))).save(os.path.join(OUT, 'chars', 'r' + idx + '.png'), optimize=True)
                print('char', idx)

    # Personagens do Mack (32x48, dois tiles de altura): fichas 384x384 (8 personagens) e 96x192 (1).
    pasta = os.path.join(MACK, '..', 'chars')
    for f in sorted(os.listdir(pasta)):
        if f.startswith('c0') and f.endswith('.png') and f[:-4] in MACK_CHARS:
            cinza(Image.open(os.path.join(pasta, f)), chave=True).save(os.path.join(OUT, 'chars', 'm' + f[1:]), optimize=True)
            print('mack', f)

    # Folhas de objetos da era VX que o André usava (vêm no Brian's Mansion, brians/projeto):
    # lampião (Other3), ursinhos, mesa de toalha, portas de 2 tiles (!Door3).
    vx = os.path.join(os.path.dirname(__file__), '..', '..', 'brians', 'projeto', 'Graphics', 'Characters')
    for n in ('Other1', 'Other2', 'Other3', '!Door1', '!Door3', 'Chest-1'):
        cinza(Image.open(os.path.join(vx, n + '.png'))).save(os.path.join(OUT, 'chars', 'v' + n.replace('!', '').replace('-', '') + '.png'), optimize=True)
        print('vx', n)

CHARS = set(sys.argv[3].split(',')) if len(sys.argv) > 3 else set()
MACK_CHARS = set(sys.argv[4].split(',')) if len(sys.argv) > 4 else set()

if __name__ == '__main__':
    main()
