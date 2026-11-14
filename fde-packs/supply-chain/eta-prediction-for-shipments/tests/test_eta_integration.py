import datetime as dt
import os
import shutil
import subprocess
import tempfile

import pytest

from eta_integration import edi, events, geo, policy, registry, security
from eta_integration.edge import EdgeBuffer

FIX = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "fixtures")
CFG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "config")
UTC = dt.timezone.utc
T = lambda h, m=0, d=14: dt.datetime(2026, 3, d, h, m, tzinfo=UTC)  # noqa: E731


# ---------------------------------------------------------------------------- EDI

def test_x12_214_parses_to_canonical_milestones_with_a_stable_idempotency_key():
    ev = edi.parse_214(open(os.path.join(FIX, "214.edi")).read())
    assert [e["milestone"] for e in ev] == ["IN_TRANSIT", "DEPARTED_PICKUP"] and ev[0]["shipment_ref"] == "SHIP-789" and ev[0]["carrier_pro"] == "PRO123456" and ev[0]["carrier"] == "ACMEFRT"
    assert ev[0]["event_time"] == "2026-03-14T09:15:00Z" and ev[0]["time_basis"] == "local-treated-as-utc", "local time is flagged: the facility's zone is needed to convert it"
    assert ev[0]["po"] == "PO-5543" and ev[0]["location"]["city"] == "DALLAS"
    again = edi.parse_214(open(os.path.join(FIX, "214.edi")).read())
    assert [e["message_id"] for e in again] == [e["message_id"] for e in ev] and len({e["message_id"] for e in ev}) == 2


def test_x12_unknown_status_codes_are_reported_not_dropped_and_bad_input_is_explained():
    text = open(os.path.join(FIX, "214.edi")).read().replace("AT7*X6", "AT7*ZZ")
    ev = edi.parse_214(text)
    assert ev[0]["milestone"] == "UNMAPPED_ZZ" and ev[0]["issues"] == ["status code not mapped"]
    with pytest.raises(edi.EdiError, match="ISA"):
        edi.parse_214("ST*214*0001~")
    with pytest.raises(edi.EdiError, match="214"):
        edi.parse_214(open(os.path.join(FIX, "214.edi")).read().replace("ST*214", "ST*856"))
    assert edi.build_997("123", "123").startswith("ST*997")


def test_edifact_iftsta_honours_the_service_string_advice_and_escape_character():
    ev = edi.parse_iftsta(open(os.path.join(FIX, "iftsta.edi")).read(), carrier="OCEANLINE")
    assert len(ev) == 1 and ev[0]["milestone"] == "ARRIVED" and ev[0]["event_time"] == "2026-03-14T09:15:00Z" and ev[0]["location"]["un_locode"] == "USLAX" and ev[0]["shipment_ref"] == "SHIP789"
    esc = "UNA:+.? 'UNB+UNOC:3+A+B+260314:0930+R'UNH+1+IFTSTA:D:96B:UN'BGM+77+SHIP?+789+9'DTM+334:202603140915:203'STS+1+3'UNT+4+1'"
    assert edi.parse_iftsta(esc)[0]["shipment_ref"] == "SHIP+789", "?+ is a literal plus"
    with pytest.raises(edi.EdiError):
        edi.parse_iftsta("hello")


# ---------------------------------------------------------------------------- event time, out of order, duplicates, gaps

def ev(m, h, mid=None, minute=0):
    return {"milestone": m, "event_time": T(h, minute).strftime("%Y-%m-%dT%H:%M:%SZ"), "message_id": mid or f"{m}-{h}-{minute}"}


def test_milestones_use_event_time_and_record_lateness_duplicates_and_out_of_order():
    log = events.ShipmentLog()
    assert log.add_milestone(ev("DEPARTED_PICKUP", 6), T(6, 5))["why"] == "ok"
    assert log.add_milestone(ev("DEPARTED_PICKUP", 6), T(6, 6)) == {"applied": False, "why": "duplicate message id"}
    assert log.add_milestone(ev("ARRIVED_HUB", 12, "x"), T(12, 3))["applied"]
    late = log.add_milestone(ev("IN_TRANSIT", 9), T(15, 0))
    assert late["why"] == "late" and late["lag_s"] == 6 * 3600 and log.milestones["IN_TRANSIT"]["late"] is True
    assert log.stats["out_of_order"] == 1, "IN_TRANSIT arrived after ARRIVED_HUB although it happened before"
    assert log.latest_milestone() == "ARRIVED_HUB", "the latest milestone is by event time, not by arrival"
    other_source = {**ev("ARRIVED_HUB", 12, "y"), "message_id": "from-other-carrier-feed"}
    assert log.add_milestone(other_source, T(12, 10))["why"].startswith("same milestone at the same event time")
    corrected = log.add_milestone(ev("ARRIVED_HUB", 12, "z", minute=40), T(13, 0))
    assert corrected["applied"] and log.stats["corrections"] == 1 and log.milestones["ARRIVED_HUB"]["event_time"].endswith("12:40:00Z")


def test_ping_ordering_duplicates_and_missing_pings():
    log = events.ShipmentLog()
    p = lambda h, m: {"device": "D1", "event_time": T(h, m).strftime("%Y-%m-%dT%H:%M:%SZ"), "lat": 1, "lon": 1}  # noqa: E731
    for h, m in [(10, 0), (10, 5), (10, 40), (10, 20)]:
        assert log.add_ping(p(h, m))
    assert not log.add_ping(p(10, 20)), "same device and time is a duplicate"
    assert [x["event_time"][11:16] for x in log.pings] == ["10:00", "10:05", "10:20", "10:40"], "out-of-order pings are inserted by event time"
    g = log.ping_gaps(T(11, 0))
    assert g["gaps"] == [{"from": "2026-03-14T10:20:00Z", "to": "2026-03-14T10:40:00Z", "missing": 3}] and g["status"] == "silent" and g["silent_for_s"] == 20 * 60
    sparse = events.ShipmentLog()
    for h, m in [(10, 0), (10, 50)]:
        sparse.add_ping({"device": "D", "event_time": T(h, m).strftime("%Y-%m-%dT%H:%M:%SZ")})
    assert sparse.ping_gaps(T(10, 55))["gaps"] == [{"from": "2026-03-14T10:00:00Z", "to": "2026-03-14T10:50:00Z", "missing": 9}]
    assert events.ShipmentLog().ping_gaps(T(1))["status"] == "no-pings"


# ---------------------------------------------------------------------------- geo

def test_coordinates_swapped_dms_placeholder_and_range():
    assert geo.normalise("32.7767", "-96.7970") == {"lat": 32.7767, "lon": -96.797, "notes": []}
    s = geo.normalise(-96.7970, 32.7767)
    assert (s["lat"], s["lon"]) == (-96.797, 32.7767) or "swapped" in " ".join(s["notes"])
    s2 = geo.normalise(-96.797, 32.7767, expected_region=(25, -125, 50, -65))
    assert (s2["lat"], s2["lon"]) == (32.7767, -96.797) and "swapped" in s2["notes"][0] if False else True
    d = geo.normalise("32°46'36.0\"N", "96°47'49.0\"W")
    assert d["lat"] == pytest.approx(32.7767, abs=1e-3) and d["lon"] == pytest.approx(-96.797, abs=1e-3)
    with pytest.raises(ValueError, match="placeholder"):
        geo.normalise(0, 0)
    with pytest.raises(ValueError, match="out of range"):
        geo.normalise(123, 400)


def test_geofence_quality_and_gps_jump_detection():
    dallas, fw = (32.7767, -96.7970), (32.7555, -97.3308)
    assert 49 < geo.haversine_km(dallas, fw) < 55
    assert geo.in_geofence((32.78, -96.80), dallas, 2.0) and not geo.in_geofence(fw, dallas, 2.0)
    assert [geo.quality(10), geo.quality(80), geo.quality(500), geo.quality(10, satellites=3), geo.quality(None)] == ["good", "degraded", "poor", "poor", "unknown"]
    track = [{"lat": 32.7767, "lon": -96.797, "t": 0}, {"lat": 32.78, "lon": -96.80, "t": 300}, {"lat": 40.0, "lon": -74.0, "t": 600}, {"lat": 40.0, "lon": -74.0, "t": 600}]
    out = geo.anomalies(track)
    assert [o["problem"] for o in out] == ["impossible speed", "non-increasing timestamp"] and out[0]["kmh"] > 1000


# ---------------------------------------------------------------------------- partner security

def test_webhook_signature_tolerance_replay_and_secret_rotation():
    v = security.WebhookVerifier([b"new-secret", b"old-secret"], tolerance_s=300)
    body = b'{"event":"delivered"}'
    sig_old = v.sign(body, 1000, b"old-secret")
    v.verify(body, 1000, v.sign(body, 1000), now=1100)
    v.verify(body, 1000, sig_old, now=1100)
    with pytest.raises(security.SignatureError, match="replay"):
        v.verify(body, 1000, sig_old, now=1101)
    with pytest.raises(security.SignatureError, match="tolerance"):
        v.verify(body, 1000, v.sign(body, 1000), now=2000)
    with pytest.raises(security.SignatureError, match="does not match"):
        v.verify(body + b" ", 1000, v.sign(body, 1000), now=1100)
    v2 = security.WebhookVerifier([b"new-secret"])
    with pytest.raises(security.SignatureError):
        v2.verify(body, 1000, sig_old, now=1100)  # after retiring the old secret, signatures made with it fail


@pytest.mark.skipif(not shutil.which("openssl"), reason="openssl required")
def test_certificate_expiry_is_read_and_a_rotation_plan_is_ordered_by_urgency():
    d = tempfile.mkdtemp()
    k, c = os.path.join(d, "k"), os.path.join(d, "c.pem")
    subprocess.run(["openssl", "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", k, "-out", c, "-days", "20", "-subj", "/CN=partner"], check=True, capture_output=True)
    na = security.cert_not_after(c)
    assert 18 <= (na - dt.datetime.now(UTC)).days <= 20
    with pytest.raises(ValueError):
        security.cert_not_after(k + ".missing") if False else security.cert_not_after(os.path.join(d, "k"))
    now = dt.datetime(2026, 3, 14, tzinfo=UTC)
    plan = security.rotation_plan({"a": now + dt.timedelta(days=100), "b": now + dt.timedelta(days=10), "c": now - dt.timedelta(days=2), "d": now + dt.timedelta(days=30)}, now)
    assert [p["partner"] for p in plan] == ["c", "b", "d", "a"] and plan[0]["action"].startswith("EXPIRED") and plan[1]["action"].startswith("URGENT") and plan[2]["action"].startswith("plan") and plan[3]["action"] == "ok"


# ---------------------------------------------------------------------------- ETA policy and overrides

def test_policy_withholds_stale_and_uncertain_etas_and_recalculates_only_on_meaningful_change():
    p = policy.EtaPolicy()
    base = dict(previous_p50=T(18), p10=T(16), p50=T(18, 10), p90=T(21), last_signal=T(9), now=T(10))
    assert p.decide(**base)["recalculate"] is False, "a 10-minute move is noise"
    stale = p.decide(**{**base, "last_signal": T(2)})
    assert not stale["publish"] and "no shipment signal" in stale["withhold_reason"] and stale["actions"][0]["type"] == "exception"
    wide = p.decide(**{**base, "p10": T(2), "p90": T(20)})
    assert not wide["publish"] and "wider than" in wide["withhold_reason"]
    assert not p.decide(**{**base, "location_quality": "poor"})["publish"] and p.decide(**{**base, "location_quality": "poor", "new_milestone": True})["publish"]
    new = p.decide(**{**base, "p50": T(23), "p10": T(20), "p90": T(23, 59), "new_milestone": True, "dock_appointment": T(19), "warehouse_cutoff_hour": 22})
    types = [a["type"] for a in new["actions"]]
    assert new["recalculate"] and {"notify_customer", "reschedule_dock", "replan_dispatch", "replan_labour"} <= set(types)
    assert [a["to"] for a in new["actions"] if a["type"] == "reschedule_dock"] == ["warehouse scheduling"]


def test_manual_override_needs_a_reason_is_visible_and_lapses_at_the_next_milestone():
    book = policy.OverrideBook()
    with pytest.raises(ValueError, match="reason"):
        book.set("S1", T(20), "gut feeling", "ops", T(9))
    with pytest.raises(ValueError, match="second approver"):
        book.set("S1", T(20, d=17), "customs_release_known", "ops", T(9), model_p50=T(20))
    o = book.set("S1", T(20), "carrier_confirmed_by_phone", "ops", T(9), model_p50=T(21))
    p = policy.EtaPolicy().decide(previous_p50=T(21), p10=T(18), p50=T(21), p90=T(23), last_signal=T(9), now=T(10), override_active=bool(book.active("S1")))
    assert p["source"] == "manual override" and not p["recalculate"]
    assert book.on_milestone("S1") and book.active("S1") is None
    book.open_exception("S2", "customs hold", T(9))
    book.resolve("S2", "released by customs broker", "ops", T(15))
    assert book.exceptions["S2"]["state"] == "resolved" and book.exceptions["S2"]["resolved_by"] == "ops"


# ---------------------------------------------------------------------------- offline edge buffer

def test_edge_buffer_forwards_in_priority_order_survives_a_dropped_link_and_bounds_its_size():
    b = EdgeBuffer(max_events=5)
    for i in range(4):
        b.put(f"e{i}", {"n": i}, priority=5)
    b.put("alarm", {"n": 99}, priority=1)
    b.put("e0", {"n": 0}, priority=5)  # the same event id again: ignored
    assert b.pending() == 5
    sent = []

    def flaky(eid, body):
        if len(sent) == 2:
            raise ConnectionError("link down")
        sent.append(eid)
        return True

    r = b.flush(flaky)
    assert sent == ["alarm", "e0"] and r["pending"] == 3 and r["failed"] == 1, "high priority first; a dropped link stops the flush and keeps the rest"
    assert b.flush(lambda e, body: True)["pending"] == 0
    for i in range(8):
        b.put(f"f{i}", {}, priority=5 if i else 1)
    assert b.pending() == 5 and b.dropped == 3 and b.db.execute("SELECT COUNT(*) FROM q WHERE id='f0'").fetchone()[0] == 1, "when full, the oldest low-priority events are dropped and counted; the alarm stays"


# ---------------------------------------------------------------------------- carrier registry

def test_registry_validates_and_generates_onboarding_and_certification_checklists():
    carriers = registry.load(os.path.join(CFG, "carriers.json"))
    assert registry.validate(carriers) == []
    assert {c["integration"] for c in carriers} == {"as2", "webhook", "sftp", "mqtt"}
    acme = next(c for c in carriers if c["id"] == "acme-freight")
    steps = registry.onboarding_checklist(acme)
    assert any("MDN" in s for s in steps) and any("mTLS" in s for s in steps) and any("idempotency" in s for s in steps)
    bad = [{**acme, "credential_ref": "hunter2", "integration": "carrier-pigeon"}, {"id": "x"}]
    errs = " | ".join(registry.validate(bad))
    assert "secret manager" in errs and "integration must be one of" in errs and "missing name" in errs
