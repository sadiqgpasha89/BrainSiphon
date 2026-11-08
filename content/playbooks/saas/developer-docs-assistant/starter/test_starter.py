"""Executable gates for milestones M1-M4. `pytest -q` must pass before you move on."""

import pytest

from baseline import run
from make_data import Chunk, generate
from rag import BM25, Answer, Reader, verify


def test_generator_is_deterministic_and_has_every_question_type():
    a, ga, dev = generate(17)
    b, gb, _ = generate(17)
    assert [c.text for c in a] == [c.text for c in b] and ga == gb
    assert {g["type"] for g in ga} == {"latest", "v1", "unanswerable"}
    assert any(c.kind == "changelog" for c in a)                      # the stale-value trap exists


def test_tuning_and_test_products_are_disjoint():
    _, gold, dev = generate(17)
    test_products = {g["product"] for g in gold if g["product"] not in dev}
    assert test_products and not test_products & dev


def test_bm25_ranks_the_matching_document_first():
    docs = ["payments allow 120 requests per minute", "auth tokens expire in 30 days", "files may be 25 MB"]
    s = BM25(docs).scores("requests per minute for payments")
    assert s.index(max(s)) == 0


def test_the_reader_does_not_mistake_the_version_tag_for_the_answer():
    c = Chunk(0, "payments", "v2", "reference", "[v2] payments API reference, limits. The payments API allows 120 requests per minute per API key.")
    assert Reader().answer("What is the rate limit for the payments API?", [c], "rate_limit").value == 120


def test_the_verifier_rejects_a_value_the_cited_chunk_does_not_contain():
    c = Chunk(0, "payments", "v2", "reference", "The payments API allows 120 requests per minute.")
    assert verify(Answer(120, 0, "x", False), {0: c}) is True
    assert verify(Answer(600, 0, "x", False), {0: c}) is False
    assert verify(Answer(None, None, None, True), {0: c}) is False


@pytest.fixture(scope="module")
def report():
    return run(17)


def test_naive_rag_hallucinates_on_unanswerable_questions_and_guarded_does_not(report):
    assert report["naive"]["hallucination_rate"] >= 0.9, report
    assert report["guarded"]["hallucination_rate"] <= 0.05, report


def test_guarded_answers_are_correct_when_given_and_better_overall(report):
    n, g = report["naive"], report["guarded"]
    assert g["answered_precision"] >= 0.95 and g["accuracy"] >= n["accuracy"] + 0.05, report
    assert g["abstained_on_answerable"] <= 0.40, report                # abstaining has a cost: bound it
    assert g["stale_or_changelog_errors"] == 0 and n["stale_or_changelog_errors"] >= 3, report


def test_a_valid_citation_does_not_prove_the_answer_is_right(report):
    assert report["naive"]["citation_support"] >= 0.99 and report["naive"]["accuracy"] < 0.7, report
