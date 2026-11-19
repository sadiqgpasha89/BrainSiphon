import datetime as dt
import json
import os

import pytest

from fde_adapters.mocks.server import MockServer
from phish_integration import events, feedback, gateway, response, simulate, stix

FIX = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "fixtures")
NOW = dt.datetime(2026, 3, 14, 10, 0, tzinfo=dt.timezone.utc)
INGEST = "2026-03-14T10:00:01Z"


# ------------------------------------------------------------------------------------------- events

def test_cef_round_trip_escaping_and_the_syslog_prefix():
    line = events.build_cef("Acme|Sec", "Mail\\Guard", "1.0", "100", "Phish blocked", 8, {"src": "198.51.100.7", "msg": "a=b and a pipe |", "suser": "x@y.example"})
    p = events.parse_cef("<134>Mar 14 10:00:00 gw1 " + line)
    assert (p["vendor"], p["product"], p["signature_id"], p["name"], p["severity"]) == ("Acme|Sec", "Mail\\Guard", "100", "Phish blocked", "8")
    assert p["ext"]["src"] == "198.51.100.7" and p["ext"]["msg"] == "a=b and a pipe |" and p["ext"]["suser"] == "x@y.example"
    with pytest.raises(events.EventError):
        events.parse_cef("not cef")


def test_vendor_payloads_map_to_one_canonical_event_with_provenance_and_tenant():
    tap = {"GUID": "g-1", "messageID": "<m@x>", "messageTime": "2026-03-14T09:58:00.000Z", "fromAddress": "a@evil.invalid", "senderIP": "198.51.100.7", "recipient": ["bob@acme.example"], "subject": "Invoice", "phishScore": 88, "spamScore": 10,
           "threatsInfoMap": [{"threatID": "t1", "threatType": "url", "classification": "phish", "threat": "http://evil.invalid/x"}, {"threatID": "t2", "threatType": "attachment", "classification": "malware", "threat": "abc"}]}
    a = events.from_proofpoint_tap(tap, "acme", INGEST)
    d = events.from_defender_email_events({"NetworkMessageId": "n-9", "Timestamp": "2026-03-14T09:57:00Z", "SenderFromAddress": "a@evil.invalid", "RecipientEmailAddress": "bob@acme.example", "Subject": "Invoice", "DeliveryAction": "Delivered", "ThreatTypes": "Phish,Malware", "DetectionMethods": "URL detonation"}, "acme", INGEST)
    assert a["source"] == "proofpoint-tap" and a["tenant"] == "acme" and a["event_time"] == "2026-03-14T09:58:00Z" and a["ingest_time"] == INGEST and a["urls"] == ["http://evil.invalid/x"] and a["classification"] == ["malware", "phish"]
    assert d["kind"] == "message-delivered" and d["threat_types"] == ["Phish", "Malware"] and d["recipients"] == ["bob@acme.example"]
    assert a["dedupe_key"] == events.from_proofpoint_tap(tap, "acme", "later")["dedupe_key"] != events.from_proofpoint_tap(tap, "other-tenant", INGEST)["dedupe_key"]
    with pytest.raises(events.EventError, match="tenant"):
        events.from_proofpoint_tap(tap, "", INGEST)
    assert events.utc(1772000000000) == events.utc(1772000000) and events.utc("2026-03-14T15:00:00+05:30") == "2026-03-14T09:30:00Z"


def test_ocsf_email_activity_carries_our_verdict_as_an_enrichment():
    e = events.from_defender_email_events({"NetworkMessageId": "n-1", "Timestamp": "2026-03-14T09:57:00Z", "SenderFromAddress": "a@x.invalid", "RecipientEmailAddress": "b@acme.example", "Subject": "s"}, "acme", INGEST)
    o = events.to_ocsf_email_activity(e, {"verdict": "phish", "score": 0.93, "reasons": ["lookalike host"], "model_version": "v3"})
    assert o["class_uid"] == 4009 and o["metadata"]["tenant_uid"] == "acme" and o["time"] == "2026-03-14T09:57:00Z" and o["enrichments"][0]["data"]["score"] == 0.93 and o["email"]["to"] == ["b@acme.example"]


# ------------------------------------------------------------------------------------------- STIX / TAXII

def test_stix_indicators_are_filtered_deduplicated_and_complex_patterns_are_not_guessed():
    bundle = json.load(open(os.path.join(FIX, "stix_bundle.json")))
    r = stix.indicators(bundle, source="vendor-feed", now=NOW)
    got = {(a["type"], a["value"].lower()): a for a in r["accepted"]}
    assert set(got) == {("domain-name", "secure-login.invalid"), ("url", "http://collector.invalid/x?a=1")}
    assert got[("domain-name", "secure-login.invalid")]["confidence"] == 95 and got[("domain-name", "secure-login.invalid")]["indicator_id"] == "indicator--a6", "the higher-confidence duplicate wins"
    why = {x["id"]: x["why"] for x in r["rejected"]}
    assert why["indicator--a3"] == "expired" and "confidence 20" in why["indicator--a4"] and "too complex" in why["indicator--a5"]
    assert stix.parse_pattern("[email-addr:value = 'a@b.invalid']") == [{"type": "email-addr", "value": "a@b.invalid"}]


def test_taxii_client_pages_with_next_and_added_after():
    bundle = json.load(open(os.path.join(FIX, "stix_bundle.json")))
    objs = bundle["objects"]
    srv = MockServer("taxii")

    def objects(r):
        assert r.headers["accept"] == stix.TAXII_MEDIA
        start = int(r.q("next", "0"))
        chunk = objs[start : start + 3]
        env = {"objects": chunk, "more": start + 3 < len(objs)}
        if env["more"]:
            env["next"] = str(start + 3)
        return 200, {"Content-Type": stix.TAXII_MEDIA}, env

    srv.route("GET", r"/collections/c1/objects/", objects)
    try:
        c = stix.TaxiiClient(srv.base, "c1")
        pages = list(c.poll(added_after="2026-03-01T00:00:00Z", limit=3))
        assert len(pages) == 3 and sum(len(p["objects"]) for p in pages) == len(objs)
        assert srv.calls("GET")[0]["query"].startswith("limit=3&added_after=2026-03-01") and "next=3" in srv.calls("GET")[1]["query"] and "added_after" in srv.calls("GET")[1]["query"]
    finally:
        srv.close()


# ------------------------------------------------------------------------------------------- inline inspection

def test_inline_inspection_policy_allow_list_deadline_and_failure_behaviour():
    msgs = {m["id"]: m for m in json.load(open(os.path.join(FIX, "messages.json")))}
    svc = gateway.InspectionService(simulate.toy_score, allow_list={"partner.example"})
    assert svc.inspect(msgs["m1"])["disposition"] == "quarantine" and svc.inspect(msgs["m3"])["disposition"] == "deliver"
    allowed = svc.inspect(msgs["m2"])
    assert allowed["decided_by"] == "policy" and svc.stats["allow_listed"] == 1
    t = {"now": 0.0}
    slow = gateway.InspectionService(lambda m: (t.__setitem__("now", t["now"] + 0.5), {"score": 0.99})[1], deadline_ms=100, on_timeout="deliver_with_banner", clock=lambda: t["now"])
    r = slow.inspect(msgs["m1"])
    assert r["disposition"] == "banner" and r["verdict"] == "undecided" and r["decided_by"] == "fallback-policy" and slow.stats["timeouts"] == 1
    def boom(m):
        raise RuntimeError("model down")
    assert gateway.InspectionService(boom, on_timeout="quarantine").inspect(msgs["m1"])["disposition"] == "quarantine"
    with pytest.raises(ValueError):
        gateway.InspectionService(boom, on_timeout="explode")


# ------------------------------------------------------------------------------------------- the detection / response boundary

def test_read_only_by_default_nothing_changes_until_a_named_owner_enables_actions():
    ctl = response.Controller(executors={"quarantine_message": lambda t, p: {"q": t}})
    with pytest.raises(response.NotPermitted, match="read-only"):
        ctl.perform("quarantine_message", "m1", "tenant:acme/mailbox:a", now=NOW)
    assert ctl.journal[-1]["outcome"] == "blocked: read-only mode"
    assert ctl.perform("add_banner", "m1", "tenant:acme", now=NOW)["result"], "a low-risk, reversible banner is allowed even read-only"
    with pytest.raises(response.NotPermitted, match="named owner"):
        ctl.enable_actions("", "")
    ctl.enable_actions("soc.manager", "CHG-1")
    with pytest.raises(response.NotPermitted, match="no valid approval"):
        ctl.perform("quarantine_message", "m1", "tenant:acme/mailbox:a", now=NOW)


def test_actions_need_scoped_time_limited_counted_grants_and_high_risk_needs_two_people():
    ctl = response.Controller(mode="approval-gated", executors={"disable_account": lambda t, p: {"disabled": t}})
    with pytest.raises(response.NotPermitted, match="2 distinct approver"):
        ctl.grant("disable_account", "tenant:acme", ["a"], "INC-1", NOW + dt.timedelta(hours=1))
    with pytest.raises(response.NotPermitted, match="2 distinct approver"):
        ctl.grant("disable_account", "tenant:acme", ["a", "a"], "INC-1", NOW + dt.timedelta(hours=1))
    ctl.grant("disable_account", "tenant:acme/mailbox:alice", ["a", "b"], "INC-1", NOW + dt.timedelta(hours=1), max_uses=1)
    assert ctl.perform("disable_account", "alice", "tenant:acme/mailbox:alice", now=NOW)["result"] == {"disabled": "alice"}
    for scope, when, msg in [("tenant:acme/mailbox:alice", NOW, "no valid approval"), ("tenant:acme/mailbox:bob", NOW, "no valid approval")]:
        with pytest.raises(response.NotPermitted, match=msg):
            ctl.perform("disable_account", "x", scope, now=when)
    ctl.grant("disable_account", "tenant:acme", ["a", "b"], "INC-2", NOW + dt.timedelta(minutes=5))
    with pytest.raises(response.NotPermitted):
        ctl.perform("disable_account", "bob", "tenant:acme/mailbox:bob", now=NOW + dt.timedelta(minutes=6))  # the grant expired


def test_every_action_is_journalled_before_it_runs_and_a_wrong_containment_is_reversible():
    released = []
    ctl = response.Controller(mode="approval-gated", executors={"quarantine_message": lambda t, p: {"q": t}, "release_message": lambda t, p: released.append((t, p)) or {"released": t}})
    ctl.grant("quarantine_message", "tenant:acme", ["lead"], "INC-9", NOW + dt.timedelta(hours=1))
    r = ctl.perform("quarantine_message", "m7", "tenant:acme/mailbox:ceo", now=NOW)
    started = [j for j in ctl.journal if j["id"] == r["id"]]
    assert [j["outcome"] for j in started] == ["started", "done"] and started[0]["approvers"] == ["lead"] and started[0]["ticket"] == "INC-9"
    with pytest.raises(response.NotPermitted, match="reason"):
        ctl.undo(r["id"], "analyst", "")
    u = ctl.undo(r["id"], "analyst.kim", "false positive: board mail", now=NOW)
    assert u == {"undone": r["id"], "with": "release_message"} and released[0][0] == "m7" and released[0][1]["original"] == r["id"]
    assert ctl.journal[-1]["inverse_of"] == r["id"] and ctl.journal[-1]["reason"].startswith("false positive")
    with pytest.raises(response.NotPermitted):
        ctl.undo("nope", "x", "y")
    failing = response.Controller(mode="approval-gated", executors={"quarantine_message": lambda t, p: 1 / 0})
    failing.grant("quarantine_message", "tenant:acme", ["lead"], "I", NOW + dt.timedelta(hours=1))
    with pytest.raises(ZeroDivisionError):
        failing.perform("quarantine_message", "m", "tenant:acme", now=NOW)
    assert failing.journal[-1]["outcome"].startswith("failed") and failing.journal[-2]["outcome"] == "started", "a crash leaves evidence"


# ------------------------------------------------------------------------------------------- the feedback loop

def test_allow_lists_need_a_reason_expire_and_a_whole_domain_needs_a_second_person():
    pl = feedback.PolicyLists()
    pl.add_allow("billing@vendor.example", "analyst", "known supplier", NOW)
    with pytest.raises(ValueError, match="second approver"):
        pl.add_allow("vendor.example", "analyst", "known supplier", NOW)
    pl.add_allow("vendor.example", "analyst", "known supplier", NOW, approver="lead")
    with pytest.raises(ValueError, match="reason"):
        pl.add_allow("x@y.example", "a", "", NOW)
    with pytest.raises(ValueError, match="wildcards"):
        pl.add_allow("*.example", "a", "r", NOW, approver="lead")
    assert pl.is_allowed("billing@vendor.example", NOW) and pl.is_allowed("anyone@vendor.example", NOW) and not pl.is_allowed("billing@vendor.example", NOW + dt.timedelta(days=91))
    pl.resolve_false_positive("m1", "ceo@acme.example", "analyst", NOW, reason="board mail", allow=True)
    pl.resolve_false_negative("m9", "evil.invalid", "analyst", NOW, reason="missed lookalike")
    assert pl.metrics() == {"false_positives": 1, "false_negatives": 1, "allow_entries": 3, "block_entries": 1}


# ------------------------------------------------------------------------------------------- the whole incident

def test_incident_simulation_end_to_end_with_approval_gate_and_rollback():
    msgs = json.load(open(os.path.join(FIX, "messages.json")))
    out = simulate.run(msgs, now=NOW)
    assert out["verdicts"] == 5 and len(out["siem_events"]) == 5 and all(e["class_uid"] == 4009 and e["metadata"]["tenant_uid"] == "acme" for e in out["siem_events"])
    quarantined = {c["message"] for c in out["soar_cases"]}
    assert quarantined == {"m1", "m4"} and len(out["performed"]) == 2 and out["refused"] == []
    verdicts = {e["metadata"]["uid"]: e["enrichments"][0]["value"] for e in out["siem_events"]}
    assert verdicts["m3"] == "clean" and verdicts["m5"] == "clean" and verdicts["m2"] == "allow-listed", "benign mail and the trusted partner are untouched"
    ctl = out["controller"]
    ctl.undo(out["performed"][1], "analyst.kim", "CEO impersonation confirmed: keep blocked? no, test rollback", now=NOW)
    assert ctl.journal[-1]["action"] == "release_message"
    ro = simulate.run(msgs, now=NOW, enable_actions=False)
    assert len(ro["performed"]) == 0 and len(ro["refused"]) == 2, "read-only integration: detection still works, no action is taken, and both refusals are journalled"
    assert any(j["outcome"] == "blocked: read-only mode" for j in ro["journal"])
