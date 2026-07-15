#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gera os assets que o jogo consome a partir do pacote original Tiny Swords
(Pixel Frog). Rode com:  python tools/build-assets.py

Duas coisas acontecem aqui:

1) COPIA os sprites usados para nomes limpos em assets/tiny-swords/game/.
   O pacote original fica intacto como fonte, mas o CSS deixa de depender de
   caminhos com espaco/parenteses ("Tiny%20Swords%20%28Free%20Pack%29").

2) RECORTA os atlas de UI. No pacote, todo elemento estica-vel (papel, botao,
   barra, fita) vem como N-slice espalhado num grid de celulas de 64 px com
   GUTTERS transparentes de 64 px entre as pecas (anti-bleed):

       [peca][gutter][peca][gutter][peca]

   border-image do CSS exige as pecas CONTIGUAS, entao aqui elas sao remontadas
   lado a lado. As pecas de canto/borda ainda sao recortadas para SLICE px
   (a moldura desenhada e' fina; os 64 px da celula sao quase todos preenchimento),
   de modo que border-width == slice e a arte sai 1:1, sem reescala.
"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets", "tiny-swords", "source", "Tiny Swords (Free Pack)")
UI_SRC = os.path.join(SRC, "UI Elements", "UI Elements")
OUT_UI = os.path.join(ROOT, "assets", "tiny-swords", "ui")
OUT_GAME = os.path.join(ROOT, "assets", "tiny-swords", "game")

CELL = 64  # o pacote inteiro e' modulado em 64 px


def load(*parts):
    return Image.open(os.path.join(*parts)).convert("RGBA")


def cell(img, col, row, size=CELL):
    """Peca (col,row) do grid com gutters: as pecas ficam nas celulas PARES."""
    x, y = col * 2 * size, row * 2 * size
    return img.crop((x, y, x + size, y + size))


def nine_slice(img, slice_px, out, corner=CELL):
    """
    Remonta um 9-slice contiguo e o recorta para `slice_px` de moldura.
    Saida: (slice + corner + slice) quadrado. CSS correspondente:
        border: <slice_px>px solid transparent;
        border-image: url(out) <slice_px> fill stretch;
    """
    s, c = slice_px, corner
    parts = {(i, j): cell(img, i, j, c) for i in range(3) for j in range(3)}
    w = h = s + c + s
    atlas = Image.new("RGBA", (w, h))

    def put(piece, box, dest):
        atlas.alpha_composite(piece.crop(box), dest)

    inner = c - s  # de onde comeca a metade "interna" de uma peca de canto
    # cantos: mantem so o lado externo (onde mora a moldura desenhada)
    put(parts[(0, 0)], (0, 0, s, s), (0, 0))
    put(parts[(2, 0)], (inner, 0, c, s), (s + c, 0))
    put(parts[(0, 2)], (0, inner, s, c), (0, s + c))
    put(parts[(2, 2)], (inner, inner, c, c), (s + c, s + c))
    # bordas: faixa de `s` px do lado externo, largura/altura cheia
    put(parts[(1, 0)], (0, 0, c, s), (s, 0))
    put(parts[(1, 2)], (0, inner, c, c), (s, s + c))
    put(parts[(0, 1)], (0, 0, s, c), (0, s))
    put(parts[(2, 1)], (inner, 0, c, c), (s + c, s))
    # centro cheio (vira o `fill` do border-image)
    atlas.alpha_composite(parts[(1, 1)], (s, s))
    atlas.save(out)
    print(f"  {os.path.basename(out)}  {atlas.size}  slice={s}")


def three_slice_h(img, out, row=0, cap=CELL, rowspan=1):
    """
    3-slice horizontal (barras, fitas): [cap][meio estica-vel][cap].
    CSS: border-image: url(out) 0 <cap> fill stretch; border-width: 0 <cap>px.
    """
    h = CELL * rowspan
    y = row * h
    pieces = [img.crop((i * 2 * CELL, y, i * 2 * CELL + CELL, y + h)) for i in range(3)]
    atlas = Image.new("RGBA", (CELL * 3, h))
    for i, p in enumerate(pieces):
        atlas.alpha_composite(p, (i * CELL, 0))
    atlas.save(out)
    print(f"  {os.path.basename(out)}  {atlas.size}  cap={cap}")


def copy(rel, name, out_dir=OUT_GAME):
    img = load(SRC, *rel.split("/"))
    dest = os.path.join(out_dir, name)
    img.save(dest)
    print(f"  {name}  {img.size}")


def main():
    os.makedirs(OUT_UI, exist_ok=True)
    os.makedirs(OUT_GAME, exist_ok=True)

    # Papel: a moldura desenhada e' fina (contorno de ~3 px + margem), entao 32 px
    # de fatia ja' pegam o canto inteiro. border-width 32px => arte 1:1.
    print("UI (papel: fatia 32 px, desenhado 1:1):")
    for src_name, out_name in [
        ("Papers/RegularPaper.png", "paper.png"),
        ("Papers/SpecialPaper.png", "paper-special.png"),
    ]:
        nine_slice(load(UI_SRC, *src_name.split("/")), 32, os.path.join(OUT_UI, out_name))

    # Botao: o canto arredondado do botao grande ocupa ~45 px da celula. Cortar em
    # 32 px decepa a curvatura e o botao vira uma pilula chata. Aqui a fatia vai
    # cheia (64 px) e o CSS a desenha com border-width 32px -> reducao exata de 2:1
    # (nearest-neighbor, sem borrao) preservando canto, relevo e sombra.
    print("UI (botao: fatia 64 px, desenhado a 1/2):")
    for src_name, out_name in [
        ("Buttons/BigBlueButton_Regular.png", "btn-blue.png"),
        ("Buttons/BigBlueButton_Pressed.png", "btn-blue-down.png"),
        ("Buttons/BigRedButton_Regular.png", "btn-red.png"),
        ("Buttons/BigRedButton_Pressed.png", "btn-red-down.png"),
    ]:
        nine_slice(load(UI_SRC, *src_name.split("/")), 64, os.path.join(OUT_UI, out_name))

    print("UI (3-slice horizontal):")
    bars = load(UI_SRC, "Bars", "BigBar_Base.png")
    three_slice_h(bars, os.path.join(OUT_UI, "bar-base.png"))
    load(UI_SRC, "Bars", "BigBar_Fill.png").save(os.path.join(OUT_UI, "bar-fill.png"))
    print("  bar-fill.png  (64, 64)")
    # SmallRibbons (320x640): 10 linhas de 64 px = 5 cores x 2 estilos de fita.
    # Cada fita tem 64 px de altura — recortar 2 linhas empilha DUAS fitas.
    ribbons = load(UI_SRC, "Ribbons", "SmallRibbons.png")
    for row, name in [(0, "ribbon-teal.png"), (2, "ribbon-red.png")]:
        three_slice_h(ribbons, os.path.join(OUT_UI, name), row=row)

    print("UI (icones e cursor):")
    icons = {
        "Icons/Icon_01.png": "icon-hammer.png",
        "Icons/Icon_05.png": "icon-swords.png",
        "Icons/Icon_06.png": "icon-shield.png",
        "Icons/Icon_07.png": "icon-play.png",
        "Icons/Icon_08.png": "icon-back.png",
        "Icons/Icon_09.png": "icon-x.png",
        "Icons/Icon_11.png": "icon-info.png",
        "Icons/Icon_02.png": "icon-wood.png",
        "Cursors/Cursor_01.png": "cursor.png",
    }
    for rel, name in icons.items():
        img = load(UI_SRC, *rel.split("/"))
        img.save(os.path.join(OUT_UI, name))
        print(f"  {name}  {img.size}")

    # ── Faccoes ──────────────────────────────────────────────
    # Defensor (o jogador) = AZUL: castelo, torres e sentinelas.
    # Invasor  (a IA)      = VERMELHO: quartel e peoes que evoluem.
    print("Tabuleiro:")
    copy("Terrain/Tileset/Tilemap_color1.png", "tilemap.png")
    copy("Terrain/Tileset/Water Background color.png", "water.png")
    copy("Terrain/Tileset/Shadow.png", "shadow.png")
    copy("Buildings/Blue Buildings/Castle.png", "castle.png")
    copy("Buildings/Blue Buildings/Tower.png", "tower.png")
    copy("Buildings/Red Buildings/Barracks.png", "barracks.png")

    print("Unidades:")
    copy("Units/Red Units/Pawn/Pawn_Idle.png", "pawn-idle.png")    # 8 frames
    copy("Units/Red Units/Pawn/Pawn_Run.png", "pawn-run.png")      # 6 frames
    copy("Units/Blue Units/Warrior/Warrior_Idle.png", "warrior-idle.png")  # 8
    copy("Units/Blue Units/Warrior/Warrior_Run.png", "warrior-run.png")    # 6
    copy("Units/Blue Units/Archer/Arrow.png", "arrow.png")

    print("Decoracao e efeitos:")
    for i in (1, 2):
        copy(f"Terrain/Resources/Wood/Trees/Tree{i}.png", f"tree{i}.png")   # 8 frames 192x256
    for i in (1, 2, 3, 4):
        copy(f"Terrain/Decorations/Bushes/Bushe{i}.png", f"bush{i}.png")    # 8 frames 128x128
    copy("Terrain/Decorations/Rocks/Rock1.png", "rock.png")                 # 64x64 = 1 tile
    copy("Terrain/Resources/Meat/Sheep/Sheep_Idle.png", "sheep.png")        # 6 frames 128x128
    copy("Particle FX/Explosion_01.png", "explosion.png")  # 8 frames 192x192
    copy("Particle FX/Dust_01.png", "dust.png")            # 8 frames 64x64


if __name__ == "__main__":
    main()
