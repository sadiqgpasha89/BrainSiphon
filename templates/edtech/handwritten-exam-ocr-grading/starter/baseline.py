"""Extraction engine: layout-specific rules against a token tagger, on a seen layout and on a layout never seen in training.

    python baseline.py     -> prints the report (also returned by run())
"""

from __future__ import annotations

import json
import re

import numpy as np
from sklearn.feature_extraction import DictVectorizer
from sklearn.linear_model import LogisticRegression

from make_data import FIELDS, generate

RULES = {  # written by someone who only ever saw layout A
    "INVOICE_ID": r"Invoice No:\s*(INV-\d+)",
    "DATE": r"Date:\s*(\d{2}/\d{2}/\d{4})",
    "AMOUNT": r"Total:\s*([\d,]+\.\d{2})",
    "VENDOR": r"Vendor:\s*(.+)",
}


def rule_extract(doc: dict) -> dict:
    out = {}
    for f, pat in RULES.items():
        m = re.search(pat, doc["text"])
        out[f] = m.group(1).strip() if m else ""
    return out


def shape(tok: str) -> str:
    s = re.sub(r"[A-Z]", "X", tok)
    s = re.sub(r"[a-z]", "x", s)
    return re.sub(r"\d", "d", s)


def token_features(tokens: list[str], i: int) -> dict:
    t = tokens[i]
    f = {"bias": 1.0, "lower": t.lower(), "shape": shape(t), "is_digit": t.isdigit(), "has_dash": "-" in t, "upper": t.isupper(), "title": t.istitle(), "idx": min(i, 6)}
    for off in (-2, -1, 1):
        j = i + off
        f[f"w{off}"] = tokens[j].lower() if 0 <= j < len(tokens) else "<pad>"
        f[f"s{off}"] = shape(tokens[j]) if 0 <= j < len(tokens) else "<pad>"
    return f


def featurise(docs: list[dict]):
    return [token_features(d["tokens"], i) for d in docs for i in range(len(d["tokens"]))], [t for d in docs for t in d["tags"]]


def decode(tokens: list[str], tags: list[str]) -> dict:
    out = {f: [] for f in FIELDS}
    for tok, tag in zip(tokens, tags):
        if tag != "O":
            out[tag[2:]].append(tok)
    return {f: " ".join(v) for f, v in out.items()}


def fit(docs: list[dict]):
    X, y = featurise(docs)
    vec = DictVectorizer()
    clf = LogisticRegression(max_iter=300, C=3.0).fit(vec.fit_transform(X), y)
    return vec, clf


def ml_extract(model, doc: dict) -> dict:
    vec, clf = model
    X = [token_features(doc["tokens"], i) for i in range(len(doc["tokens"]))]
    return decode(doc["tokens"], list(clf.predict(vec.transform(X))))


def score(extract, docs: list[dict]) -> dict:
    per = {}
    for f in FIELDS:
        got = [extract(d)[f] for d in docs]
        correct = sum(g == d["gold"][f] for g, d in zip(got, docs))
        extracted = sum(bool(g) for g in got)
        p = correct / extracted if extracted else 0.0
        r = correct / len(docs)
        per[f] = {"precision": p, "recall": r, "f1": 2 * p * r / (p + r) if p + r else 0.0}
    per["macro_f1"] = float(np.mean([per[f]["f1"] for f in FIELDS]))
    per["document_exact_match"] = float(np.mean([all(extract(d)[f] == d["gold"][f] for f in FIELDS) for d in docs]))
    return per


def run(seed: int = 91, **gen) -> dict:
    train, seen, unseen, adapt = generate(seed=seed, **gen)
    model = fit(train)
    adapted = fit(train + adapt)
    ml = lambda d: ml_extract(model, d)
    ml2 = lambda d: ml_extract(adapted, d)
    tagger_seen, tagger_unseen, tagger_adapted = score(ml, seen), score(ml, unseen), score(ml2, unseen)
    return {
        "train_docs": len(train),
        "test_docs_each": len(seen),
        "adaptation_docs": len(adapt),
        "rules_seen_layout": score(rule_extract, [d for d in seen if d["layout"] == "A"]),
        "rules_unseen_layout": score(rule_extract, unseen),
        "tagger_seen_layouts": tagger_seen,
        "tagger_unseen_layout": tagger_unseen,
        "tagger_unseen_after_adaptation": tagger_adapted,
        "unseen_layout_drop": tagger_seen["macro_f1"] - tagger_unseen["macro_f1"],
        "adaptation_recovers": tagger_adapted["macro_f1"] - tagger_unseen["macro_f1"],
    }


if __name__ == "__main__":
    print(json.dumps(run(), indent=2))
