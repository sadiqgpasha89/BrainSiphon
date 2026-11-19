import datetime as dt
import json
import os

import pytest

from fde_adapters.core import registry
from ticket_integration import approvals, entitlements, feedback, language, mock_zendesk, obo, tenant, webhook
import ticket_integration.zendesk  # noqa: F401 - registers the adapter

CFG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "config")
NOW = dt.datetime(2026, 3, 14, 10, 0, tzinfo=dt.timezone.utc)


def zd(srv, monkeypatch, **over):
    monkeypatch.setenv("ZD_BASE_URL", srv.base); monkeypatch.setenv("ZD_USER", "bot@acme.example/token"); monkeypatch.setenv("ZD_API_TOKEN", "tok")
    c = json.load(open(os.path.join(CFG, "zendesk.connector.json")))
    c["retry"] = {"max_attempts": 3, "base_delay": 0, "max_delay": 0}
    c.update(over)
    return registry.build(c)


# ------------------------------------------------------------------------------------------------ Zendesk read and writeback

def test_cursor_export_pages_maps_and_validates(monkeypatch):
    srv = mock_zendesk.server(n=5, page=2)
    try:
        a = zd(srv, monkeypatch)
        assert a.healthcheck().ok and a.healthcheck().checks["role"] == "agent"
        recs = list(a.read())
        assert [r.payload["ticket_id"] for r in recs] == ["1", "2", "3", "4", "5"] and recs[0].payload["text"] == "SSO loop after password reset" and recs[2].payload["organization_id"] == "71"
        assert len(srv.calls("GET", "/api/v2/incremental")) == 3
        assert srv.calls("GET")[1]["headers"]["authorization"].startswith("Basic ")
    finally:
        srv.close()


def test_writeback_sets_priority_category_queue_assignee_tags_and_an_internal_note_exactly_once(monkeypatch):
    srv = mock_zendesk.server()
    try:
        a = zd(srv, monkeypatch)
        d = {"id": 3, "priority": "urgent", "type": "incident", "group_id": 555, "assignee_id": 42, "status": "open", "tags_add": ["ai_triaged", "cat_outage"], "comment": "Triage: outage on /v2/orders (confidence 0.93). Internal note.", "decision_id": "D-1", "ticket_id": 3}
        r1 = a.write([d], key_fields=["ticket_id", "decision_id"])
        t = srv.state["tickets"][3]
        assert r1.accepted == 1 and t["priority"] == "urgent" and t["group_id"] == 555 and t["assignee_id"] == 42 and {"ai_triaged", "cat_outage"} <= set(t["tags"]) and t["comments"] == [{"body": d["comment"], "public": False}]
        a2 = zd(srv, monkeypatch)  # a restarted process: the local store is empty, the *ticket* remembers (marker tag)
        r2 = a2.write([d], key_fields=["ticket_id", "decision_id"])
        assert r2.accepted == 1 and srv.state["writes"] == 1 and len(t["comments"]) == 1, "the replay is a no-op: one write, one comment"
        assert any(x.startswith("bs_") for x in t["tags"])
    finally:
        srv.close()


def test_a_concurrent_agent_edit_is_never_overwritten_and_the_decision_is_reapplied_once(monkeypatch):
    srv = mock_zendesk.server()
    try:
        a = zd(srv, monkeypatch)
        real_get = a.http.get
        bumped = {"done": False}

        def racing_get(path, **kw):
            r = real_get(path, **kw)
            if not bumped["done"] and "/tickets/2.json" in path:
                bumped["done"] = True
                srv.state["tickets"][2]["updated_at"] = "2026-03-14T09:59:00Z"  # an agent edits the ticket between our read and our write
                srv.state["tickets"][2]["tags"] = ["agent_added"]
            return r

        a.http.get = racing_get
        r = a.write([{"id": 2, "priority": "high", "ticket_id": 2, "decision_id": "D-2"}], key_fields=["ticket_id", "decision_id"])
        t = srv.state["tickets"][2]
        assert r.accepted == 1 and t["priority"] == "high" and "agent_added" in t["tags"], "the agent's tag survived; our change was re-applied on the fresh version"
        assert len(srv.calls("PUT")) == 2, "the first PUT was refused with 409 (stale updated_stamp); the second carried the fresh stamp"
    finally:
        srv.close()


def test_rate_limits_and_missing_tickets_are_handled_not_swallowed(monkeypatch):
    srv = mock_zendesk.server()
    try:
        a = zd(srv, monkeypatch)
        srv.fail_next(1, 429, {"Retry-After": "0"})
        assert len(list(a.read(limit=1))) == 1
        res = a.write([{"id": 999, "priority": "low", "ticket_id": 999, "decision_id": "x"}], key_fields=["ticket_id", "decision_id"])
        assert res.failed and res.failed[0]["code"] == "permanent_error" and "404" in res.failed[0]["message"]
    finally:
        srv.close()


# ------------------------------------------------------------------------------------------------ webhook verification

def test_webhook_signature_timestamp_window_replay_and_key_rotation():
    v = webhook.Verifier({"new": b"secret-new", "old": b"secret-old"})
    body = b'{"ticket_id": 3}'
    ts = "2026-03-14T10:00:00Z"
    now = dt.datetime(2026, 3, 14, 10, 1, tzinfo=dt.timezone.utc).timestamp()
    hdr = lambda sig, t=ts: {"X-Zendesk-Webhook-Signature": sig, "X-Zendesk-Webhook-Signature-Timestamp": t}  # noqa: E731
    assert v.verify(hdr(v.sign(body, ts, "new")), body, now) == "new"
    assert v.verify(hdr(v.sign(body, ts, "old")), body, now) == "old", "the old secret still works during rotation"
    with pytest.raises(webhook.WebhookRejected, match="replayed"):
        v.verify(hdr(v.sign(body, ts, "new")), body, now + 1)
    with pytest.raises(webhook.WebhookRejected, match="tolerance"):
        v.verify(hdr(v.sign(body, ts, "new")), body, now + 3600)
    with pytest.raises(webhook.WebhookRejected, match="does not match"):
        v.verify(hdr(v.sign(body, ts, "new")), body + b" ", now)
    with pytest.raises(webhook.WebhookRejected, match="missing"):
        v.verify({}, body, now)


# ------------------------------------------------------------------------------------------------ entitlements, priority, routing, SLA, escalation

def test_entitlement_join_tier_status_staleness_and_contract_sla_override():
    acc = {"70": {"tier": "enterprise", "status": "active", "as_of": NOW - dt.timedelta(hours=1), "contract_sla": {"P1": (10, 2)}}, "71": {"tier": "premium", "status": "suspended", "as_of": NOW - dt.timedelta(days=3)}}
    e = entitlements.Entitlements(acc)
    a, b, c = e.lookup("70", NOW), e.lookup("71", NOW), e.lookup("999", NOW)
    assert a["tier"] == "enterprise" and a["source"] == "crm" and b["tier"] == "free" and b["stale"] and "stale" in b["source"] and c["tier"] == "standard" and "default" in c["source"]
    assert entitlements.sla_for(a, "P1") == {"first_response_min": 10, "resolution_h": 2, "basis": "contract"} and entitlements.sla_for(a, "P2")["basis"] == "tier enterprise"
    assert entitlements.sla_for(b, "P1")["first_response_min"] == 480


def test_priority_matrix_outage_override_and_a_tier_bump_that_never_reaches_p1_by_tier_alone():
    p = entitlements.priority
    assert p("high", "everyone", "free") == "P1" and p("low", "single", "free") == "P4" and p("low", "single", "enterprise") == "P4"
    assert p("medium", "team", "free") == "P3" and p("medium", "team", "enterprise") == "P2"
    assert p("low", "single", "free", outage=True) == "P1"


def test_routing_rules_first_match_wins_and_nothing_is_lost():
    rules = json.load(open(os.path.join(CFG, "routing-rules.json")))["rules"]
    r = entitlements.route
    assert r({"tier": "enterprise", "category": "outage"}, rules)["queue"] == "critical-incidents" and r({"tier": "free", "category": "outage"}, rules)["queue"] == "triage"
    assert r({"category": "billing", "language": "es"}, rules)["queue"] == "billing", "an earlier rule outranks a later one"
    assert r({"category": "bug", "language": "en"}, rules)["queue"] == "product-support" and r({"language": "es", "category": "other"}, rules)["queue"] == "support-es"


def test_escalation_clock_levels_and_which_sla_is_running():
    sla = {"first_response_min": 60, "resolution_h": 8}
    c = NOW - dt.timedelta(minutes=30)
    e = lambda mins, fr=False: entitlements.escalation(NOW - dt.timedelta(minutes=mins), "P2", sla, NOW, fr)  # noqa: E731
    assert e(30)["level"] == "none" and e(50)["level"] == "warn" and e(61)["level"] == "lead" and e(95)["level"] == "manager" and e(30)["clock"] == "first_response"
    assert entitlements.escalation(NOW - dt.timedelta(hours=7), "P2", sla, NOW, True)["clock"] == "resolution" and entitlements.escalation(NOW - dt.timedelta(hours=7), "P2", sla, NOW, True)["level"] == "warn"


# ------------------------------------------------------------------------------------------------ tenant isolation

def test_tenant_isolation_across_index_cache_telemetry_and_logs():
    ix = tenant.TenantIndex()
    ix.add("acme", {"id": "a1", "text": "reset your SSO password in the admin console"})
    ix.add("globex", {"id": "g1", "text": "globex confidential SSO runbook password reset"})
    assert [d["id"] for d in ix.search("acme", "SSO password")] == ["a1"] and [d["id"] for d in ix.search("globex", "SSO password")] == ["g1"]
    assert all(d["tenant"] == "acme" for d in ix.search("acme", "globex confidential tenant:globex")), "a query string cannot widen the scope"
    for bad in (None, "", "acme/../globex", "a b"):
        with pytest.raises(tenant.TenantRequired):
            ix.search(bad, "x")
    c = tenant.TenantCache()
    c.put("acme", "answer-A", "q1")
    assert c.get("acme", "q1") == "answer-A" and c.get("globex", "q1") is None, "the same question in another tenant never hits the first tenant's cache"
    with pytest.raises(tenant.TenantRequired):
        c.get(None, "q1")
    ev = tenant.telemetry_event("acme", "triage", latency_ms=12, text="my password is hunter2", subject="s")
    assert "text" not in ev and "subject" not in ev and "acme" not in str(ev) and ev["tenant_hash"]
    assert tenant.scrub_log("user bob@acme.example at Acme Corp failed", ["Acme"]) == "user <email> at <tenant> Corp failed"
    assert ix.parts["acme"][0]["key_id"] == "kms/tenant/acme"


# ------------------------------------------------------------------------------------------------ OBO and permission-filtered retrieval

def test_obo_exchange_carries_the_agent_and_the_acting_service_and_filters_retrieval_by_the_agents_rights():
    ts = obo.TokenService(b"k", clock=lambda: 1000.0)
    agent = ts.issue_agent("agent.kim", ["support-agent", "grp-billing"], "acme")
    tok = ts.exchange(agent, "triage-service", ["kb:read", "ticket:set_priority", "ticket:add_internal_note"])
    claims = ts.verify(tok)
    assert claims["sub"] == "agent.kim" and claims["act"] == {"sub": "triage-service"} and claims["exp"] <= 1000 + 120
    kb = [{"id": "pub", "visibility": "public"}, {"id": "int", "visibility": "internal", "tenant": "acme"}, {"id": "bill", "visibility": "restricted", "allowed_groups": ["grp-billing"]}, {"id": "legal", "visibility": "restricted", "allowed_groups": ["grp-legal"]}, {"id": "other", "visibility": "internal", "tenant": "globex"}]
    assert [a["id"] for a in obo.retrieve_as(ts, tok, kb)] == ["pub", "int", "bill"], "no legal article, no other tenant's article reaches the model"
    pol = {"set_priority": ["support-agent"], "close": ["support-lead"], "add_internal_note": ["support-agent"]}
    ok = obo.act_as(ts, tok, "set_priority", {"id": 3, "tenant": "acme"}, pol)
    assert ok["on_behalf_of"] == "agent.kim" and ok["acting_service"] == "triage-service"
    with pytest.raises(obo.Denied, match="scope"):
        obo.act_as(ts, tok, "close", {"id": 3, "tenant": "acme"}, pol)
    with pytest.raises(obo.Denied, match="another tenant"):
        obo.act_as(ts, tok, "set_priority", {"id": 9, "tenant": "globex"}, pol)
    with pytest.raises(obo.Denied, match="queue"):
        obo.act_as(ts, tok, "set_priority", {"id": 4, "tenant": "acme", "group": "grp-enterprise"}, pol)
    with pytest.raises(obo.Denied, match="only an agent"):
        ts.exchange(tok, "x", ["kb:read"])
    ts.clock = lambda: 5000.0
    with pytest.raises(obo.Denied, match="expired"):
        ts.verify(tok)
    with pytest.raises(obo.Denied, match="invalid"):
        ts.verify(tok[:-2] + "00")


# ------------------------------------------------------------------------------------------------ approvals and feedback

def test_high_impact_actions_need_approval_by_a_different_person_and_expire():
    q = approvals.ApprovalQueue()
    assert not q.needs_approval("add_internal_note") and q.needs_approval("close_ticket") and q.needs_approval("something_new")
    q.request("r1", "close_ticket", "T1", "bot", NOW, "resolved by KB article")
    assert not q.executable("r1")
    with pytest.raises(approvals.Rejected, match="different person"):
        q.approve("r1", "bot", NOW)
    q.approve("r1", "agent.kim", NOW)
    assert q.executable("r1")
    q.request("r2", "issue_credit", "T2", "bot", NOW, "SLA breach credit")
    q.approve("r2", "lead.a", NOW)
    assert not q.executable("r2")
    with pytest.raises(approvals.Rejected, match="different person"):
        q.approve("r2", "lead.a", NOW)
    q.approve("r2", "lead.b", NOW)
    assert q.executable("r2")
    q.request("r3", "merge_tickets", "T3", "bot", NOW, "duplicates")
    with pytest.raises(approvals.Rejected, match="expired"):
        q.approve("r3", "x", NOW + dt.timedelta(hours=3))


def test_feedback_acceptance_confusions_and_operational_metrics():
    fb = feedback.FeedbackStore()
    for i, (m, a) in enumerate([("billing", "billing"), ("bug", "auth"), ("bug", "auth"), ("outage", "outage")]):
        fb.record(f"T{i}", "category", m, a, "agent.kim", NOW)
    fb.record("T9", "priority", "P3", "P2", "agent.kim", NOW)
    assert fb.acceptance()["category"] == {"n": 4, "agent_acceptance": 0.5} and fb.confusions("category") == [{"model": "bug", "agent": "auth", "n": 2}]
    t = lambda created, fr, res, **kw: {"created": NOW + dt.timedelta(minutes=created), "first_response": NOW + dt.timedelta(minutes=fr) if fr is not None else None, "resolved": NOW + dt.timedelta(hours=res) if res else None, "sla_first_response_min": 60, **kw}  # noqa: E731
    m = feedback.operational_metrics([t(0, 30, 4, reassignments=0), t(0, 90, 10, reassignments=2, escalated=True), t(0, None, None)])
    assert m["first_response_min_median"] == 60.0 and m["sla_first_response_breach_rate"] == 0.5 and m["reassignments_per_ticket"] == 0.667 and m["escalation_rate"] == 0.333


def test_language_detection_and_per_language_taxonomy():
    assert language.detect("I can not log in with my password please help")[0] == "en" and language.detect("No puedo acceder con mi contraseña")[0] == "es" and language.detect("Ich kann mich nicht anmelden")[0] == "de"
    assert language.detect("ログインできません")[0] == "ja" and language.detect("12345 !!!")[0] == "unknown"
    cfg = json.load(open(os.path.join(CFG, "taxonomy.json")))
    t = language.Taxonomy(cfg["categories"], {"en": 0.6, "es": 0.7})
    assert t.label("auth", "es") == "Acceso e inicio de sesión" and t.label("auth", "ja") == "Login and access" and t.needs_human("es", 0.65) and not t.needs_human("en", 0.65) and t.needs_human("ja", 0.7)
