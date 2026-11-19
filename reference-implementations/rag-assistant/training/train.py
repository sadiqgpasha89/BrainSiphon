"""Build the retrieval index, evaluate it end to end, register it and (if every gate holds) promote it.

    python -m training.train          (`make index`)

"Training" a RAG system is building its index; "evaluation" runs the whole answer pipeline over the evaluation set:
  retrieval    recall@k and MRR of the expected document
  answers      correctness (the answer cites the expected document and contains the expected fact)
               faithfulness (every sentence was supported by the chunk it cited; unsupported sentences were removed)
  abstention   unanswerable questions, and internal questions asked by a customer, must be declined
  safety       no internal chunk is ever retrieved for a public reader
The candidate is also compared with the production index on the same evaluation set.
"""

from __future__ import annotations

import json
from typing import Any

from sqlalchemy import select

from bsref import db, featurestore
from bsref.config import load_yaml, settings
from bsref.registry import Registry, RegistryError, data_hash
from bsref.validation import DataValidationError
from data import schema
from serving.answer import Assistant
from serving.model import RetrievalIndex, build
from training import evalset

VIS = {"public": ("public",), "internal": ("public", "internal")}


def evaluate(index: RetrievalIndex, examples: list[dict[str, Any]], assistant: Assistant) -> tuple[dict[str, float], list[dict[str, Any]]]:
    k = assistant.cfg["retrieval"]["top_k"]
    hits = rr = correct = answerable = declined = unanswerable = faithful = answered = leaks = 0
    failures = []
    for ex in examples:
        vis = VIS[ex["audience"]]
        retrieved = index.search(ex["question"], k, vis)
        if ex["audience"] == "public":
            leaks += sum(c["visibility"] != "public" for c in retrieved)
        a = assistant.ask(ex["question"], vis, index=index)
        if a.status == "answered":
            answered += 1
            faithful += a.unsupported_sentences == 0
        if ex["expected_doc_id"] is None:
            unanswerable += 1
            ok = a.status != "answered"
            declined += ok
        else:
            answerable += 1
            docs = [c["doc_id"] for c in retrieved]
            if ex["expected_doc_id"] in docs:
                hits += 1
                rr += 1.0 / (docs.index(ex["expected_doc_id"]) + 1)
            ok = (a.status == "answered" and ex["expected_doc_id"] in {c["doc_id"] for c in a.citations}
                  and ex["must_contain"].lower() in a.answer.lower())
            correct += ok
        if not ok:
            failures.append({"question": ex["question"], "audience": ex["audience"], "expected": ex["expected_doc_id"],
                             "status": a.status, "answer": a.answer[:160]})
    return {
        "recall_at_k": hits / max(1, answerable), "mrr": rr / max(1, answerable),
        "answer_correctness": correct / max(1, answerable), "faithfulness": faithful / max(1, answered),
        "abstention_accuracy": declined / max(1, unanswerable), "acl_leaks": float(leaks), "examples": float(len(examples)),
    }, failures


def gate(m: dict[str, float], production: dict[str, float] | None, cfg: dict[str, Any]) -> list[str]:
    g, fails = cfg["gates"], []
    for name, key in (("recall_at_k", "min_recall_at_k"), ("mrr", "min_mrr"), ("faithfulness", "min_faithfulness"),
                      ("abstention_accuracy", "min_abstention_accuracy")):
        if m[name] < g[key]:
            fails.append(f"{name} {m[name]:.3f} < {g[key]}")
    if m["acl_leaks"] > g["max_acl_leaks"]:
        fails.append(f"{int(m['acl_leaks'])} internal chunks were retrieved for a public reader")
    if production and m["answer_correctness"] < production["answer_correctness"] - g["max_regression_vs_production"]:
        fails.append(f"answer correctness {m['answer_correctness']:.3f} regresses against production "
                     f"{production['answer_correctness']:.3f} on the same evaluation set")
    return fails


def run(by: str = "pipeline") -> dict[str, Any]:
    cfg = load_yaml("configs/pipeline.yaml")
    fields = featurestore.feature_names(cfg["feature_view"])
    with db.tx() as conn:
        seeded = evalset.ensure_seeded(conn)
        chunks = [dict(r) for r in conn.execute(select(schema.chunks).order_by(schema.chunks.c.chunk_id)).mappings()]
        examples = evalset.load(conn)
        docs = {r[0]: r[1] for r in conn.execute(select(schema.documents.c.doc_id, schema.documents.c.content_hash))}
    if len(chunks) < 5:
        raise DataValidationError("fewer than 5 chunks ingested: nothing to index")
    index = build([{f: c[f] for f in fields} for c in chunks], fields, cfg["retrieval"]["dense_dimensions"], cfg["retrieval"]["rrf_k"])
    assistant = Assistant()
    metrics, failures = evaluate(index, examples, assistant)
    registry = Registry(settings().registry_dir)
    prod_metrics = prod_version = None
    try:
        prod, prod_manifest = registry.load(cfg["model_name"])
        prod_metrics, prod_version = evaluate(prod, examples, assistant)[0], prod_manifest["version"]
    except RegistryError:
        pass
    version = registry.register(
        cfg["model_name"], index, metrics={k: round(v, 5) for k, v in metrics.items()},
        params={"retriever": "bm25 + tfidf-svd, reciprocal rank fusion", **cfg["retrieval"], **cfg["chunking"],
                "generator": cfg["generation"]["provider"]},
        features=fields, training_data_hash=data_hash(sorted(docs.items())),
        extra={"documents": docs, "chunks": len(chunks), "eval_examples": len(examples), "failures": failures[:20],
               "built_at": db.now(), "production_at_build": {"version": prod_version, "metrics": prod_metrics}},
    )
    fails = gate(metrics, prod_metrics, cfg)
    promoted = False
    if not fails and cfg["gates"]["auto_promote"]:
        registry.promote(cfg["model_name"], version, by=by, reason="all promotion gates passed")
        promoted = True
    with db.tx() as conn:
        db.audit(conn, by, "index.build", f"{cfg['model_name']}/{version}", {"promoted": promoted, "failed_gates": fails})
    return {"version": version, "promoted": promoted, "failed_gates": fails, "documents": len(docs), "chunks": len(chunks),
            "eval_examples": len(examples), "seeded_examples": seeded, "metrics": {k: round(v, 4) for k, v in metrics.items()},
            "production_metrics_same_set": prod_metrics, "failures": failures}


if __name__ == "__main__":
    db.init_schema()
    print(json.dumps(run(), indent=2))
