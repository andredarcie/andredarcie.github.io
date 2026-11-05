"""Gera assets/tiles/xC.png: o fundo das duas salas do fim do capítulo 1, tirado direto das
capturas de 2014 (14 = sala do piano, 21 = sala da guilhotina), para ficarem
1 para 1 com o jogo original. As capturas estão alinhadas à grade de tiles do mapa (17x13, câmera
parada), então cada uma vira um objeto de 17x13 tiles por cima do mapa; o mapa só cuida da
passagem e dos eventos.

O que não pode ficar gravado no fundo é apagado com remendos de piso tirados do lado: o herói
(nas capturas 14 e 21) e o envelope do chão (vira evento, some quando o herói pega).

Uso: python tools/salas_finais.py
Folha: 544 x 832 = dois fundos de 17x13 tiles empilhados (piano em y=0, guilhotina em y=13).
"""
import os
import numpy as np
from PIL import Image
from extras import captura

AQUI = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(AQUI, '..', 'assets', 'tiles', 'xC.png')
T = 32


def fundo(n, remendos=()):
    """Captura n no espaço do jogo (544x416), com remendos (tile destino <- tile origem)."""
    g = captura(n).copy()
    for (dx, dy), (sx, sy) in remendos:
        g[dy * T:(dy + 1) * T, dx * T:(dx + 1) * T] = g[sy * T:(sy + 1) * T, sx * T:(sx + 1) * T]
    v = np.clip(g, 0, 255).astype(np.uint8)
    return Image.merge('RGBA', [Image.fromarray(v)] * 3 + [Image.new('L', (544, 416), 255)])


def main():
    S = Image.new('RGBA', (544, 416 * 2), (0, 0, 0, 255))
    # sala do piano: herói em (14,7)-(14,8), envelope em (12,6)
    S.paste(fundo(14, [((14, 7), (12, 7)), ((14, 8), (12, 8)), ((12, 6), (10, 6))]), (0, 0))
    # sala da guilhotina: herói em (10,7)-(10,8)
    S.paste(fundo(21, [((10, 7), (12, 7)), ((10, 8), (12, 8))]), (0, 416))
    S.save(OUT, optimize=True)
    print('ok', OUT)


if __name__ == '__main__':
    main()
