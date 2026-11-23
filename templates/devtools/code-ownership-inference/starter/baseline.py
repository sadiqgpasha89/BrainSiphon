"""Generative-output engine: a golden set, two generator versions, two judges, agreement, and confidence intervals on the difference.

    python baseline.py     -> prints the report (also returned by run())
"""

from __future__ import annotations

import json
import re

import numpy as np

from make_data import FORBIDDEN, golden_set

FILLER = "The figure was reviewed by the finance team and is shown here for context only."
RATES = {  # chance of each failure per output
    "v1": {"drop_fact": 0.14, "wrong_number": 0.08, "too_long": 0.14, "forbidden": 0.06},
    "v2": {"drop_fact": 0.06, "wrong_number": 0.03, "too_long": 0.05, "forbidden": 0.02},
}


def generate_output(item: dict, version: str, rng: np.random.Generator) -> str:
    r = RATES[version]
    amount = item["amount"] + (int(item["amount"] * 0.1) if rng.random() < r["wrong_number"] else 0)
    style = int(rng.integers(0, 3))
    shown = (f"{amount:,}", f"{amount}", f"{amount / 1000:.1f}k")[style]  # three valid ways to write the same number
    date = item["date"] if rng.random() < 0.7 else _long_date(item["date"])
    parts = [f"{item['entity']} reported {shown} on {date}."]
    if rng.random() < r["drop_fact"]:
        parts = [f"{item['entity']} reported a figure recently."]
    if rng.random() < r["forbidden"]:
        parts.append("This outcome is something we guarantee.")
    parts.append(FILLER)
    while rng.random() < r["too_long"] and len(" ".join(parts).split()) <= item["max_words"] + 5:
        parts.append(FILLER)
    return " ".join(parts)


def _long_date(iso: str) -> str:
    months = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split()
    y, m, d = iso.split("-")
    return f"{int(d)} {months[int(m) - 1]} {y}"


def _numbers(text: str) -> set[int]:
    out = set()
    for m in re.finditer(r"(\d[\d,]*\.?\d*)(k?)", text):
        v = float(m.group(1).replace(",", ""))
        out.add(int(round(v * 1000)) if m.group(2) else int(round(v)))
    return out


def _dates(text: str) -> set[str]:
    months = {m: i + 1 for i, m in enumerate("Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split())}
    found = set(re.findall(r"\d{4}-\d{2}-\d{2}", text))
    for d, m, y in re.findall(r"(\d{1,2}) ([A-Z][a-z]{2}) (\d{4})", text):
        found.add(f"{y}-{months[m]:02d}-{int(d):02d}")
    return found


def checks(item: dict, text: str, judge: str) -> dict:
    if judge == "strict":  # exact canonical strings only
        amount_ok = f"{item['amount']:,}" in text
        date_ok = item["date"] in text
    else:  # fuzzy: any valid number or date format
        amount_ok = item["amount"] in _numbers(text)
        date_ok = item["date"] in _dates(text)
    return {
        "has_entity": item["entity"] in text,
        "amount_correct": amount_ok,
        "date_correct": date_ok,
        "within_length": len(text.split()) <= item["max_words"],
        "no_forbidden_claims": not any(w in text.lower() for w in FORBIDDEN),
    }


def passes(item: dict, text: str, judge: str) -> bool:
    return all(checks(item, text, judge).values())


def cohen_kappa(a: np.ndarray, b: np.ndarray) -> float:
    po = float(np.mean(a == b))
    pe = float(np.mean(a) * np.mean(b) + np.mean(~a) * np.mean(~b))
    return 1.0 if pe == 1 else (po - pe) / (1 - pe)


def bootstrap_ci(x: np.ndarray, rounds: int = 400, seed: int = 0) -> tuple[float, float]:
    rng = np.random.default_rng(seed)
    means = [x[rng.integers(0, len(x), len(x))].mean() for _ in range(rounds)]
    return float(np.percentile(means, 2.5)), float(np.percentile(means, 97.5))


def run(seed: int = 91, n: int = 240) -> dict:
    gold = golden_set(n, seed)
    rng = np.random.default_rng(seed)
    out = {v: [generate_output(it, v, rng) for it in gold] for v in ("v1", "v2")}
    res = {v: {j: np.array([passes(it, t, j) for it, t in zip(gold, out[v])]) for j in ("strict", "fuzzy")} for v in out}
    diff = res["v2"]["fuzzy"].astype(float) - res["v1"]["fuzzy"].astype(float)
    per_check = {c: float(np.mean([not checks(it, t, "fuzzy")[c] for it, t in zip(gold, out["v1"])])) for c in checks(gold[0], out["v1"][0], "fuzzy")}
    small = res["v1"]["fuzzy"][:60].astype(float)
    return {
        "golden_items": n,
        "v1_pass_rate_strict_judge": float(res["v1"]["strict"].mean()),
        "v1_pass_rate_fuzzy_judge": float(res["v1"]["fuzzy"].mean()),
        "v2_pass_rate_fuzzy_judge": float(res["v2"]["fuzzy"].mean()),
        "v1_pass_rate_ci95": bootstrap_ci(res["v1"]["fuzzy"].astype(float)),
        "v2_minus_v1": float(diff.mean()),
        "v2_minus_v1_ci95": bootstrap_ci(diff),
        "judge_agreement_kappa_v1": cohen_kappa(res["v1"]["strict"], res["v1"]["fuzzy"]),
        "judge_disagreement_share_v1": float(np.mean(res["v1"]["strict"] != res["v1"]["fuzzy"])),
        "v1_failure_share_by_check": per_check,
        "ci_width_at_60_items": float(np.subtract(*bootstrap_ci(small)[::-1])),
        "ci_width_at_full_set": float(np.subtract(*bootstrap_ci(res["v1"]["fuzzy"].astype(float))[::-1])),
    }


if __name__ == "__main__":
    print(json.dumps(run(), indent=2))
