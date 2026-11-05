"""Gera assets/tiles/xA.png: tiles que não estão em nenhum pacote (recortados das capturas
de 2014 em games/insomnia/img e limpos) e marcadores desenhados à mão.

Uso: python tools/extras.py
"""
import os
import numpy as np
from PIL import Image, ImageDraw

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.join(AQUI, '..', '..')
OUT = os.path.join(AQUI, '..', 'assets', 'tiles', 'xA.png')


def captura(n):
    """Captura original (800x600) levada ao espaço do jogo (544x416)."""
    im = Image.open(os.path.join(RAIZ, 'games', 'insomnia', 'img', f'Image {n}-min.png')).convert('L')
    g = Image.new('L', (544, 416))
    g.paste(im.resize((round(800 / 1.52), round(600 / 1.53)), Image.LANCZOS), (10, 10))
    return np.asarray(g, dtype=np.float32)


def decalque(src, x, y, limiar, ganho, base=170):
    """Tile 32x32 da captura vira decalque: o que é mais claro que o piso vira traço opaco."""
    q = src[y:y + 32, x:x + 32]
    a = np.clip((q - limiar) * ganho, 0, 255).astype(np.uint8)
    rgb = np.full((32, 32), base, np.uint8)
    return Image.merge('RGBA', [Image.fromarray(rgb)] * 3 + [Image.fromarray(a)])


def main():
    S = Image.new('RGBA', (256, 256), (0, 0, 0, 0))
    cela = captura(1)
    # (0,0) e (1,0): os rabiscos/manchas do chão da cela
    S.paste(decalque(cela, 11 * 32, 9 * 32, 30, 7), (0, 0))
    S.paste(decalque(cela, 11 * 32, 8 * 32, 30, 7), (32, 0))
    # (2,0): marcador de saída ▽ (contorno claro), na metade de baixo do tile
    d = ImageDraw.Draw(S)
    ox, oy = 64, 0
    d.polygon([(ox + 12, oy + 20), (ox + 20, oy + 20), (ox + 16, oy + 25)], outline=(235, 235, 235, 255))
    # (3,0): ▷ e (4,0): ◁ (saídas laterais)
    ox = 96
    d.polygon([(ox + 14, oy + 12), (ox + 14, oy + 20), (ox + 19, oy + 16)], outline=(235, 235, 235, 255))
    ox = 128
    d.polygon([(ox + 18, oy + 12), (ox + 18, oy + 20), (ox + 13, oy + 16)], outline=(235, 235, 235, 255))
    # (5,0): △
    ox = 160
    d.polygon([(ox + 12, oy + 25), (ox + 20, oy + 25), (ox + 16, oy + 20)], outline=(235, 235, 235, 255))
    # (6,0): lâmpada de parede (núcleo claro com grade)
    ox = 192
    d.rectangle([ox + 11, oy + 9, ox + 21, oy + 20], fill=(205, 205, 205, 255))
    for xx in (14, 18):
        d.line([(ox + xx, oy + 10), (ox + xx, oy + 20)], fill=(150, 150, 150, 255))
    d.rectangle([ox + 13, oy + 6, ox + 19, oy + 9], fill=(120, 120, 120, 255))
    d.line([(ox + 11, oy + 20), (ox + 21, oy + 20)], fill=(160, 160, 160, 255))
    # (7,0): a carta no chão (papel claro inclinado, ~10x7)
    ox = 224
    d.polygon([(ox + 9, oy + 12), (ox + 17, oy + 7), (ox + 22, oy + 13), (ox + 14, oy + 18)], fill=(250, 250, 250, 255))
    d.line([(ox + 10, oy + 12), (ox + 16, oy + 14), (ox + 21, oy + 12)], fill=(190, 190, 190, 255))
    canos(d)
    # (4,1)-(5,2): biombo de cortina (quarto 2), recortado da captura 6 e "destonalizado" (+60)
    S.paste(recorte(6, 9 * 32, 6 * 32 + 2, 64, 62, 60), (128, 34))
    # (6,1): a grade de ventilação (quadro parado da folha de objetos do RTP), como tile de parede
    g = Image.open(os.path.join(AQUI, '..', 'assets', 'chars', 'r0281.png')).convert('RGBA').crop((0, 0, 32, 32))
    S.alpha_composite(g, (192, 32))
    # (7,1)-(7,2): pia + vaso sanitário (recorte da captura 10, o branco vira opaco)
    S.paste(decalque_alto(captura(10), 3 * 32, 3 * 32 + 6, 64, 18, 6), (224, 32))
    # (6,2): pia do espelho; (5,3),(6,3),(7,3),(4,3): números rabiscados nas cabines (1, 2, 6, 4)
    S.paste(decalque_alto(captura(10), 15 * 32, 6 * 32 + 6, 32, 18, 6), (192, 64))
    for i, n in enumerate('1264'):
        rabisco_numero(d, 128 + i * 32, 96, n)
    nicho(d, 0, 64)
    # (2,4): dois papéis pregados na parede (corredor, ponta esquerda)
    d.rectangle([64 + 6, 128 + 6, 64 + 21, 128 + 21], fill=(232, 232, 232, 255), outline=(150, 150, 150, 255))
    for yy in (11, 14, 17):
        d.line([(64 + 9, 128 + yy), (64 + 18, 128 + yy)], fill=(160, 160, 160, 255))
    d.rectangle([64 + 19, 128 + 14, 64 + 29, 128 + 27], fill=(215, 215, 215, 255), outline=(140, 140, 140, 255))
    # (3,4)-(3,5): batente claro e estreito (passagem do banheiro)
    for i in range(7):
        v = int(150 + 90 * (1 - abs(i - 3) / 3.5))
        d.line([(96 + 21 + i, 128 + 12), (96 + 21 + i, 128 + 60)], fill=(v, v, v, 255))
    # (4,4): cano horizontal no rodapé; (5,4): o mesmo com registro (sala de descanso)
    for ox in (128, 160):
        d.rectangle([ox, 128 + 14, ox + 31, 128 + 18], fill=(60, 60, 60, 255))
        d.line([(ox, 128 + 15), (ox + 31, 128 + 15)], fill=(235, 235, 235, 255))
        d.line([(ox, 128 + 16), (ox + 31, 128 + 16)], fill=(190, 190, 190, 255))
    d.rectangle([160 + 10, 128 + 9, 160 + 21, 128 + 21], fill=(90, 90, 90, 255), outline=(200, 200, 200, 255))
    d.rectangle([160 + 13, 128 + 12, 160 + 18, 128 + 18], fill=(130, 130, 130, 255))
    # (6,4)-(6,5): divisória fina entre as cabines do banheiro
    for yy in range(128 + 2, 128 + 62):
        d.point((192 + 18, yy), fill=(200, 200, 200, 255)); d.point((192 + 19, yy), fill=(120, 120, 120, 255))
        d.point((192 + 17, yy), fill=(70, 70, 70, 255))
    # (0,6)-(2,7) e (3,6)-(5,7): cano em L do corredor final (para a esquerda e espelhado)
    cano_L(d, 0, 192, False)
    cano_L(d, 96, 192, True)
    # (1,4)-(1,5): porta arredondada de tábuas (!Door3 da era VX, 2 tiles) com a janelinha
    # escura que as capturas de 2014 mostram
    pr = Image.open(os.path.join(AQUI, '..', 'assets', 'chars', 'vDoor3.png')).convert('RGBA').crop((192, 0, 224, 64))
    S.paste(Image.new('RGBA', (32, 64), (0, 0, 0, 0)), (32, 128))
    S.alpha_composite(pr, (32, 128))
    d.rectangle([32 + 10, 128 + 15, 32 + 21, 128 + 20], fill=(38, 38, 38, 255), outline=(20, 20, 20, 255))
    # (7,4): respiro da cela = grade do Mack (TileD 7,5) subida 10 px, como na captura 1
    md = Image.open(os.path.join(AQUI, '..', 'assets', 'tiles', 'mD.png')).convert('RGBA')
    S.alpha_composite(md.crop((224, 170, 256, 192)), (224, 128))
    # (7,6): espelho do banheiro (retângulo cinza claro com moldura, captura 10)
    ox, oy = 224, 192
    d.rectangle([ox + 6, oy + 3, ox + 26, oy + 30], fill=(70, 70, 70, 255))
    for yy in range(oy + 5, oy + 29):
        v = 175 + int(25 * (yy - oy - 5) / 24)
        d.line([(ox + 8, yy), (ox + 24, yy)], fill=(v, v, v, 255))
    d.line([(ox + 10, oy + 22), (ox + 22, oy + 10)], fill=(215, 215, 215, 255))
    # (6,6): a caixa do código (tampa clara emoldurada, fecho e corpo escuro)
    ox, oy = 192, 192
    d.rectangle([ox + 6, oy + 6, ox + 25, oy + 27], fill=(45, 45, 45, 255), outline=(25, 25, 25, 255))
    d.rectangle([ox + 5, oy + 5, ox + 26, oy + 14], fill=(215, 215, 215, 255), outline=(120, 120, 120, 255))
    d.rectangle([ox + 8, oy + 7, ox + 23, oy + 12], fill=(170, 170, 170, 255))
    d.rectangle([ox + 14, oy + 15, ox + 17, oy + 17], fill=(200, 200, 200, 255))
    d.line([(ox + 8, oy + 21), (ox + 23, oy + 21)], fill=(70, 70, 70, 255))
    # (3,3): alavanca no chão (sala que gira)
    d.line([(96 + 10, 96 + 24), (96 + 20, 96 + 12)], fill=(220, 220, 220, 255), width=2)
    d.ellipse([96 + 18, 96 + 9, 96 + 23, 96 + 14], fill=(240, 240, 240, 255))
    d.rectangle([96 + 7, 96 + 23, 96 + 14, 96 + 26], fill=(120, 120, 120, 255))
    # (2,3): placa de pressão quase invisível (armadilha)
    d.rectangle([64 + 6, 96 + 8, 64 + 25, 96 + 23], outline=(60, 60, 60, 120))
    # (1,3): goteira (gotas claras caindo, padrão do corredor do salão)
    for gx, gy in ((5, 4), (13, 9), (21, 3), (27, 10), (9, 18), (17, 20), (25, 19), (3, 24)):
        x0, y0 = 32 + gx, 96 + gy
        d.ellipse([x0, y0 + 2, x0 + 3, y0 + 6], fill=(235, 235, 235, 255))
        d.point((x0 + 1, y0 + 1), fill=(235, 235, 235, 255))
    # hospital do flashback (conferido com o trailer, 7:10): porta de duas almofadas com verga
    # e maçaneta à esquerda (2,5)-(2,6), abajur de pé (4,5)-(4,6) e lixeira branca (7,5)
    porta_hospital(d, 64, 160)
    abajur(d, 128, 160)
    lixeira(d, 224, 160)
    S.save(OUT, optimize=True)


def almofada(d, x0, y0, x1, y1):
    """Almofada rebaixada de porta: sombra em cima/à esquerda, luz embaixo/à direita."""
    d.rectangle([x0, y0, x1, y1], fill=(70, 70, 70, 255))
    d.line([(x0, y0), (x1, y0)], fill=(42, 42, 42, 255)); d.line([(x0, y0), (x0, y1)], fill=(42, 42, 42, 255))
    d.line([(x0, y1), (x1, y1)], fill=(112, 112, 112, 255)); d.line([(x1, y0), (x1, y1)], fill=(112, 112, 112, 255))
    d.rectangle([x0 + 3, y0 + 3, x1 - 3, y1 - 3], outline=(86, 86, 86, 255))


def porta_hospital(d, ox, oy):
    # verga clara no alto
    d.rectangle([ox + 1, oy, ox + 30, oy + 6], fill=(150, 150, 150, 255))
    d.line([(ox + 1, oy + 1), (ox + 30, oy + 1)], fill=(190, 190, 190, 255))
    d.line([(ox + 1, oy + 6), (ox + 30, oy + 6)], fill=(88, 88, 88, 255))
    # batente escuro e folha da porta
    d.rectangle([ox + 3, oy + 7, ox + 28, oy + 63], fill=(52, 52, 52, 255))
    d.rectangle([ox + 5, oy + 9, ox + 26, oy + 63], fill=(82, 82, 82, 255))
    d.line([(ox + 5, oy + 9), (ox + 26, oy + 9)], fill=(104, 104, 104, 255))
    almofada(d, ox + 8, oy + 12, ox + 23, oy + 33)
    almofada(d, ox + 8, oy + 40, ox + 23, oy + 60)
    # maçaneta (à esquerda, na altura da travessa)
    d.rectangle([ox + 6, oy + 35, ox + 8, oy + 38], fill=(205, 205, 205, 255))
    d.point((ox + 8, oy + 38), fill=(120, 120, 120, 255))


def abajur(d, ox, oy):
    # cúpula: tigela clara com a boca escura em cima e uma faixa de brilho
    d.ellipse([ox + 7, oy + 3, ox + 24, oy + 21], fill=(206, 206, 206, 255), outline=(92, 92, 92, 255))
    d.ellipse([ox + 9, oy + 2, ox + 22, oy + 8], fill=(74, 74, 74, 255), outline=(150, 150, 150, 255))
    d.line([(ox + 10, oy + 12), (ox + 21, oy + 12)], fill=(240, 240, 240, 255))
    d.line([(ox + 11, oy + 17), (ox + 20, oy + 17)], fill=(170, 170, 170, 255))
    # haste
    d.rectangle([ox + 14, oy + 21, ox + 17, oy + 24], fill=(140, 140, 140, 255))
    d.rectangle([ox + 15, oy + 24, ox + 16, oy + 56], fill=(190, 190, 190, 255))
    d.line([(ox + 14, oy + 24), (ox + 14, oy + 56)], fill=(96, 96, 96, 255))
    d.line([(ox + 17, oy + 24), (ox + 17, oy + 56)], fill=(130, 130, 130, 255))
    # base redonda
    d.ellipse([ox + 8, oy + 53, ox + 23, oy + 62], fill=(118, 118, 118, 255), outline=(58, 58, 58, 255))
    d.arc([ox + 9, oy + 54, ox + 22, oy + 60], 190, 350, fill=(196, 196, 196, 255))


def lixeira(d, ox, oy):
    # cilindro branco com a tampa clara (canto de baixo à esquerda do hospital)
    d.ellipse([ox + 7, oy + 26, ox + 25, oy + 31], fill=(120, 120, 120, 255))
    for x in range(ox + 7, ox + 26):
        t = (x - ox - 7) / 18
        v = int(150 + 85 * (1 - abs(t - 0.4) / 0.6))
        d.line([(x, oy + 13), (x, oy + 28)], fill=(v, v, v, 255))
    d.line([(ox + 7, oy + 13), (ox + 7, oy + 28)], fill=(100, 100, 100, 255))
    d.line([(ox + 25, oy + 13), (ox + 25, oy + 28)], fill=(120, 120, 120, 255))
    d.ellipse([ox + 6, oy + 7, ox + 26, oy + 17], fill=(246, 246, 246, 255), outline=(130, 130, 130, 255))
    d.ellipse([ox + 10, oy + 9, ox + 22, oy + 14], outline=(205, 205, 205, 255))


def decalque_alto(src, x, y, h, limiar, ganho):
    """Recorte w=32 x h: o claro vira objeto opaco (com o brilho original realçado)."""
    q = src[y:y + h, x:x + 32]
    a = np.clip((q - limiar) * ganho, 0, 255).astype(np.uint8)
    v = np.clip(q * 1.25 + 40, 0, 255).astype(np.uint8)
    return Image.merge('RGBA', [Image.fromarray(v)] * 3 + [Image.fromarray(a)])


def cano_L(d, ox, oy, espelho):
    """Cano claro que desce rente à parede e vira na horizontal (3x2 tiles), com caixas nas juntas."""
    vx = ox + (82 if espelho else 14)
    for k in (-1, 0, 1):
        tubo_v(d, vx + k, oy + 4, oy + 42, claro=(255, 255, 255, 255))
    if espelho:
        for k in (-1, 0, 1): tubo_h(d, ox, vx - 4, oy + 42 + k, claro=(255, 255, 255, 255))
        tubo_h(d, vx + 4, ox + 95, oy + 6, claro=(255, 255, 255, 255))
    else:
        for k in (-1, 0, 1): tubo_h(d, vx + 4, ox + 95, oy + 42 + k, claro=(255, 255, 255, 255))
        tubo_h(d, ox, vx - 4, oy + 6, claro=(255, 255, 255, 255))
    for jy in (oy + 6, oy + 42):
        d.rectangle([vx - 5, jy - 5, vx + 5, jy + 5], fill=(200, 200, 200, 255), outline=(60, 60, 60, 255))
        d.rectangle([vx - 2, jy - 2, vx + 2, jy + 2], fill=(140, 140, 140, 255))


def nicho(d, ox, oy):
    """(0,2)-(0,4): nicho iluminado da sala das lâmpadas: moldura clara em cima e uma abertura
    de tijolos com a chama no alto (1x3 tiles)."""
    # moldura (tile de cima)
    d.rectangle([ox + 3, oy + 6, ox + 28, oy + 29], fill=(215, 215, 215, 255))
    d.rectangle([ox + 7, oy + 10, ox + 24, oy + 25], fill=(45, 45, 45, 255))
    d.rectangle([ox + 3, oy + 6, ox + 28, oy + 29], outline=(120, 120, 120, 255))
    # corpo (dois tiles): laterais claras e tijolos escuros dentro
    y0 = oy + 32
    d.rectangle([ox + 3, y0, ox + 28, y0 + 60], fill=(200, 200, 200, 255))
    d.rectangle([ox + 7, y0 + 2, ox + 24, y0 + 60], fill=(55, 55, 55, 255))
    for j in range(8):
        yy = y0 + 22 + j * 5
        d.line([(ox + 8, yy), (ox + 23, yy)], fill=(95, 95, 95, 255))
        off = 4 if j % 2 else 0
        for xx in range(ox + 9 + off, ox + 23, 8):
            d.line([(xx, yy - 4), (xx, yy)], fill=(95, 95, 95, 255))
    d.ellipse([ox + 10, y0 + 4, ox + 21, y0 + 16], fill=(250, 250, 250, 255))


def rabisco_numero(d, ox, oy, n):
    """Número riscado na parede, traço fino e torto, cinza claro."""
    # nas capturas o número fica na parte de baixo do tile da parede, fino e apagado
    c = (150, 150, 150, 200)
    T = {
        '1': [[(14, 18), (17, 15), (17, 31)]],
        '2': [[(11, 18), (15, 15), (20, 17), (19, 21), (11, 31), (21, 31)]],
        '6': [[(20, 15), (14, 18), (11, 25), (13, 31), (19, 30), (20, 26), (13, 25)]],
        '4': [[(18, 31), (18, 15), (10, 26), (22, 26)]],
    }
    for traco in T[n]:
        d.line([(ox + x, oy + y) for x, y in traco], fill=c, width=1)


def recorte(n, x, y, w, h, tom):
    src = captura(n)
    q = np.clip(src[y:y + h, x:x + w] * 1.15 + tom, 0, 255).astype(np.uint8)
    a = np.full((h, w), 255, np.uint8)
    return Image.merge('RGBA', [Image.fromarray(q)] * 3 + [Image.fromarray(a)])


def tubo_h(d, x0, x1, y, claro=(225, 225, 225, 255), escuro=(40, 40, 40, 255)):
    d.rectangle([x0, y - 2, x1, y + 2], fill=escuro)
    d.line([(x0 + 1, y - 1), (x1 - 1, y - 1)], fill=claro)
    d.line([(x0 + 1, y), (x1 - 1, y)], fill=(170, 170, 170, 255))
    d.line([(x0 + 1, y + 1), (x1 - 1, y + 1)], fill=(110, 110, 110, 255))


def tubo_v(d, x, y0, y1, claro=(225, 225, 225, 255), escuro=(40, 40, 40, 255)):
    d.rectangle([x - 2, y0, x + 2, y1], fill=escuro)
    d.line([(x - 1, y0 + 1), (x - 1, y1 - 1)], fill=claro)
    d.line([(x, y0 + 1), (x, y1 - 1)], fill=(170, 170, 170, 255))
    d.line([(x + 1, y0 + 1), (x + 1, y1 - 1)], fill=(110, 110, 110, 255))


def braçadeira(d, x, y, h):
    d.rectangle([x - 2, y, x + 2, y + h], fill=(30, 30, 30, 255))
    d.rectangle([x - 1, y + 1, x + 1, y + h - 1], fill=(150, 150, 150, 255))


def canos(d):
    # (0,1)-(1,1): par de canos horizontais com braçadeiras (parede do duto e do corredor)
    ox, oy = 0, 32
    tubo_h(d, ox + 3, ox + 60, oy + 11)
    tubo_h(d, ox + 3, ox + 60, oy + 21)
    for bx in (ox + 14, ox + 46):
        braçadeira(d, bx, oy + 6, 20)
    for ex in (ox + 3, ox + 60):
        d.ellipse([ex - 3, oy + 7, ex + 3, oy + 15], outline=(40, 40, 40, 255), fill=(200, 200, 200, 255))
        d.ellipse([ex - 3, oy + 17, ex + 3, oy + 25], outline=(40, 40, 40, 255), fill=(200, 200, 200, 255))
    # (2,1)-(2,2): par de canos verticais (2 tiles de altura)
    ox, oy = 64, 32
    tubo_v(d, ox + 10, oy + 3, oy + 60)
    tubo_v(d, ox + 22, oy + 3, oy + 60)
    for ey in (oy + 3, oy + 60):
        for ex in (ox + 10, ox + 22):
            d.ellipse([ex - 4, ey - 3, ex + 4, ey + 3], outline=(40, 40, 40, 255), fill=(200, 200, 200, 255))
    # (3,1): boca do duto (abertura escura com moldura) por onde ele sai da cela
    ox, oy = 96, 32
    d.rectangle([ox + 2, oy + 2, ox + 29, oy + 31], fill=(150, 150, 150, 255))
    d.rectangle([ox + 4, oy + 5, ox + 27, oy + 31], fill=(5, 5, 5, 255))
    print('ok', OUT)


if __name__ == '__main__':
    main()
