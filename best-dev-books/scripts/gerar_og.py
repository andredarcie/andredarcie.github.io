"""Gera og-cover.png (1200x630) para prévia em redes sociais.

A imagem é derivada de ranking_final.csv e fontes.csv, então acompanha a coleta
em vez de virar um arquivo estático que envelhece. Reproduz a paleta Newsprint
de tokens.css em sRGB aproximado.

    python scripts/gerar_og.py
"""

from __future__ import annotations

import csv
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "og-cover.png"

WIDTH, HEIGHT = 1200, 630
MARGIN = 72

# Equivalentes sRGB dos tokens OKLCH usados em tokens.css.
PAPER = (247, 241, 231)
PAPER_2 = (238, 231, 219)
INK = (26, 34, 51)
MUTED = (92, 99, 116)
RULE = (198, 188, 172)
ACCENT = (176, 66, 32)

FONTS = Path("C:/Windows/Fonts")
FALLBACK_SERIF = ["georgiab.ttf", "timesbd.ttf", "palab.ttf"]
FALLBACK_SANS = ["segoeui.ttf", "arial.ttf"]
FALLBACK_SANS_BOLD = ["segoeuib.ttf", "arialbd.ttf"]


def load_font(candidates: list[str], size: int) -> ImageFont.FreeTypeFont:
    for name in candidates:
        path = FONTS / name
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default(size)


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def draw_rule(draw: ImageDraw.ImageDraw, y: int, color=RULE, width=1) -> None:
    draw.line([(MARGIN, y), (WIDTH - MARGIN, y)], fill=color, width=width)


def fit(draw: ImageDraw.ImageDraw, text: str, font, max_width: int) -> str:
    """Corta o texto com reticências quando ele não cabe na coluna."""
    if draw.textlength(text, font=font) <= max_width:
        return text
    while text and draw.textlength(f"{text}…", font=font) > max_width:
        text = text[:-1]
    return f"{text.rstrip()}…"


def main() -> None:
    ranking = read_csv(ROOT / "ranking_final.csv")
    sources = read_csv(ROOT / "fontes.csv")

    total_books = len(ranking)
    total_sources = len(sources)
    total_mentions = sum(int(book["ocorrencias"]) for book in ranking)

    image = Image.new("RGB", (WIDTH, HEIGHT), PAPER)
    draw = ImageDraw.Draw(image)

    kicker_font = load_font(FALLBACK_SANS_BOLD, 21)
    brand_font = load_font(FALLBACK_SERIF, 80)
    lead_font = load_font(FALLBACK_SANS, 28)
    rank_font = load_font(FALLBACK_SERIF, 38)
    title_font = load_font(FALLBACK_SERIF, 34)
    meta_font = load_font(FALLBACK_SANS, 22)
    stat_font = load_font(FALLBACK_SERIF, 40)
    stat_label_font = load_font(FALLBACK_SANS, 20)

    # Cabeçalho no formato de manchete de jornal.
    draw.text(
        (MARGIN, 50),
        "PESQUISA INDEPENDENTE · CONSENSO DA WEB",
        font=kicker_font,
        fill=MUTED,
    )
    draw.text((MARGIN, 82), "Best Dev Books", font=brand_font, fill=INK)
    draw.text(
        (MARGIN, 186),
        "Os livros mais recomendados para desenvolvedores.",
        font=lead_font,
        fill=MUTED,
    )

    draw_rule(draw, 240, INK, 3)

    # Top 3 do ranking atual.
    text_left = MARGIN + 58
    text_width = WIDTH - MARGIN - text_left
    y = 250
    for index, book in enumerate(ranking[:3]):
        draw.text((MARGIN, y + 2), book["rank_final"], font=rank_font, fill=ACCENT)
        draw.text(
            (text_left, y),
            fit(draw, book["titulo_normalizado"], title_font, text_width),
            font=title_font,
            fill=INK,
        )
        meta = f"{book['autor']} · {book['ocorrencias']} de {book['total_fontes']} fontes"
        draw.text(
            (text_left, y + 46),
            fit(draw, meta, meta_font, text_width),
            font=meta_font,
            fill=MUTED,
        )
        if index < 2:
            draw_rule(draw, y + 78)
        y += 88

    # Faixa de números, no mesmo desenho da stats-strip da página.
    band_top = 512
    draw.rectangle([(0, band_top), (WIDTH, HEIGHT)], fill=PAPER_2)
    draw.line([(0, band_top), (WIDTH, band_top)], fill=INK, width=3)

    stats = [
        (f"{total_sources}", "fontes analisadas"),
        (f"{total_mentions}", "recomendações"),
        (f"{total_books}", "livros únicos"),
    ]
    column = (WIDTH - MARGIN * 2) / len(stats)
    for index, (value, label) in enumerate(stats):
        x = MARGIN + column * index
        draw.text((x, band_top + 22), value, font=stat_font, fill=INK)
        draw.text((x, band_top + 76), label, font=stat_label_font, fill=MUTED)
        if index:
            draw.line(
                [(x - 28, band_top + 18), (x - 28, HEIGHT - 18)],
                fill=RULE,
                width=1,
            )

    image.save(OUT, format="PNG", optimize=True)
    print(f"{OUT.name}: {WIDTH}x{HEIGHT}, {OUT.stat().st_size / 1024:.1f} KB")


if __name__ == "__main__":
    main()
