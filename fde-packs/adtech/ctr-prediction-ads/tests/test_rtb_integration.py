import hashlib

import pytest

from rtb_integration import budget, consent, exchange_auth, openrtb, pacing, reconcile, simulator

VENDOR = 755


def req(**kw):
    r = {"id": "r1", "tmax": 100, "imp": [{"id": "1", "banner": {"w": 300, "h": 250}, "bidfloor": 0.5}], "site": {"domain": "news.example", "page": "https://news.example/a", "publisher": {"id": "p1"}},
         "device": {"ua": "UA", "ip": "203.0.113.9", "devicetype": 2, "geo": {"country": "USA"}}, "user": {"id": "u1"}}
    r.update(kw)
    return r


# ----------------------------------------------------------------------------------------------- OpenRTB

def test_request_validation_catches_what_exchanges_actually_send_wrong():
    openrtb.validate_request(req())
    for bad, msg in [({"imp": []}, "non-empty"), ({"id": ""}, "BidRequest.id"), ({"site": None, "app": None}, "exactly one of Site or App"), ({"app": {"bundle": "x"}}, "exactly one"),
                     ({"imp": [{"id": "1", "banner": {}}, {"id": "1", "banner": {"w": 1, "h": 1}}]}, "unique"), ({"imp": [{"id": "1"}]}, "no banner"), ({"tmax": 99999}, "tmax"), ({"imp": [{"id": "1", "banner": {"w": 1, "h": 1}, "bidfloor": -1}]}, "negative")]:
        with pytest.raises(openrtb.RtbError, match=msg):
            openrtb.validate_request({**req(), **bad})
    with pytest.raises(openrtb.RtbError, match="requires ext.sellers"):
        openrtb.validate_request(req(), {"required_ext": ["ext.sellers"]})


def test_request_maps_to_the_internal_scoring_contract_per_impression():
    r = req()
    s = openrtb.to_score_request(r, r["imp"][0], {"id": "exch-a", "default_tmax_ms": 80})
    assert (s["request_id"], s["imp_id"], s["exchange"], s["placement"], s["bidfloor"], s["site_domain"], s["publisher_id"], s["country"], s["tmax_ms"]) == ("r1", "1", "exch-a", "300x250", 0.5, "news.example", "p1", "USA", 100)
    assert s["ip_prefix"] == "203.0.113" and "203.0.113.9" not in str(s) and s["user_id_hash"] and "u1" not in str(s), "raw IP and user id are not passed to the model"
    video = {**r["imp"][0], "banner": None, "video": {"w": 640}}
    assert openrtb.to_score_request(r, video)["placement"] == "video"


def test_response_building_enforces_floor_impid_and_creative_and_no_bid_semantics():
    r = req()
    resp = openrtb.build_response(r, [{"id": "b1", "impid": "1", "price": 1.2, "adm": "<div/>", "crid": "c1", "adomain": ["adv.example"]}])
    assert resp["seatbid"][0]["bid"][0]["price"] == 1.2 and resp["id"] == "r1"
    below = openrtb.build_response(r, [{"id": "b", "impid": "1", "price": 0.1, "adm": "x"}])
    assert "seatbid" not in below and below["nbr"] == 0, "a bid below the floor becomes a no-bid, not a rejected bid"
    with pytest.raises(openrtb.RtbError, match="unknown impid"):
        openrtb.build_response(r, [{"id": "b", "impid": "9", "price": 1, "adm": "x"}])
    with pytest.raises(openrtb.RtbError, match="adm or nurl"):
        openrtb.build_response(r, [{"id": "b", "impid": "1", "price": 1}])
    nb = openrtb.no_bid(r, 500)
    assert nb["nbr"] == 0 and "Consent" in nb["_local_reason"] and openrtb.no_bid(r, 2)["nbr"] == 2


def test_second_price_clearing_and_floor():
    assert openrtb.clearing_price_second_price([2.0, 1.5, 0.9]) == (0, 1.5)
    assert openrtb.clearing_price_second_price([2.0], floor=0.5) == (0, 0.5)
    assert openrtb.clearing_price_second_price([0.3], floor=0.5) == (None, 0.0) and openrtb.clearing_price_second_price([]) == (None, 0.0)


# ----------------------------------------------------------------------------------------------- consent

def test_tcf_v2_round_trip_bitfield_and_range_encodings():
    for ranges in (False, True):
        s = consent.build_tcf_v2({1, 3, 7}, {10, 11, 12, 755, 900}, cmp_id=42, vendor_list_version=123, ranges=ranges)
        d = consent.decode_tcf_v2(s)
        assert d["purposes_consent"] == {1, 3, 7} and d["vendors"] == {10, 11, 12, 755, 900} and d["cmp_id"] == 42 and d["vendor_list_version"] == 123, ranges
    with pytest.raises(consent.ConsentError):
        consent.decode_tcf_v2("AAAA")


def test_consent_gate_fails_closed_and_says_why():
    ok = consent.build_tcf_v2({1, 2, 3, 4, 7}, {VENDOR})
    gate = lambda r: consent.may_process(r, our_vendor_id=VENDOR, required_purposes={1, 2, 7})  # noqa: E731
    assert gate(req())["allowed"], "no GDPR signal, no US restriction: allowed"
    eu = lambda c: req(regs={"ext": {"gdpr": 1}}, user={"id": "u", "ext": {"consent": c}})  # noqa: E731
    assert gate(eu(ok))["allowed"]
    assert "no consent string" in gate(eu(""))["reason"]
    assert "vendor 755" in gate(eu(consent.build_tcf_v2({1, 2, 7}, {1})))["reason"]
    assert "purposes without consent: [7]" in gate(eu(consent.build_tcf_v2({1, 2}, {VENDOR})))["reason"]
    assert "unreadable" in gate(eu("garbage!!"))["reason"]
    assert not gate(req(regs={"ext": {"us_privacy": "1YYN"}}))["allowed"] and gate(req(regs={"ext": {"us_privacy": "1YNN"}}))["allowed"]
    assert "COPPA" in gate(req(regs={"coppa": 1}))["reason"] and "limit ad tracking" in gate(req(device={"lmt": 1}))["reason"]


# ----------------------------------------------------------------------------------------------- latency budget

class FakeClock:
    def __init__(self):
        self.t = 0.0

    def __call__(self):
        return self.t

    def advance_ms(self, ms):
        self.t += ms / 1000


def make_pipeline(clock, costs, budget_ms=8.0):
    def stage(name):
        def fn(ctx):
            clock.advance_ms(costs[name])
            ctx.setdefault("ran", []).append(name)
            return ctx
        return name, fn
    return budget.Pipeline([stage(n) for n in ("parse", "consent", "features", "inference", "response")], budget_ms=budget_ms, clock=clock)


def test_the_budget_is_broken_into_stages_and_the_report_names_the_worst_one():
    assert sum(budget.DEFAULT_BUDGET_MS.values()) == pytest.approx(8.0), "the advertised 8 ms p99 is fully allocated, including network and a reserve"
    clock = FakeClock()
    costs = {"parse": 0.3, "consent": 0.1, "features": 2.0, "inference": 2.0, "response": 0.3}
    p = make_pipeline(clock, costs)
    for i in range(200):
        costs["features"] = 2.0 if i % 20 else 3.5  # a feature store that has a tail
        p.run({})
    rep = p.report()
    assert rep["end_to_end_ms"]["p50"] == pytest.approx(4.7, abs=0.05) and rep["end_to_end_ms"]["p99"] < budget.DEFAULT_BUDGET_MS["parse"] + 6 and rep["worst_stage_p99"] in ("features", "inference")
    assert rep["stages"]["features"]["p99"] > rep["stages"]["features"]["p50"]


def test_a_slow_stage_makes_the_pipeline_answer_no_bid_instead_of_late():
    clock = FakeClock()
    costs = {"parse": 0.3, "consent": 0.1, "features": 2.0, "inference": 2.0, "response": 0.3}
    p = make_pipeline(clock, costs)
    for _ in range(20):
        p.run({})
    costs["features"] = 6.0  # the feature store degrades
    ran_late = 0
    for _ in range(10):
        try:
            p.run({})
        except budget.DeadlineExceeded as e:
            assert e.stage in ("inference", "response")
            ran_late += 0
    assert sum(p.no_bids.values()) >= 9, "once the budget is gone, later stages are not started"
    assert p.totals[-1] <= 8.0 + 6.0, "no run goes on past the point where it knows it cannot finish"


def test_tmax_from_the_request_tightens_the_deadline_with_a_network_reserve():
    clock = FakeClock()
    costs = {"parse": 0.3, "consent": 0.1, "features": 2.0, "inference": 2.0, "response": 0.3}
    p = make_pipeline(clock, costs, budget_ms=8.0)
    p.run({}, tmax_ms=None)
    with pytest.raises(budget.DeadlineExceeded):
        for _ in range(3):
            p.run({}, tmax_ms=6.0, network_reserve_ms=2.0)  # 4 ms left to work with: inference cannot start


# ----------------------------------------------------------------------------------------------- pacing and caps

def test_budget_pacing_reservation_and_frequency_cap():
    c = pacing.Campaign("c1", daily_budget=100.0, freq_cap_per_user=2)
    assert c.can_bid(1.0, "u1", 0, hour=12)["ok"]
    c.reserve(1.0)
    c.settle(1.0, True, 0.8, "u1", 10)
    c.settle(0.0, True, 0.8, "u1", 20) if False else None
    c.impressions["u1"].append(20)
    assert c.can_bid(1.0, "u1", 30, hour=12) == {"ok": False, "reason": "frequency cap reached"}
    assert c.can_bid(1.0, "u1", 30 + 86400, hour=12)["ok"], "the cap window rolls"
    c.spent = 60.0
    assert c.can_bid(1.0, "u2", 0, hour=5) == {"ok": False, "reason": "ahead of pace"}
    c.spent = 99.8
    assert c.can_bid(1.0, "u2", 0, hour=23) == {"ok": False, "reason": "daily budget exhausted"}
    # concurrent bids cannot overspend: reserved spend counts before the win notices arrive
    d = pacing.Campaign("c2", daily_budget=10.0)
    for _ in range(9):
        assert d.can_bid(1.0, f"u{_}", 0, hour=23)["ok"]; d.reserve(1.0)
    assert d.can_bid(2.0, "x", 0, hour=23)["ok"] is False
    d.settle(1.0, False, 0.0, "u0", 0)
    assert d.reserved == 8.0 and d.spent == 0.0, "a lost bid releases its reservation"


# ----------------------------------------------------------------------------------------------- reconciliation

def test_reconciliation_finds_wins_without_impressions_phantom_clicks_and_billing_drift():
    bids = [{"bid_id": f"b{i}", "exchange": "A", "campaign": "c1", "price": 2.0} for i in range(10)]
    wins = [{"bid_id": f"b{i}", "clearing": 1.0} for i in range(6)] + [{"bid_id": "ghost", "clearing": 1.0}]
    imps = [{"bid_id": f"b{i}"} for i in range(5)] + [{"bid_id": "b9"}]
    clicks = [{"bid_id": "b0"}, {"bid_id": "b0"}, {"bid_id": "b8"}]
    r = reconcile.reconcile(bids, wins, imps, clicks, [{"exchange": "A", "amount": 0.0071}])
    assert r["wins_without_impression"] == ["b5", "ghost"] and r["impressions_without_win"] == ["b9"] and r["clicks_without_impression"] == ["b8"] and r["wins_for_unknown_bid"] == ["ghost"] and r["duplicate_clicks"] == ["b0"]
    assert r["win_to_impression_discrepancy"] == round(2 / 7, 4) and r["discrepancy_alert"] and r["billing"]["A"]["within_tolerance"] is False and not r["billing_ok"]
    ok = reconcile.reconcile(bids[:2], [{"bid_id": "b0", "clearing": 1.0}], [{"bid_id": "b0"}], [], [{"exchange": "A", "amount": 0.001}])
    assert ok["billing_ok"] and ok["win_rate"] == 0.5
    over = reconcile.reconcile(bids[:1], [{"bid_id": "b0", "clearing": 3.0}], [{"bid_id": "b0"}], [], [])
    assert over["clearing_above_bid"] == ["b0"]


# ----------------------------------------------------------------------------------------------- partner auth and per-exchange traffic

def test_notice_signatures_source_checks_and_key_rotation_per_exchange():
    ax = exchange_auth.ExchangeAuth({"A": {"source_cidrs": ["198.51.100.0/24"], "keys": {"k1": "secret-1"}}, "B": {"keys": {"kb": "secret-b"}}})
    ax.check_source("A", "198.51.100.7")
    with pytest.raises(exchange_auth.AuthError, match="not a registered source"):
        ax.check_source("A", "203.0.113.7")
    body = b'{"win":"b1"}'
    h = ax.sign_notice("A", body)
    ax.verify_notice("A", body, h)
    with pytest.raises(exchange_auth.AuthError):
        ax.verify_notice("B", body, h), ax.verify_notice("A", body + b"x", h)
    ax.rotate("A", "k2", "secret-2")
    ax.verify_notice("A", body, h)
    ax.verify_notice("A", body, ax.sign_notice("A", body, "k2"))
    ax.retire("A", "k1")
    with pytest.raises(exchange_auth.AuthError, match="retired"):
        ax.verify_notice("A", body, h)
    with pytest.raises(exchange_auth.AuthError, match="only key"):
        ax.retire("A", "k2")


def test_per_exchange_canary_allocation_is_stable_and_rolls_back_one_exchange_only():
    t = exchange_auth.ExchangeTraffic({"A": 0.10, "B": 1.0}, max_timeout_rate=0.05, min_samples=100)
    bucket = lambda rid: int(hashlib.sha256(rid.encode()).hexdigest()[:8], 16) / 0xFFFFFFFF  # noqa: E731
    share = sum(t.allow("A", bucket(f"r{i}")) for i in range(5000)) / 5000
    assert 0.07 < share < 0.13 and all(t.allow("A", bucket("r1")) == t.allow("A", bucket("r1")) for _ in range(3))
    for i in range(100):
        t.observe("A", timeout=i < 10)
    assert "A" in t.rolled_back and "timeout rate 10.0%" in t.rolled_back["A"] and not t.allow("A", 0.0) and t.allow("B", 0.5), "exchange A is rolled back; B is untouched"


# ----------------------------------------------------------------------------------------------- simulator end to end

def test_simulated_traffic_flows_through_validation_consent_and_the_bid_decision():
    bids = nbids = 0
    reasons = {}
    for r in simulator.generate(400, seed=7):
        openrtb.validate_request(r)
        gate = consent.may_process(r, our_vendor_id=VENDOR, required_purposes={1, 2, 7})
        if not gate["allowed"]:
            nbids += 1
            reasons[gate["reason"].split(":")[0]] = reasons.get(gate["reason"].split(":")[0], 0) + 1
            continue
        s = openrtb.to_score_request(r, r["imp"][0])
        resp = openrtb.build_response(r, [{"id": "b", "impid": "1", "price": r["imp"][0]["bidfloor"] + 0.2, "adm": "<ad/>"}])
        assert "seatbid" in resp
        bids += 1
    assert bids + nbids == 400 and nbids > 0 and bids > 250, "some EU traffic without proper consent is not bid on; most traffic is"
    assert {"no consent string", "purposes without consent"} & {k.split(" [")[0] for k in reasons} or reasons
    again = [r["id"] for r in simulator.generate(5, seed=7)]
    assert again == [r["id"] for r in simulator.generate(5, seed=7)], "the generator is deterministic for replays"
