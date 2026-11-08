"""Reference kit: text classification (ticket routing, moderation, document tagging, sentiment, extraction targets).

Synthetic documents with the traps text projects keep falling into:
  * near-duplicates: 25% of documents are forwards or templated copies of an earlier one (same `thread`), so a random split
    puts copies of the same text on both sides
  * a post-hoc leak: 18% of documents contain a resolution token that is only written AFTER the label is known
  * vocabulary drift: new product words appear in later months, so a model frozen in month 1 slowly degrades
  * confusable classes: each class borrows 30% of its topic words from a neighbour
Columns: text, label, thread, month
"""

from __future__ import annotations

import numpy as np
import pandas as pd

SYLL = ["ka", "ro", "mi", "tu", "le", "sa", "no", "vi", "da", "pe", "xo", "bu", "zi", "fa", "ge"]


def word(rng) -> str:
    return "".join(rng.choice(SYLL, size=int(rng.integers(2, 4))))


def generate(n_docs: int = 6_000, n_classes: int = 8, months: int = 8, seed: int = 61) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    common = [word(rng) for _ in range(200)]
    topic = [[word(rng) for _ in range(30)] for _ in range(n_classes)]
    fresh = [[word(rng) + "x" for _ in range(15)] for _ in range(n_classes)]      # words that only appear in later months
    probs = rng.dirichlet(np.full(n_classes, 3.0))
    rows, threads = [], []
    for i in range(n_docs):
        month = int(i * months / n_docs)
        if threads and rng.random() < 0.25:                                    # a forward / templated copy of an earlier doc
            src = rows[int(rng.choice(threads))]
            rows.append({**src, "month": month, "text": src["text"] + " " + " ".join(rng.choice(common, 2))})
            continue
        y = int(rng.choice(n_classes, p=probs))
        toks = []
        for _ in range(int(rng.integers(12, 26))):
            u = rng.random()
            if u < 0.24:
                owner = y if rng.random() > 0.3 else (y + 1) % n_classes
                pool = fresh[owner] if month >= 5 and rng.random() < 0.7 else topic[owner]   # late months use mostly NEW words
                toks.append(str(rng.choice(pool)))
            else:
                toks.append(str(rng.choice(common)))
        if rng.random() < 0.18:
            toks.append(f"resolved_as_{y}")                                    # written after the label exists
        rows.append({"text": " ".join(toks), "label": y, "thread": i, "month": month})
        threads.append(len(rows) - 1)
    return pd.DataFrame(rows)


if __name__ == "__main__":
    d = generate()
    print(f"{len(d):,} docs, {d.label.nunique()} classes, {d.thread.nunique():,} threads, "
          f"leak token in {d.text.str.contains('resolved_as_').mean():.0%} of docs")
