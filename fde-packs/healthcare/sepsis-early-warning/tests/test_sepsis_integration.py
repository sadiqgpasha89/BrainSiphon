import datetime as dt
import os

import pytest

from sepsis_integration import alert_lifecycle as L
from sepsis_integration.alert_lifecycle import AlertEngine, LifecycleError, Policy
from sepsis_integration.fallback import Monitor, decide_source
from sepsis_integration.identity import Registry
from sepsis_integration.news2 import news2
from sepsis_integration.replay import load, run
from sepsis_integration.ward_config import ACCEPTANCE, ChangeRejected, WardConfig, enable_clinical_alerts, validate_threshold_change

FIX = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "fixtures")
T0 = dt.datetime(2026, 3, 14, 10, 0, tzinfo=dt.timezone.utc)
M = lambda m: dt.timedelta(minutes=m)  # noqa: E731


# ------------------------------------------------------------------------------------------------------- NEWS2

def test_news2_published_examples_and_missing_data_are_explicit():
    # RCP NEWS2 chart: RR 22 (2), SpO2 93 (2), air (0), SBP 105 (1), HR 118 (2), alert (0), temp 38.4 (1) = 8
    r = news2(22, 93, False, 105, 118, True, 38.4)
    assert r["score"] == 8 and r["risk"] == "high" and r["complete"]
    assert news2(16, 98, False, 125, 70, True, 36.9)["score"] == 0
    assert news2(16, 98, False, 125, 70, False, 36.9)["parts"]["consciousness"] == 3 and news2(16, 98, False, 125, 70, False, 36.9)["risk"] == "medium", "a single red parameter is medium risk"
    partial = news2(None, 97, False, 120, 80, True, None)
    assert partial["missing"] == ["rr", "temp"] and partial["complete"] is False


# ------------------------------------------------------------------------------------------------------- alert lifecycle

def test_full_lifecycle_with_ownership_snooze_override_escalation_and_close_audit_trail():
    e = AlertEngine()
    a = e.on_score("V1", "ICU", 0.8, T0, "D")
    assert a and a.state == L.GENERATED and a.owner == "charge_nurse" and a.due_at == T0 + M(15)
    e.display(a, T0 + M(1))
    e.acknowledge(a, "nurse.jones", T0 + M(5))
    e.snooze(a, "nurse.jones", T0 + M(6), "awaiting repeat lactate")
    assert a.state == L.SNOOZED
    e.tick(T0 + M(40))
    assert a.state == L.DISPLAYED, "an expired snooze comes back"
    e.acknowledge(a, "nurse.jones", T0 + M(41))
    with pytest.raises(LifecycleError, match="physician co-signature"):
        e.override(a, "nurse.jones", "nurse", T0 + M(50), "not septic: known baseline")
    e.override(a, "nurse.jones", "nurse", T0 + M(50), "not septic: known baseline", cosigned_by="dr.patel")
    assert a.state == L.OVERRIDDEN
    e.close(a, "dr.patel", T0 + M(60), "sepsis_ruled_out")
    assert a.state == L.CLOSED and [h["what"] for h in a.history][0] == "generated" and all({"at", "who", "what"} <= set(h) for h in a.history)
    with pytest.raises(LifecycleError):
        e.close(a, "x", T0, "because")
    with pytest.raises(LifecycleError, match="cannot"):
        e.acknowledge(a, "x", T0)


def test_unacknowledged_alerts_escalate_nurse_to_physician_to_rapid_response_and_stop():
    e = AlertEngine()
    a = e.on_score("V2", "WARD3", 0.9, T0)
    e.tick(T0 + M(16))
    assert (a.state, a.owner) == (L.ESCALATED, "physician_on_call")
    e.tick(T0 + M(32))
    assert a.owner == "rapid_response_team"
    e.tick(T0 + M(120))
    assert a.owner == "rapid_response_team" and a.level == 2, "the ladder ends at the rapid response team"
    e.acknowledge(a, "rrt.lead", T0 + M(125))
    assert a.state == L.ACKNOWLEDGED and a.due_at is None


def test_duplicate_alert_suppression_and_the_refractory_window_do_not_hide_a_real_deterioration():
    e = AlertEngine(Policy(critical_delta=0.25, refractory=dt.timedelta(hours=6)))
    a = e.on_score("V3", "ICU", 0.7, T0)
    assert e.on_score("V3", "ICU", 0.72, T0 + M(10)) is None and len([x for x in e.alerts.values() if x.encounter == "V3"]) == 1, "one open alert per encounter"
    e.acknowledge(a, "n", T0 + M(12)); e.override(a, "dr", "physician", T0 + M(15), "reviewed: not sepsis")
    assert e.on_score("V3", "ICU", 0.75, T0 + M(60)) is None, "a similar score inside the refractory window is suppressed"
    assert e.suppressed[-1]["reason"] == "refractory window"
    re = e.on_score("V3", "ICU", 0.98, T0 + M(90))
    assert re is not None and re.owner == "physician_on_call" and "escalated" in re.history[0]["what"], "a large rise inside the window re-alerts, already escalated"
    # a rise while an alert is open escalates it rather than creating a second one
    b = e.on_score("V4", "ICU", 0.65, T0); e.display(b, T0)
    e.on_score("V4", "ICU", 0.95, T0 + M(5))
    assert b.state == L.ESCALATED and b.owner == "physician_on_call"


def test_alert_burden_is_measured_and_a_cap_flags_the_shift_but_never_drops_an_alert():
    e = AlertEngine(Policy(burden_cap_per_shift=2))
    made = [e.on_score(f"V{i}", "WARD3", 0.9, T0, "D") for i in range(4)]
    assert all(made), "alerts are still delivered above the cap"
    assert any("burden cap exceeded" in h["what"] for a in made for h in a.history)
    assert e.burden("WARD3", patient_days=40) == pytest.approx(0.1)


# ------------------------------------------------------------------------------------------------------- identity

def test_merge_repoints_encounters_and_lookalike_records_go_to_human_review_not_auto_merge():
    r = Registry()
    s = "urn:oid:hospital:hosp1"
    a = r.upsert_patient(s, "MRN1", "SMITH", "JOHN", "19700101", "M")
    r.upsert_patient(s, "MRN2", "SMITH", "JOHN", "19700101", "M")
    assert len(r.candidates()) == 1 and "different identifiers" in r.candidates()[0]["why"]
    assert r.canonical(s, "MRN1") == (s, "MRN1"), "look-alikes are never auto-merged"
    r.open_encounter("V1", (s, "MRN2"), "ICU", T0)
    r.merge(s, surviving="MRN1", merged_away="MRN2")
    assert r.canonical(s, "MRN2") == (s, "MRN1") and r.encounters["V1"]["patient"] == (s, "MRN1") and r.candidates() == []
    assert r.match_encounter((s, "MRN2"), "V1", T0)["how"] == "visit-number"


def test_encounter_matching_falls_back_to_a_time_window_and_says_so():
    r = Registry()
    s = "urn:oid:hospital:hosp1"
    k = r.upsert_patient(s, "MRN1", "A", "B", "19700101", "M")
    r.open_encounter("V1", k, "ICU", T0)
    assert r.match_encounter(k, "", T0 + M(30)) == {"encounter": "V1", "how": "time-window"}
    r.close_encounter("V1", T0 + M(60))
    assert r.match_encounter(k, "", T0 + M(90))["encounter"] is None
    r.open_encounter("V2", k, "ICU", T0 + M(10))
    assert r.match_encounter(k, "", T0 + M(30))["how"] == "ambiguous", "two open encounters: do not guess"
    r.encounters["V1"]["end"] = T0 + M(5)
    e = r.open_encounter("V2", k, "WARD3", T0 + M(20))
    assert e["ward"] == "WARD3" and [w for _, w in e["ward_history"]] == ["ICU", "WARD3"], "a transfer is a history, not an overwrite"


# ------------------------------------------------------------------------------------------------------- configuration and gating

def test_threshold_change_needs_an_approver_a_reason_a_budget_and_small_steps():
    cfg = WardConfig("WARD3", 0.6)
    ok = validate_threshold_change(cfg, 0.65, replay_alerts=3, replay_patient_days=60, approver="Dr. Lee (CMIO delegate)", reason="alert burden above target on ward 3")
    assert ok.threshold == 0.65 and ok.version == 2 and ok.history[0]["approver"].startswith("Dr. Lee")
    with pytest.raises(ChangeRejected, match="approver"):
        validate_threshold_change(cfg, 0.65, replay_alerts=1, replay_patient_days=60, approver="", reason="x")
    with pytest.raises(ChangeRejected, match="budget"):
        validate_threshold_change(cfg, 0.55, replay_alerts=20, replay_patient_days=60, approver="a", reason="b")
    with pytest.raises(ChangeRejected, match="steps"):
        validate_threshold_change(cfg, 0.9, replay_alerts=1, replay_patient_days=60, approver="a", reason="b")
    assert len(ACCEPTANCE) >= 6


def test_real_clinical_alerts_cannot_be_enabled_without_validation_hazard_review_and_a_downtime_drill():
    cfg = WardConfig("ICU", 0.6)
    assert cfg.enabled_for_clinical_alerts is False
    with pytest.raises(ChangeRejected) as e:
        enable_clinical_alerts(cfg, validation_signed_by="", hazard_log_reviewed_by="CSO", downtime_drill_done=False)
    assert "clinical validation sign-off" in str(e.value) and "downtime drill" in str(e.value) and "hazard log review" not in str(e.value)
    assert enable_clinical_alerts(cfg, validation_signed_by="CMIO", hazard_log_reviewed_by="CSO", downtime_drill_done=True).enabled_for_clinical_alerts


def test_downtime_states_and_where_the_decision_comes_from():
    m = Monitor()
    assert m.status(T0)["state"] == "DOWNTIME", "no heartbeat yet means we cannot claim to be monitoring"
    for n in m.beats:
        m.beat(n, T0)
    assert m.status(T0 + M(1))["state"] == "OK" and decide_source(m.status(T0 + M(1))) == "model"
    m.beat("hl7_feed", T0 + M(8)); m.beat("ehr_alert_api", T0 + M(8))
    st = m.status(T0 + M(9))
    assert st["state"] == "DEGRADED" and st["down"] == ["inference"] and "NEWS2" in st["ward_message"] and decide_source(st) == "news2"
    st2 = m.status(T0 + M(30))
    assert st2["state"] == "DOWNTIME" and decide_source(st2) == "paper" and "paper" in st2["ward_message"]


# ------------------------------------------------------------------------------------------------------- the replay

def test_deidentified_replay_exercises_the_whole_integration():
    events = load(os.path.join(FIX, "events.jsonl"))
    rep = run(events, threshold=0.6)
    assert rep["acks"] == {"AA": len(events) - 1, "AR": 1}, "the malformed message is rejected with AR, everything else is accepted"
    assert rep["encounters"] == 5 and rep["merges"] == 1
    assert rep["ignored_duplicates"] >= 1, "the re-sent laboratory result is not applied twice"
    assert "LAB5001-1-LACT" in rep["corrected"], "the corrected value replaces the final one"
    assert any(l["delay_s"] >= 5 * 3600 for l in rep["late_results"]), "a result reported five hours after the draw is flagged late, not hidden"
    assert any("LAB3010" in i["key"] for i in rep["issues"]) is False, "mg/dL lactate is converted, not flagged"
    icu = [a for a in rep["alerts"] if a["encounter"] == "V1001"]
    assert icu and icu[0]["ward"] == "ICU" and 8 * 3600 <= (dt.datetime.fromisoformat(icu[0]["opened_at"]) - dt.datetime(2026, 3, 14, tzinfo=dt.timezone.utc)).total_seconds() <= 20 * 3600
    assert not [a for a in rep["alerts"] if a["encounter"] == "V1002"], "the stable patient never alerts, including after the merge brought a second MRN under him"
    assert rep["candidates_for_review"] == []
