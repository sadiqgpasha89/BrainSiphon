import time

import jwt
import numpy as np
import pandas as pd
import pytest
from bsref import auth, bus, cdc, config, db, drift, featurestore, feedback, hitl, observability, validation
from bsref.registry import Registry, RegistryError
from bsref.web import create_app
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import Depends
from fastapi.testclient import TestClient
from sqlalchemy import func, select


# ── event log + CDC ──
def test_publish_is_idempotent_and_consume_commits_offsets(home):
    with db.tx() as c:
        assert bus.publish(c, "t", "e1", "k", {"n": 1})
        assert not bus.publish(c, "t", "e1", "k", {"n": 1})  # producer retry
        assert bus.publish(c, "t", "e2", "k", {"n": 2})
    seen = []
    assert bus.consume("t", "g", lambda conn, ev: seen.append(ev["n"])) == {"processed": 2, "dead_lettered": 0}
    assert bus.consume("t", "g", lambda conn, ev: seen.append(ev["n"]))["processed"] == 0  # nothing is redelivered
    assert seen == [1, 2]
    with db.tx() as c:
        assert bus.lag(c, "t", "g") == 0 and bus.lag(c, "t", "other-group") == 2


def test_poison_event_goes_to_dead_letters_and_does_not_block_the_stream(home):
    with db.tx() as c:
        for i in range(3):
            bus.publish(c, "t", f"e{i}", "k", {"n": i})

    def handler(conn, ev):
        if ev["n"] == 1:
            raise ValueError("cannot parse")
        feedback.record(conn, "x", str(ev["n"]), "test", "ok", "tester")

    assert bus.consume("t", "g", handler) == {"processed": 2, "dead_lettered": 1}
    with db.tx() as c:
        assert "cannot parse" in c.execute(select(db.dead_letters.c.error)).scalar_one()
        # the good events took effect exactly once even though the batch was rolled back and replayed
        assert [r[0] for r in c.execute(select(db.feedback.c.subject_id).order_by(db.feedback.c.id))] == ["0", "2"]


def test_handler_effects_roll_back_with_a_failed_attempt(home):
    with db.tx() as c:
        bus.publish(c, "t", "e0", "k", {"n": 0})
    attempts = []

    def flaky(conn, ev):
        feedback.record(conn, "x", "1", "test", "label", "tester")  # written, then rolled back twice
        attempts.append(1)
        if len(attempts) < 3:  # fails in the batch attempt and in the first single-event attempt
            raise RuntimeError("transient")

    assert bus.consume("t", "g", flaky)["processed"] == 1
    with db.tx() as c:
        assert c.execute(select(func.count()).select_from(db.feedback)).scalar_one() == 1  # exactly-once effect


def test_cdc_relay_checkpoints_and_never_duplicates(home):
    with db.tx(db.source_engine()) as c:
        for i in range(5):
            cdc.append_outbox(c, "order", "order.created", str(i), {"i": i})
        cdc.append_outbox(c, "order", "order.unrouted", "x", {})
    topics = {"order.created": "orders"}
    assert cdc.relay(topics)["relayed"] == 5
    assert cdc.relay(topics)["relayed"] == 0  # checkpoint holds
    with db.tx(db.source_engine()) as c:
        cdc.append_outbox(c, "order", "order.created", "5", {"i": 5})
    out = cdc.relay(topics)
    assert out["relayed"] == 1
    got = []
    bus.consume("orders", "g", lambda conn, ev: got.append(ev["data"]["i"]))
    assert got == [0, 1, 2, 3, 4, 5]  # source order preserved


# ── validation ──
CONTRACT = {
    "dataset": "txn",
    "fields": [
        {"name": "id", "type": "string", "pattern": r"t\d+"},
        {"name": "amount", "type": "number", "min": 0.01, "max": 1000},
        {"name": "rail", "type": "string", "enum": ["card", "upi"]},
        {"name": "note", "type": "string", "required": False, "max_length": 5},
    ],
    "dataset_rules": {"min_rows": 2, "max_bad_row_rate": 0.4, "unique": [["id"]], "max_null_rate": {"amount": 0.5}},
}


def test_record_validation_names_every_violation():
    assert validation.validate_record(CONTRACT, {"id": "t1", "amount": 5.0, "rail": "card"}) == []
    v = validation.validate_record(CONTRACT, {"id": "x", "amount": -1, "rail": "wire", "note": "too long"})
    assert len(v) == 4
    assert validation.validate_record(CONTRACT, {"id": "t1", "amount": "5", "rail": "card"}) == ["amount: expected number, got str"]
    assert validation.validate_record(CONTRACT, {"id": "t1", "rail": "card"}) == ["amount: missing"]


def test_frame_validation_splits_rows_and_enforces_dataset_rules():
    df = pd.DataFrame({"id": ["t1", "t2", "t3"], "amount": [1.0, 2.0, np.nan], "rail": ["card", "upi", "card"]})
    good, rep = validation.validate_frame(CONTRACT, df)
    assert len(good) == 2 and rep.bad_rows == 1 and rep.passed
    dup = pd.DataFrame({"id": ["t1", "t1"], "amount": [1.0, 2.0], "rail": ["card", "upi"]})
    _, rep = validation.validate_frame(CONTRACT, dup)
    assert not rep.passed
    with pytest.raises(validation.DataValidationError):
        rep.raise_if_failed()


# ── registry ──
def test_registry_versions_promotion_rollback_and_integrity(tmp_path):
    reg = Registry(tmp_path)
    v1 = reg.register("m", {"w": 1}, {"auc": 0.8}, {}, ["a", "b"], "h1")
    v2 = reg.register("m", {"w": 2}, {"auc": 0.9}, {}, ["a", "b"], "h2")
    assert (v1, v2) == ("v0001", "v0002")
    with pytest.raises(RegistryError):
        reg.load("m")  # nothing promoted yet
    reg.promote("m", v1, "ci", "first")
    reg.promote("m", v2, "ci", "better")
    assert reg.load("m")[0] == {"w": 2}
    assert reg.rollback("m", "oncall", "regression") == v1
    assert reg.load("m")[0] == {"w": 1}
    assert [h["action"] for h in reg.history("m")] == ["promote", "promote", "rollback"]
    (tmp_path / "m" / v1 / "model.joblib").write_bytes(b"tampered")
    with pytest.raises(RegistryError, match="checksum"):
        reg.load("m")


# ── auth ──
def _app():
    app = create_app("t", "0")

    @app.get("/admin")
    def admin(p: auth.Principal = Depends(auth.require("ml-admin"))):
        return {"ok": p.subject}

    return TestClient(app)


def test_local_auth_issues_tokens_and_enforces_roles(home):
    client = _app()
    assert client.get("/admin").status_code == 401
    assert client.post("/auth/token", data={"username": "ana", "password": "wrong"}).status_code == 401
    assert client.post("/auth/token", data={"username": "ghost", "password": "x"}).status_code == 401
    ana = client.post("/auth/token", data={"username": "ana", "password": "ana-pass"}).json()["access_token"]
    bo = client.post("/auth/token", data={"username": "bo", "password": "bo-pass"}).json()["access_token"]
    assert client.get("/admin", headers={"Authorization": f"Bearer {ana}"}).status_code == 403
    assert client.get("/admin", headers={"Authorization": f"Bearer {bo}"}).json() == {"ok": "bo"}
    assert client.get("/admin", headers={"Authorization": f"Bearer {bo}x"}).status_code == 401
    assert client.get("/healthz").json() == {"status": "ok"} and client.get("/readyz").status_code == 200
    assert "http_requests_total" in client.get("/metrics").text


def test_login_is_throttled_after_repeated_failures(home):
    client = _app()
    for _ in range(5):
        assert client.post("/auth/token", data={"username": "ana", "password": "nope"}).status_code == 401
    assert client.post("/auth/token", data={"username": "ana", "password": "ana-pass"}).status_code == 429


def test_expired_token_is_rejected(home, monkeypatch):
    monkeypatch.setenv("TOKEN_TTL_SECONDS", "-10")
    config.reset_settings()
    client = _app()
    tok = client.post("/auth/token", data={"username": "bo", "password": "bo-pass"}).json()["access_token"]
    assert client.get("/admin", headers={"Authorization": f"Bearer {tok}"}).status_code == 401


def test_oidc_mode_verifies_rs256_tokens_from_an_identity_provider(home, monkeypatch):
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    pub = key.public_key().public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo)
    (home / "idp.pem").write_bytes(pub)
    monkeypatch.setenv("AUTH_MODE", "oidc")
    monkeypatch.setenv("JWT_PUBLIC_KEY_FILE", str(home / "idp.pem"))
    monkeypatch.setenv("OIDC_ISSUER", "https://idp.test/")
    monkeypatch.setenv("OIDC_AUDIENCE", "bsref-api")
    config.reset_settings()
    client = _app()
    claims = {"sub": "carol", "roles": ["ml-admin"], "iss": "https://idp.test/", "aud": "bsref-api", "exp": int(time.time()) + 60}
    good = jwt.encode(claims, key, algorithm="RS256")
    assert client.get("/admin", headers={"Authorization": f"Bearer {good}"}).json() == {"ok": "carol"}
    wrong_aud = jwt.encode({**claims, "aud": "other"}, key, algorithm="RS256")
    assert client.get("/admin", headers={"Authorization": f"Bearer {wrong_aud}"}).status_code == 401
    other = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    forged = jwt.encode(claims, other, algorithm="RS256")
    assert client.get("/admin", headers={"Authorization": f"Bearer {forged}"}).status_code == 401
    assert client.post("/auth/token", data={"username": "bo", "password": "bo-pass"}).status_code in (401, 404)


# ── human review ──
def test_review_queue_claim_is_exclusive_and_decisions_are_final(home):
    with db.tx() as c:
        tid = hitl.create_task(c, "payment", "txn-1", {"amount": 10})
        assert hitl.create_task(c, "payment", "txn-1", {"amount": 10}) == tid  # idempotent
        assert hitl.claim(c, tid, "ana")["status"] == "claimed"
        with pytest.raises(hitl.ReviewError):
            hitl.claim(c, tid, "bo")
        assert hitl.decide(c, tid, "ana", "approve")["status"] == "approved"
        with pytest.raises(hitl.ReviewError):
            hitl.decide(c, tid, "bo", "reject")


def test_four_eyes_needs_two_distinct_approvers_and_never_the_requester(home):
    with db.tx() as c:
        tid = hitl.create_task(c, "action", "a-1", {}, requested_by="ana", required_approvals=2)
        with pytest.raises(hitl.ReviewError, match="requester"):
            hitl.decide(c, tid, "ana", "approve")
        assert hitl.decide(c, tid, "bo", "approve")["status"] == "open"
        with pytest.raises(hitl.ReviewError, match="already decided"):
            hitl.decide(c, tid, "bo", "approve")
        assert hitl.decide(c, tid, "cy", "approve")["status"] == "approved"


def test_overdue_reviews_expire(home):
    with db.tx() as c:
        tid = hitl.create_task(c, "action", "a-2", {}, sla_seconds=-1)
        assert hitl.expire_overdue(c) == 1
        assert hitl.get_task(c, tid)["status"] == "expired"


# ── monitoring ──
def test_alerts_fire_once_and_resolve(home):
    with db.tx() as c:
        assert [a["status"] for a in observability.evaluate_alerts(c, {"error_rate": 0.2})] == ["firing"]
        assert observability.evaluate_alerts(c, {"error_rate": 0.3}) == []  # still firing: no duplicate page
        assert len(observability.firing(c)) == 1
        assert [a["status"] for a in observability.evaluate_alerts(c, {"error_rate": 0.01})] == ["resolved"]
        assert observability.firing(c) == []
    assert "alert: HighErrorRate" in observability.render_prometheus_rules(observability.load_rules())


def test_psi_is_near_zero_for_the_same_distribution_and_large_for_a_shift():
    rng = np.random.default_rng(0)
    ref = drift.reference_bins(rng.normal(0, 1, 5000))
    assert drift.psi(ref, rng.normal(0, 1, 5000)) < 0.02
    assert drift.psi(ref, rng.normal(1.0, 1, 5000)) > 0.25


def test_online_feature_store_round_trip(home):
    with db.tx() as c:
        assert featurestore.get(c, "card", "1") == (None, None)
        featurestore.put(c, "card", "1", {"n": 1}, 10.0)
        featurestore.put(c, "card", "1", {"n": 2}, 20.0)
        assert featurestore.get(c, "card", "1") == ({"n": 2}, 20.0)
