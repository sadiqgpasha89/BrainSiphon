"""Compare a naive keyword-RAG pipeline with a version-aware, verified one on a golden set that includes
unanswerable questions. Metrics: accuracy on answerable, stale-version errors, hallucination on unanswerable,
retrieval recall. Evaluate on products NOT used for tuning.  Run:  python baseline.py"""

from __future__ import annotations

import json

from make_data import generate
from rag import Pipeline


def evaluate(pipe: Pipeline, golden: list[dict], by_chunks) -> dict:
    n_ans = correct = stale = n_un = halluc = abstain_ans = cited_ok = answered = 0
    recall = 0
    for g in golden:
        a = pipe.answer(g["q"])
        if g["type"] == "unanswerable":
            n_un += 1
            halluc += int(not a.abstained)
            continue
        n_ans += 1
        retrieved = pipe.retrieve(g["q"])
        recall += int(any(c.product == g["product"] and (c.version == g["version"] or c.kind == "changelog") and str(g["answer"]) in c.text for c in retrieved))
        if a.abstained:
            abstain_ans += 1
            continue
        answered += 1
        correct += int(a.value == g["answer"])
        v1_value_when_latest = g["type"] == "latest" and a.value is not None and a.value != g["answer"]
        stale += int(v1_value_when_latest and a.chunk_id is not None and by_chunks[a.chunk_id].kind == "changelog")
        cited_ok += int(a.chunk_id is not None and str(a.value) in by_chunks[a.chunk_id].text)
    return {"answerable": n_ans, "unanswerable": n_un, "accuracy": correct / n_ans, "answered_precision": correct / max(answered, 1),
            "abstained_on_answerable": abstain_ans / n_ans, "hallucination_rate": halluc / n_un,
            "stale_or_changelog_errors": stale, "recall@5": recall / n_ans, "citation_support": cited_ok / max(answered, 1)}


def run(seed: int = 17) -> dict:
    chunks, gold, dev = generate(seed)
    test = [g for g in gold if g["product"] not in dev]
    by_chunks = {c.id: c for c in chunks}
    out = {"chunks": len(chunks), "golden": len(gold), "test_questions": len(test)}
    for mode in ("naive", "guarded"):
        out[mode] = evaluate(Pipeline(chunks, mode), test, by_chunks)
    return out


if __name__ == "__main__":
    print(json.dumps(run(), indent=2))
