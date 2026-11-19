import datetime as dt
import json
import math
import os

import pytest

from fde_adapters.core import registry
from branch_integration import approval, footfall, reports, staffing, wfm

CFG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "config")
D = lambda s: dt.date.fromisoformat(s)  # noqa: E731
UTC = dt.timezone.utc


# ---------------------------------------------------------------------------------------- sensor failures and imputation

def test_sensor_failures_zero_with_tickets_flatline_partial_block_and_missing():
    counts = [5, 12, 0, 0, 30, 30, 30, 30, 30, 5, None, 20]
    tickets = [6, 13, 9, 8, 31, 33, 29, 30, 31, 25, 10, 21]
    f = footfall.detect_sensor_failures(counts, tickets)
    why = {x["i"]: x["why"] for x in f}
    assert "zero visitors counted while 9 queue tickets" in why[2] and 3 in why and "flat run" in why[6] and set(range(4, 9)) <= set(why) and "partly blocked" in why[9] and why[10] == "missing"
    assert 0 not in why and 1 not in why and 11 not in why
    closed = footfall.detect_sensor_failures([0, 0, 0], [0, 0, 0], open_mask=[False, False, False])
    assert closed == [], "a closed branch with zero visitors is not a failure"


def test_imputation_uses_the_ticket_ratio_then_last_week_and_marks_the_interval_to_widen():
    counts = [10, 20, 0, 30, None]
    tickets = [10, 20, 15, 30, 0]
    flags = footfall.detect_sensor_failures(counts, tickets)
    r = footfall.impute(counts, flags, tickets, same_hour_last_week=[9, 19, 14, 28, 7])
    assert r["values"][2] == 15.0 and r["imputed"][2] == "ticket-ratio" and r["interval_widen_factor"][2] == 1.5
    assert r["values"][4] == 7.0 and r["imputed"][4] == "same hour last week" and r["interval_widen_factor"][4] == 2.0
    none = footfall.impute([None], [{"i": 0, "why": "missing"}], None, None)
    assert none["values"] == [None] and "no basis" in none["imputed"][0]


# ---------------------------------------------------------------------------------------- identifiers, time zones, calendar, cold start

def master():
    return footfall.BranchMaster(json.load(open(os.path.join(CFG, "branch-master.json")))["branches"])


def test_every_systems_branch_identifier_resolves_to_one_canonical_id_and_conflicts_are_refused():
    m = master()
    assert {m.resolve("queue", "BR-0012"), m.resolve("queue", "12"), m.resolve("hr", "12"), m.resolve("wfm", "loc_0012"), m.resolve("sensor", "SENSOR-12B"), m.resolve("gl", "CC-4412")} == {"BR0012"}
    assert m.resolve("queue", "BR-9999") is None and m.resolve("hr", "34") == "BR0034"
    with pytest.raises(ValueError, match="claimed by two"):
        footfall.BranchMaster([{"branch_id": "A", "aliases": {"hr": ["1"]}}, {"branch_id": "B", "aliases": {"hr": ["1"]}}])


def test_time_zones_and_the_two_daylight_saving_transitions():
    m = master()
    assert m.local_hour("BR0012", dt.datetime(2026, 3, 14, 4, 0, tzinfo=UTC))["hour"] == 9, "India is UTC+5:30: 04:00 UTC is 09:30 local, hour 9"
    boston = lambda h, d=1, mo=11: m.local_hour("BR0034", dt.datetime(2026, mo, d, h, 30, tzinfo=UTC))  # noqa: E731
    assert boston(5)["ambiguous"] is True and boston(6)["ambiguous"] is True, "2026-11-01: 01:30 local happens twice in Boston"
    assert boston(8)["ambiguous"] is False
    spring = m.local_hour("BR0034", dt.datetime(2026, 3, 8, 7, 30, tzinfo=UTC))  # 03:30 EDT, the hour after the skipped 02:00
    assert spring["hour"] == 3 and not spring["ambiguous"]
    assert len({(m.local_hour("BR0034", dt.datetime(2026, 11, 1, h, 0, tzinfo=UTC))["hour"]) for h in (4, 5, 6, 7)}) == 3, "four UTC hours map to three distinct local hours: the day has 25 hours"


def test_opening_hours_holidays_closures_and_refits_are_excluded_from_history_with_a_reason():
    cal = footfall.Calendar({0: (9, 17), 1: (9, 17), 2: (9, 17), 3: (9, 17), 4: (9, 17), 5: (9, 13)}, holidays={D("2026-03-17")}, closures=[(D("2026-03-23"), D("2026-04-10"), "refit")])
    assert cal.is_open(D("2026-03-16"), 9) and not cal.is_open(D("2026-03-16"), 17) and not cal.is_open(D("2026-03-17"), 10) and not cal.is_open(D("2026-03-29"), 10) and not cal.is_open(D("2026-03-24"), 10) and cal.is_open(D("2026-03-21"), 12)
    assert cal.exclusion_reason(D("2026-03-24")) == "refit" and cal.exclusion_reason(D("2026-03-17")) == "holiday" and cal.exclusion_reason(D("2026-03-16")) == ""


def test_cold_start_for_a_new_or_renovated_branch_borrows_peer_profiles_scaled_by_catchment():
    peers = [{"id": f"P{i}", "format": "urban", "region": "W", "catchment": 40000 + i * 5000, "hourly": [0] * 9 + [10 + i, 14 + i, 18 + i, 12 + i]} for i in range(5)] + [{"id": "R1", "format": "rural", "region": "W", "catchment": 8000, "hourly": [0] * 9 + [3, 4, 5, 3]}]
    r = footfall.cold_start({"format": "urban", "region": "W", "catchment": 50000}, peers, k=3)
    assert len(r["peers"]) == 3 and "R1" not in r["peers"] and r["profile"][9] > 0 and r["profile"][:9] == [0.0] * 9
    assert footfall.cold_start({"format": "mobile", "region": "W", "catchment": 1}, peers)["profile"] is None


# ---------------------------------------------------------------------------------------- queueing and requirement

def test_erlang_c_matches_an_independent_recursion_and_known_properties():
    def independent(n, a):  # sum formulation
        top = a**n / math.factorial(n) * n / (n - a)
        return top / (sum(a**k / math.factorial(k) for k in range(n)) + top)
    for n, a in [(12, 10.0), (5, 3.5), (30, 25.0), (2, 1.0)]:
        assert staffing.erlang_c(n, a) == pytest.approx(independent(n, a), rel=1e-9)
    assert staffing.erlang_c(3, 3.0) == 1.0 and staffing.erlang_c(100, 1.0) < 1e-12
    sl = [staffing.service_level(n, 30, 6, 5) for n in range(4, 12)]
    assert all(b >= a for a, b in zip(sl, sl[1:])) and sl[0] < 0.8 < sl[-1], "more agents never makes service worse"


def test_agents_needed_meets_the_target_and_not_one_more_than_needed():
    for lam in (6, 20, 45):
        n = staffing.agents_needed(lam, 6, 10, 0.8)
        assert staffing.service_level(n, lam, 6, 10) >= 0.8 and (n == 1 or staffing.service_level(n - 1, lam, 6, 10) < 0.8)
    assert staffing.agents_needed(0, 6, 10, 0.8) == 0


def test_hourly_requirement_plans_peaks_to_p90_and_keeps_a_safe_minimum_while_open():
    p50 = [0, 5, 10, 25, 30, 25, 10, 5, 0]
    p90 = [0, 8, 15, 40, 48, 40, 15, 8, 0]
    r = staffing.hourly_requirement(p50, p90, 6, 10, 0.8)
    r50 = staffing.hourly_requirement(p50, p90, 6, 10, 0.8, use_p90_for_peaks=False)
    assert r[0] == r[-1] == 0 and r[4] >= r50[4] and min(x for x in r if x) >= 2 and r[4] > r[1]


# ---------------------------------------------------------------------------------------- labour rules

def emp(**kw):
    return {"E1": {"skills": ["teller"], **kw}, "E2": {"skills": ["teller", "advisory"]}}


def test_roster_validation_catches_each_labour_rule():
    r = staffing.Rules()
    shifts = [{"emp": "E1", "date": D("2026-03-16"), "start": 8, "end": 18, "breaks": 30}, {"emp": "E1", "date": D("2026-03-17"), "start": 14, "end": 22, "breaks": 30}, {"emp": "E2", "date": D("2026-03-16"), "start": 9, "end": 16, "breaks": 0}, {"emp": "E2", "date": D("2026-03-17"), "start": 8, "end": 11, "breaks": 0},
              {"emp": "E1", "date": D("2026-03-18"), "start": 8, "end": 17, "breaks": 30}]
    v = " | ".join(staffing.validate_roster(shifts, r, emp(unavailable_weekdays=[2])))
    assert "10 h exceeds" in v and "below the 4.0 h minimum" in v and "break of 30 min is mandatory" in v and "not available" in v and "rest between 2026-03-17 and 2026-03-18" in v
    assert staffing.validate_roster([{"emp": "E2", "date": D("2026-03-16"), "start": 9, "end": 15, "breaks": 0}], r, emp()) == []
    week = [{"emp": "E1", "date": D("2026-03-16") + dt.timedelta(days=i), "start": 9, "end": 17, "breaks": 30} for i in range(7)]
    v2 = " | ".join(staffing.validate_roster(week, r, emp()))
    assert "consecutive days" in v2
    heavy = [{"emp": "E1", "date": D("2026-03-16") + dt.timedelta(days=i), "start": 8, "end": 17, "breaks": 30} for i in range(6)] + [{"emp": "E1", "date": D("2026-03-22"), "start": 8, "end": 12, "breaks": 0}]
    assert "weekly cap" in " | ".join(staffing.validate_roster(heavy, r, emp()))


def test_skill_coverage_per_hour():
    shifts = [{"emp": "E1", "date": D("2026-03-16"), "start": 9, "end": 13}, {"emp": "E2", "date": D("2026-03-16"), "start": 11, "end": 17}]
    e = emp()
    assert staffing.required_skills_ok(shifts, e, D("2026-03-16"), 10, {"teller": 1, "advisory": 1}) == {"teller": True, "advisory": False}
    assert staffing.required_skills_ok(shifts, e, D("2026-03-16"), 12, {"teller": 2, "advisory": 1}) == {"teller": True, "advisory": True}


def test_recommendation_covers_the_requirement_with_legal_shifts_and_reports_what_it_cannot():
    req = {h: n for h, n in zip(range(9, 17), [2, 3, 4, 5, 5, 4, 3, 2])}
    employees = {f"E{i}": {"skills": ["teller"]} for i in range(1, 9)}
    rec = staffing.recommend(D("2026-03-16"), req, employees, staffing.Rules())
    assert rec["short_hours"] == {} and rec["legal"] and rec["labour_hours"] >= sum(req.values()) and rec["expected_shortfall_cost"] == 0
    few = staffing.recommend(D("2026-03-16"), req, {"E1": {"skills": ["teller"]}, "E2": {"skills": ["teller"]}}, staffing.Rules())
    assert few["short_hours"] and few["unfilled_templates"] and few["expected_shortfall_cost"] > 0, "not enough people: the shortfall is stated, not hidden"
    off = staffing.recommend(D("2026-03-18"), req, {f"E{i}": {"skills": ["teller"], "unavailable_weekdays": [2]} for i in range(1, 9)}, staffing.Rules())
    assert off["shifts"] == [] and off["short_hours"], "Wednesday: nobody is available"


# ---------------------------------------------------------------------------------------- WFM integration and manager approval

def wf(srv, monkeypatch):
    monkeypatch.setenv("WFM_BASE_URL", srv.base); monkeypatch.setenv("WFM_TOKEN_URL", srv.base + "/token")
    for k in ("WFM_CLIENT_ID", "WFM_CLIENT_SECRET"):
        monkeypatch.setenv(k, "x")
    c = json.load(open(os.path.join(CFG, "wfm.connector.json")))
    c["connection"]["auth"] = {"type": "bearer", "token_env": "WFM_CLIENT_SECRET"}
    c["retry"] = {"max_attempts": 2, "base_delay": 0, "max_delay": 0}
    return registry.build(c)


def test_wfm_reads_shifts_and_writes_proposals_idempotently_and_never_publishes_unapproved(monkeypatch):
    srv = wfm.mock_wfm()
    try:
        a = wf(srv, monkeypatch)
        recs = list(a.read())
        assert len(recs) == 5 and recs[0].payload["branch"] == "BR-0012" and recs[0].payload["start_hour"] == 9
        prop = {"proposal_id": "BR0012-2026-W12", "branch": "BR0012", "shifts": [{"emp": "E1", "date": "2026-03-16", "start": 9, "end": 17}]}
        assert a.write([prop], key_fields=["proposal_id"]).accepted == 1
        a.store = type(a.store)()
        assert a.write([prop], key_fields=["proposal_id"]).accepted == 1 and len(srv.state["proposals"]) == 1
        pid = a.write.__self__.cfg["name"]
        from fde_adapters.core.idempotency import derive_key
        key = derive_key("BR0012-2026-W12", namespace=a.name)
        with pytest.raises(Exception, match="manager must approve"):
            a.apply_if_approved(key)
        srv.state["proposals"][key].update(status="approved", approved_by="mgr.jones")
        assert a.apply_if_approved(key) == {"published": key}
    finally:
        srv.close()


def test_manager_approval_workflow_diff_legality_rejection_reason_and_amendment():
    cur = [{"emp": "E1", "date": D("2026-03-16"), "start": 9, "end": 17}, {"emp": "E2", "date": D("2026-03-16"), "start": 9, "end": 17}]
    new = [{"emp": "E1", "date": D("2026-03-16"), "start": 9, "end": 15}, {"emp": "E3", "date": D("2026-03-16"), "start": 12, "end": 18}]
    p = approval.Proposal("p1", "BR0012", "2026-W12", cur, new, True, {"labour_cost_delta": -1.5, "waiting_time_change_pct": -12})
    assert [s["emp"] for s in p.diff["added"]] == ["E3"] and [s["emp"] for s in p.diff["removed"]] == ["E2"] and p.diff["changed"][0]["to"]["end"] == 15
    now = dt.datetime(2026, 3, 13, tzinfo=UTC)
    with pytest.raises(approval.ApprovalError, match="manager of this branch"):
        p.approve("mgr.other", "BR0034", now)
    p.approve("mgr.jones", "BR0012", now, "ok for the March peak")
    assert p.status == "approved" and p.history[-1][1] == "mgr.jones"
    bad = approval.Proposal("p2", "BR0012", "W12", cur, new, False, {})
    with pytest.raises(approval.ApprovalError, match="labour-rule violations"):
        bad.approve("mgr.jones", "BR0012", now)
    with pytest.raises(approval.ApprovalError, match="reason"):
        bad.reject("mgr.jones", "", now)
    bad.reject("mgr.jones", "Friday needs a second advisor", now)
    ok = approval.Proposal("p3", "BR0012", "W12", cur, new, True, {})
    with pytest.raises(approval.ApprovalError, match="violations"):
        ok.amend("mgr.jones", new, False, now, "x")
    ok.amend("mgr.jones", cur, True, now, "keep E2: training day")
    assert ok.history[-1][0] == "amended" and ok.proposed == cur


# ---------------------------------------------------------------------------------------- reports

def test_branch_accuracy_report_excludes_imputed_hours_and_override_feedback_summarises_reasons():
    rows = [{"branch": "BR1", "hour_index": i, "actual": a, "p50": f, "p90": f * 1.4, "imputed": im} for i, (a, f, im) in enumerate([(10, 12, False), (20, 18, False), (40, 30, False), (0, 99, True), (15, 15, False)])]
    rows += [{"branch": "BR2", "hour_index": 0, "actual": 5, "p50": 5, "p90": 7, "imputed": True}]
    r = reports.branch_report(rows)
    b = r["branches"]["BR1"]
    assert b["hours"] == 4 and b["imputed_share"] == 0.2 and b["wape"] == reports.wape([10, 20, 40, 15], [12, 18, 30, 15]) and b["peak_error"] == -10 and b["p90_coverage"] == 1.0
    assert r["branches"]["BR2"]["status"] == "no clean actuals" and r["worst_by_wape"] == ["BR1"]
    fb = reports.override_feedback([{"status": "approved"}, {"status": "amended", "reason": "training day"}, {"status": "rejected", "reason": "needs advisor"}, {"status": "rejected", "reason": "needs advisor"}])
    assert fb["accepted_as_is"] == 0.25 and fb["rejected"] == 0.5 and fb["top_reasons"][0] == ("needs advisor", 2)
