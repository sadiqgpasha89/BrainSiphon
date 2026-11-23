"""Executable gates for the extraction engine."""

from baseline import decode, rule_extract, run, shape
from make_data import generate

R = run()


def test_generator_is_deterministic():
    a, b = generate(20, 5, seed=4), generate(20, 5, seed=4)
    assert [d["tokens"] for d in a[0]] == [d["tokens"] for d in b[0]]


def test_layout_c_is_never_in_training():
    train, seen, unseen, _ = generate(200, 50, seed=2)
    assert {d["layout"] for d in train} == {"A", "B"} and {d["layout"] for d in unseen} == {"C"}


def test_gold_spans_match_the_text():
    train, *_ = generate(50, 5, seed=3)
    for d in train[:20]:
        assert all(v and v in d["text"] for v in d["gold"].values())


def test_rules_work_on_their_own_layout_and_fail_on_a_new_one():
    assert R["rules_seen_layout"]["macro_f1"] > 0.9
    assert R["rules_unseen_layout"]["macro_f1"] < 0.2


def test_the_tagger_generalises_better_than_rules_but_still_drops_on_a_new_layout():
    assert R["tagger_unseen_layout"]["macro_f1"] > R["rules_unseen_layout"]["macro_f1"]
    assert R["unseen_layout_drop"] > 0.05


def test_a_few_labelled_documents_from_the_new_layout_recover_most_of_the_drop():
    assert R["adaptation_recovers"] > 0.5 * R["unseen_layout_drop"]


def test_helpers():
    assert shape("INV-12") == "XXX-dd"
    assert decode(["Acme", "Corp", "x"], ["B-VENDOR", "I-VENDOR", "O"])["VENDOR"] == "Acme Corp"
    assert rule_extract({"text": "Invoice No: INV-1\nDate: 01/02/2024\nVendor: Acme\nTotal: 1.00"})["INVOICE_ID"] == "INV-1"
