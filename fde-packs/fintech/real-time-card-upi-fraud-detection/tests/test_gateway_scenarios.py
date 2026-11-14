import socket
import struct
import threading
import time

import pytest

from fraud_switch import iso8583 as iso
from fraud_switch.canary import Canary
from fraud_switch.gateway import Gateway, SwitchClient
from fraud_switch.hsm import SoftwareTokeniser
from fraud_switch.ledger import Ledger
from fraud_switch.reconcile import reconcile, to_markdown
from fraud_switch.replay import load_jsonl, percentile, replay
from fraud_switch.scorer import StubScorer, legacy_rules

import os

FIX = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "fixtures")


def auth(over=None):
    f = {2: "4111111111111111", 3: "000000", 4: "000000012000", 7: "0314093000", 11: "000123", 12: "093000", 13: "0314", 18: "5411", 22: "051", 32: "410001", 37: "607309000123", 41: "TERM0001", 42: "MERCHANT000001 ", 49: "356"}
    f.update(over or {})
    return iso.IsoMessage("0100", f)


@pytest.fixture
def gw():
    scorer = StubScorer()
    g = Gateway(scorer, SoftwareTokeniser({"k1": b"dev"}, "k1"), deadline_ms=15.0, partial_supported=True)
    g.scorer_obj = scorer
    yield g
    g.close()


def client(g, ms=500.0):
    return SwitchClient("127.0.0.1", g.port, ms)


def test_approve_step_up_block_and_format_error_over_tcp(gw):
    c = client(gw)
    assert c.send(auth()).get(39) == "00" and c.send(auth()).mti == "0110"
    assert c.send(auth({4: "000010000000", 18: "6051", 22: "812", 11: "000200", 37: "607309000200"})).get(39) == "1A"
    assert c.send(auth({4: "000025000000", 18: "7995", 22: "812", 11: "000201", 37: "607309000201"})).get(39) == "59"
    # a frame whose payload is not ISO 8583 gets a format error, not a hang or a crash
    with socket.create_connection(("127.0.0.1", gw.port), timeout=2) as s:
        s.sendall(struct.pack("!H", 12) + b"NOT-ISO-8583")
        n = struct.unpack("!H", s.recv(2))[0]
        assert iso.unpack(s.recv(n)).get(39) == "30"
    assert gw.stats["format_errors"] == 1


def test_duplicate_transmission_returns_the_stored_decision_without_rescoring(gw):
    c = client(gw)
    first = c.send(auth())
    calls = gw.scorer_obj.calls
    again = c.send(iso.IsoMessage("0101", auth().f))  # the repeat flag is the same transaction
    assert again.get(39) == first.get(39) and again.get(38) == first.get(38)
    assert gw.scorer_obj.calls == calls, "a retransmission must not call the model again"
    assert gw.stats["duplicates"] == 1 and gw.ledger.counts().get("duplicate") == 1
    # the model changing its mind between attempts must not change the answer the switch sees
    gw.scorer_obj.latency_ms = 1.0
    gw.scorer_obj.version = "stub-v2"
    assert c.send(auth()).get(38) == first.get(38)


def test_concurrent_retransmissions_are_scored_exactly_once(gw):
    gw.scorer_obj.latency_ms = 8.0
    out = []

    def go():
        out.append(client(gw).send(auth({11: "000900", 37: "607309000900"})).get(39))

    ts = [threading.Thread(target=go) for _ in range(8)]
    [t.start() for t in ts]; [t.join() for t in ts]
    assert len(set(out)) == 1 and gw.scorer_obj.calls == 1, (out, gw.scorer_obj.calls)


def test_same_key_with_a_different_amount_is_a_conflict_not_a_duplicate(gw):
    c = client(gw)
    c.send(auth())
    r = c.send(auth({4: "000000999999"}))
    assert r.get(39) == "94" and gw.stats["conflicts"] == 1


def test_reversal_marks_the_original_and_is_always_accepted_even_for_an_unknown_original(gw):
    c = client(gw)
    orig = auth()
    c.send(orig)
    de90 = "0100" + "000123" + "0314093000" + "410001".zfill(11) + "0".zfill(11)
    rev = iso.IsoMessage("0400", {**orig.f, 11: "000124", 90: de90})
    r = c.send(rev)
    assert r.mti == "0410" and r.get(39) == "00"
    k = Ledger.key_of(orig)
    assert gw.ledger.get(k)["reversed"] is True and gw.ledger.counts().get("reversal") == 1
    unknown = iso.IsoMessage("0400", {**orig.f, 11: "000999", 37: "607309000999", 90: "0100" + "000555" + "0314093000" + "410001".zfill(11) + "0".zfill(11)})
    assert c.send(unknown).get(39) == "00" and gw.ledger.counts().get("orphan_reversal") == 1


def test_advice_is_recorded_and_never_declined(gw):
    adv = iso.IsoMessage("0220", {**auth().f, 39: "00", 11: "000300", 37: "607309000300"})
    r = client(gw).send(adv)
    assert r.mti == "0230" and r.get(39) == "00" and gw.ledger.counts().get("advice") == 1 and gw.scorer_obj.calls == 0


def test_timeout_ambiguity_the_switch_retries_after_its_own_timeout_and_gets_the_same_answer():
    scorer = StubScorer(latency_ms=40.0)  # slower than the deadline: the gateway answers from the fallback
    g = Gateway(scorer, SoftwareTokeniser({"k1": b"dev"}, "k1"), deadline_ms=10.0)
    try:
        c = client(g, 500)
        first = c.send(auth())
        assert g.stats["fallback"] == 1
        scorer.latency_ms = 1.0  # the model has recovered, but the transaction already has its decision
        second = c.send(auth())
        assert second.get(39) == first.get(39) and g.stats["fallback"] == 1 and g.stats["duplicates"] == 1
        dec = g.ledger.get(Ledger.key_of(auth()))
        assert dec["source"] == "stand-in" and any(r.startswith("STAND_IN") for r in dec["reason_codes"])
    finally:
        g.close()


def test_a_switch_that_times_out_before_the_response_sees_a_late_answer_it_must_discard():
    scorer = StubScorer(latency_ms=30.0)
    g = Gateway(scorer, SoftwareTokeniser({"k1": b"dev"}, "k1"), deadline_ms=100.0)
    try:
        with pytest.raises(OSError):
            client(g, 5).send(auth())  # the switch gives up after 5 ms
        # the gateway still finished and stored the decision: the retransmission gets it instantly
        time.sleep(0.1)
        t0 = time.perf_counter()
        r = client(g, 500).send(auth())
        assert r.get(39) == "00" and (time.perf_counter() - t0) < 0.05 and scorer.calls == 1
    finally:
        g.close()


def test_stand_in_when_the_scoring_service_is_down_uses_the_legacy_rules_and_says_so():
    g = Gateway(StubScorer(fail=True), SoftwareTokeniser({"k1": b"dev"}, "k1"), deadline_ms=10.0)
    try:
        r = client(g).send(auth())
        assert r.get(39) == "00"
        risky = client(g).send(auth({4: "000010000000", 18: "6051", 11: "000400", 37: "607309000400"}))
        assert risky.get(39) == "59"
        assert g.stats["fallback"] == 2 and g.stats["scored"] == 0
    finally:
        g.close()


def test_partial_approval_flows_through_the_switch_response():
    g = Gateway(StubScorer(), SoftwareTokeniser({"k1": b"dev"}, "k1"), partial_supported=True)
    try:
        big = auth({4: "000005000000", 22: "812", 11: "000500", 37: "607309000500"})  # 50,000.00 e-commerce: policy approves half
        r = client(g).send(big)
        assert r.get(39) == "10" and r.get(4) == "000005000000" and r.get(54).endswith("000002500000")
    finally:
        g.close()


def test_ledger_chain_detects_tampering_and_survives_many_decisions(gw):
    c = client(gw)
    for i in range(20):
        c.send(auth({11: str(1000 + i), 37: str(607309001000 + i)}))
    assert gw.ledger.verify_chain()
    gw.ledger.db.execute("UPDATE decisions SET decision = replace(decision, 'ALLOW', 'BLOCK') WHERE seq = 5")
    assert not gw.ledger.verify_chain()


# ------------------------------------------------------------------------------------------- canary, rollback, replay, reconcile

def test_canary_assignment_is_stable_per_card_and_roughly_the_requested_share():
    c = Canary(pct=10.0)
    toks = [f"k1:{i:08d}" for i in range(5000)]
    first = [c.use_model(t) for t in toks]
    assert first == [c.use_model(t) for t in toks], "the same card always lands on the same side"
    assert 0.07 < sum(first) / len(first) < 0.13
    c.ramp(100.0)
    assert all(c.use_model(t) for t in toks[:200])


def test_canary_rolls_back_to_legacy_rules_when_the_model_stops_answering():
    scorer = StubScorer(fail=True)
    can = Canary(pct=100.0, min_samples=10, max_standin_rate=0.05)
    g = Gateway(scorer, SoftwareTokeniser({"k1": b"dev"}, "k1"), canary=can, deadline_ms=10)
    try:
        for i in range(15):
            client(g).send(auth({11: str(2000 + i), 37: str(607309002000 + i), 2: f"41111111111{i:05d}"}))
        assert can.rolled_back and "stand-in rate" in can.rolled_back and can.pct == 0.0
        calls = scorer.calls
        r = client(g).send(auth({11: "002100", 37: "607309002100", 2: "4222222222222222"}))
        assert r.get(39) == "00" and scorer.calls == calls, "after rollback the model is not called at all"
        dec = g.ledger.get(Ledger.key_of(auth({11: "002100", 37: "607309002100", 2: "4222222222222222"})))
        assert dec["source"] == "legacy"
        with pytest.raises(RuntimeError, match="rollback"):
            can.ramp(50)
        can.reset(); can.ramp(50)
    finally:
        g.close()


def test_replay_measures_switch_side_latency_and_agreement_with_legacy(gw):
    rows = load_jsonl(os.path.join(FIX, "iso8583_replay.jsonl"))[:120]
    rep = replay(rows, client(gw), budget_ms=15.0)
    assert rep["count"] == 120 and rep["timeouts"] == 0
    assert rep["latency_ms"]["p99"] < 100, rep["latency_ms"]
    assert rep["legacy_agreement"]["agree"] + rep["legacy_agreement"]["disagree"] == 120
    assert percentile([1, 2, 3, 4, 100], 50) == 3 and percentile([], 99) == 0.0


def test_reconciliation_finds_each_class_of_discrepancy():
    D = lambda t, a, src="model", tok="c1", amt=1000, ts=100: {"txn": t, "action": a, "source": src, "card_token": tok, "amount_minor": amt, "ts": ts}  # noqa: E731
    decisions = [D("t1", "ALLOW"), D("t2", "ALLOW"), D("t3", "BLOCK", tok="c2", ts=100), D("t4", "ALLOW", tok="c2", ts=160), D("t5", "ALLOW", "stand-in"), D("t6", "STEP_UP", tok="c9", ts=5)]
    outcomes = [{"txn": "t1", "switch_code": "00"}, {"txn": "t2", "switch_code": "05"}, {"txn": "t3", "switch_code": "59"}, {"txn": "t4", "switch_code": "00"}, {"txn": "t5", "switch_code": "00"}, {"txn": "tX", "switch_code": "00"}]
    r = reconcile(decisions, outcomes, chargebacks=[{"txn": "t1"}], fraud_labels=[{"txn": "t5"}])
    assert r["decisions"] == 6 and r["by_source"] == {"model": 5, "stand-in": 1}
    assert [m["txn"] for m in r["decision_vs_switch"]["examples"]] == ["t2"], "we said ALLOW and the switch answered 05"
    assert r["fraud_allowed"]["txns"] == ["t1", "t5"]
    assert r["probable_false_declines"]["count"] == 1 and r["probable_false_declines"]["examples"][0]["declined"] == "t3"
    assert r["unaccounted"] == {"decisions_without_switch_outcome": 1, "outcomes_without_decision": 1}
    assert "Fraud allowed through" in to_markdown(r)


def test_legacy_rules_are_the_documented_fallback():
    base = dict(amount=10.0, mcc="5411", entry_mode="chip")
    assert legacy_rules(base).action == "ALLOW"
    assert legacy_rules({**base, "amount": 150000.0, "mcc": "6051"}).action == "BLOCK"
    assert legacy_rules({**base, "amount": 150000.0}).action == "STEP_UP"
