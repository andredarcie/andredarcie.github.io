from __future__ import annotations

import csv
import math
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def main() -> None:
    errors: list[str] = []
    sources = read_csv(ROOT / "fontes.csv")
    ranking = read_csv(ROOT / "ranking_final.csv")
    mentions = read_csv(ROOT / "todas_mencoes.csv")

    if not sources:
        errors.append("fontes.csv está vazio")
    if not ranking:
        errors.append("ranking_final.csv está vazio")
    if not mentions:
        errors.append("todas_mencoes.csv está vazio")

    source_ids = [row["fonte_id"] for row in sources]
    if len(source_ids) != len(set(source_ids)):
        errors.append("IDs duplicados em fontes.csv")
    if any(row["status_http_na_coleta"] != "200" for row in sources):
        errors.append("há fonte sem status HTTP 200 registrado na coleta")

    source_counts = Counter(row["fonte_id"] for row in mentions)
    for source in sources:
        source_id = source["fonte_id"]
        expected = int(source["quantidade_livros"])
        if source_counts[source_id] != expected:
            errors.append(
                f"{source_id}: {source_counts[source_id]} menções, esperado {expected}"
            )

        source_dir = ROOT / "fontes" / source_id
        if not (source_dir / "fonte.md").is_file():
            errors.append(f"{source_id}: fonte.md ausente")
        if not (source_dir / "livros.csv").is_file():
            errors.append(f"{source_id}: livros.csv ausente")
            continue

        rows = read_csv(source_dir / "livros.csv")
        positions = [int(row["posicao"]) for row in rows]
        if positions != list(range(1, len(rows) + 1)):
            errors.append(f"{source_id}: posições não consecutivas")
        if len({row["titulo_normalizado"] for row in rows}) != len(rows):
            errors.append(f"{source_id}: título duplicado")
        for row in rows:
            position = int(row["posicao"])
            actual = float(row["peso_posicao"])
            expected_weight = (len(rows) - position + 1) / len(rows)
            if not math.isclose(actual, expected_weight, abs_tol=5e-7):
                errors.append(
                    f"{source_id} posição {position}: peso {actual}, esperado {expected_weight}"
                )

    occurrence_counts = Counter(row["titulo_normalizado"] for row in mentions)
    expected_ranks = list(range(1, len(ranking) + 1))
    actual_ranks = [int(row["rank_final"]) for row in ranking]
    if actual_ranks != expected_ranks:
        errors.append("ranking_final.csv não tem ranks consecutivos")

    previous_score = float("inf")
    for row in ranking:
        title = row["titulo_normalizado"]
        if int(row["ocorrencias"]) != occurrence_counts[title]:
            errors.append(f"{title}: ocorrências inconsistentes")
        score = float(row["pontuacao_final"])
        occurrences = int(row["ocorrencias"])
        expected_average = float(row["peso_posicao_somado"]) / occurrences
        if not math.isclose(
            float(row["peso_posicao_medio"]), expected_average, abs_tol=1e-6
        ):
            errors.append(f"{title}: peso médio inconsistente")
        expected_score = occurrences + float(row["peso_posicao_medio"])
        if not math.isclose(score, expected_score, abs_tol=1e-6):
            errors.append(f"{title}: pontuação final inconsistente")
        if score > previous_score + 1e-9:
            errors.append("ranking_final.csv não está em ordem decrescente")
        previous_score = score

    if sum(int(row["ocorrencias"]) for row in ranking) != len(mentions):
        errors.append("soma das ocorrências não fecha com todas_mencoes.csv")

    if errors:
        print("VALIDAÇÃO FALHOU")
        for error in errors:
            print(f"- {error}")
        raise SystemExit(1)

    print("VALIDAÇÃO OK")
    print(f"Fontes: {len(sources)}")
    print(f"Menções: {len(mentions)}")
    print(f"Títulos únicos: {len(ranking)}")
    print(f"Pastas de fontes: {len(list((ROOT / 'fontes').iterdir()))}")


if __name__ == "__main__":
    main()
