"""Engine: information extraction from semi-structured documents (invoices, forms, claims, contracts, listings, reports).

Synthetic one-page documents in three layouts. Training sees layouts A and B; layout C is never seen, as a new customer, vendor
or form version would be in production. Tokens carry BIO labels for four fields.
Traps planted:
  * a template change at test time: rules written for one layout and a model trained on two both degrade on a third
  * the vendor name is the only multi-token field and the only one with no fixed shape, so it is the field that breaks first
"""

from __future__ import annotations

import numpy as np

FIELDS = ["INVOICE_ID", "DATE", "AMOUNT", "VENDOR"]
VENDORS = [
    "Acme", "Northwind Traders", "Globex", "Initech", "Umbrella Supplies", "Stark Industries", "Wayne Logistics",
    "Hooli", "Vandelay Imports", "Soylent", "Cyberdyne Systems", "Tyrell", "Wonka", "Gringotts", "Oscorp Labs",
    "Pied Piper", "Aperture Science", "Massive Dynamic", "Blue Sun", "Duff", "Monarch Solutions", "Nakatomi Trading",
]


def _doc(rng: np.random.Generator, layout: str):
    inv = f"INV-{int(rng.integers(10_000, 99_999))}"
    d, m, y = int(rng.integers(1, 29)), int(rng.integers(1, 13)), int(rng.integers(2022, 2026))
    amount = f"{int(rng.integers(100, 9_999_999)) / 100:,.2f}"
    vendor = VENDORS[int(rng.integers(0, len(VENDORS)))]
    slash, iso = f"{d:02d}/{m:02d}/{y}", f"{y}-{m:02d}-{d:02d}"
    if layout == "A":
        lines = [[("Invoice No:", None), (inv, "INVOICE_ID")], [("Date:", None), (slash, "DATE")], [("Vendor:", None), (vendor, "VENDOR")], [("Total:", None), (amount, "AMOUNT")]]
    elif layout == "B":
        lines = [[(vendor, "VENDOR"), ("- tax invoice", None), (inv, "INVOICE_ID"), ("dated", None), (iso, "DATE"), ("amount due $", None), (amount, "AMOUNT")]]
    else:  # layout C, unseen at training time
        lines = [[("BILL FROM", None), (vendor.upper(), "VENDOR")], [("Ref", None), (inv, "INVOICE_ID")], [("Issued on", None), (slash, "DATE")], [("Balance payable: USD", None), (amount, "AMOUNT")]]
    tokens, tags = [], []
    for line in lines:
        for text, label in line:
            for i, tok in enumerate(text.split()):
                tokens.append(tok)
                tags.append("O" if label is None else ("B-" if i == 0 else "I-") + label)
    gold = {f: " ".join(t for t, g in zip(tokens, tags) if g.endswith(f)) for f in FIELDS}
    line_text = "\n".join(" ".join(t for t, _ in line for t in t.split()) for line in lines)
    return {"layout": layout, "text": line_text, "tokens": tokens, "tags": tags, "gold": gold}


def generate(n_train: int = 1200, n_test: int = 400, seed: int = 91, n_adapt: int = 30):
    rng = np.random.default_rng(seed)
    train = [_doc(rng, "AB"[int(rng.integers(0, 2))]) for _ in range(n_train)]
    seen = [_doc(rng, "AB"[int(rng.integers(0, 2))]) for _ in range(n_test)]
    unseen = [_doc(rng, "C") for _ in range(n_test)]
    adapt = [_doc(rng, "C") for _ in range(n_adapt)]
    return train, seen, unseen, adapt


if __name__ == "__main__":
    tr, *_ = generate(10, 5)
    print(tr[0]["text"])
