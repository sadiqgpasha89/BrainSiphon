"""Retrieval, access control, grounded generation, citation verification, abstention, and the evaluation gates."""

from bsref.config import load_yaml, settings
from bsref.registry import Registry
from serving import answer, llm
from serving.answer import Assistant
from training import train

PUBLIC, STAFF = ("public",), ("public", "internal")


def _index():
    return Registry(settings().registry_dir).load("docs-index")[0]


def test_first_index_passes_every_gate(world):
    r = world["index"]
    m = r["metrics"]
    assert r["promoted"] and r["failed_gates"] == []
    assert m["recall_at_k"] >= 0.9 and m["mrr"] >= 0.75 and m["faithfulness"] >= 0.95 and m["acl_leaks"] == 0
    assert m["answer_correctness"] >= 0.9 and m["abstention_accuracy"] >= 0.8 and r["eval_examples"] == 35


def test_access_control_filters_before_ranking(world):
    idx = _index()
    q = "Who has to approve a discount above 20 percent?"
    assert all(c["visibility"] == "public" for c in idx.search(q, 50, PUBLIC))  # even with k larger than the corpus
    assert idx.search(q, 5, STAFF)[0]["doc_id"] == "internal-discount-policy"
    a = Assistant()
    assert a.ask(q, PUBLIC).status == "abstained" and "VP of Sales" in a.ask(q, STAFF).answer


def test_near_duplicates_are_distinguished(world):
    idx = _index()
    for name in ("orders", "invoices", "customers", "refunds", "payouts", "reports"):
        assert idx.search(f"How many requests per minute does the {name} endpoint allow?", 5, PUBLIC)[0]["doc_id"] == f"rate-limits-{name}"


def test_off_topic_questions_are_declined_and_sent_nowhere_else(world):
    a = Assistant()
    for q in ("What is the weather in Paris today?", "Does Kestrel offer a GraphQL interface?"):
        out = a.ask(q, PUBLIC)
        assert out.status == "abstained" and out.citations == []


def test_unsupported_or_fabricated_citations_are_removed(world, monkeypatch):
    """Whatever the generator returns is verified: a sentence its chunk does not support, or one citing a chunk that was not
    retrieved, is dropped; if nothing survives, the assistant abstains."""
    a = Assistant()
    good = "Idempotency keys are stored for 24 hours."

    def fake(question, retrieved, index, n):
        cid = next(c["chunk_id"] for c in retrieved if c["doc_id"] == "idempotency" and "24 hours" in c["text"])
        return [{"text": good, "chunk_id": cid}, {"text": "Keys are also mirrored to three regions for durability.", "chunk_id": cid},
                {"text": good, "chunk_id": "made-up#9"}]

    monkeypatch.setattr(llm, "extractive", fake)
    out = a.ask("How long are idempotency keys stored?", PUBLIC)
    assert out.status == "answered" and out.unsupported_sentences == 2 and out.answer.count("24 hours") == 1 and "regions" not in out.answer
    monkeypatch.setattr(llm, "extractive", lambda *args: [{"text": "The moon is made of cheese.", "chunk_id": args[1][0]["chunk_id"]}])
    assert a.ask("How long are idempotency keys stored?", PUBLIC).status == "abstained"
    assert answer.support(good, "Idempotency keys are stored for 24 hours. After that...") == 1.0


def test_gates_reject_leaks_poor_retrieval_and_regressions():
    cfg = load_yaml("configs/pipeline.yaml")
    good = {"recall_at_k": 1.0, "mrr": 0.9, "faithfulness": 1.0, "abstention_accuracy": 0.9, "acl_leaks": 0.0, "answer_correctness": 0.95}
    assert train.gate(good, good, cfg) == []
    assert "internal chunks" in train.gate({**good, "acl_leaks": 1.0}, None, cfg)[0]
    assert len(train.gate({**good, "recall_at_k": 0.5}, None, cfg)) == 1
    assert "regresses" in train.gate({**good, "answer_correctness": 0.8}, good, cfg)[0]
