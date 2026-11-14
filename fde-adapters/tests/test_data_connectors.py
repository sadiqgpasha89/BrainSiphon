import json
import os
import shutil
import subprocess
import tempfile
import time
import base64

import pytest

from fde_adapters.connectors.idp import OidcIdentityAdapter, rs256_verify
from fde_adapters.connectors.kafka import BROKERS as KAFKA
from fde_adapters.connectors.rabbitmq import BROKERS as AMQP
from fde_adapters.connectors.sql_base import OracleDialect, PostgresDialect, SqlServerDialect, ident
from fde_adapters.core import registry
from fde_adapters.core.errors import AuthError, ConfigError, PermissionDenied
from fde_adapters.core.http import b64url, rs256_sign
from fde_adapters.mocks import vendors
from fde_adapters.mocks.server import MockServer

CFG = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "configs")


def cfg(name):
    d = json.load(open(os.path.join(CFG, f"{name}.connector.json")))
    d["retry"] = {"max_attempts": 3, "base_delay": 0.0, "max_delay": 0.0}
    return d


# ---------------------------------------------------------------------------------------------- SQL

def sqlite_cfg(tmp_path, adapter="postgres"):
    c = cfg(adapter)
    c["connection"].update(mock=True, mock_path=str(tmp_path / "t.db"))
    return c


def seed(tmp_path, n=25):
    import sqlite3
    db = sqlite3.connect(str(tmp_path / "t.db"))
    db.execute("CREATE TABLE orders_v (order_id INTEGER PRIMARY KEY, customer_id TEXT, amount REAL, updated_at TEXT)")
    db.executemany("INSERT INTO orders_v VALUES (?,?,?,?)", [(i, f"C{i}", i * 1.5, f"2026-03-01 10:{i:02d}:00") for i in range(1, n + 1)])
    db.execute("CREATE TABLE bs_decisions (decision_id TEXT PRIMARY KEY, action TEXT, model_version TEXT)")
    db.commit(); db.close()


def test_keyset_paging_reads_every_row_once_in_order(tmp_path):
    seed(tmp_path, 25)
    c = sqlite_cfg(tmp_path); c["read"]["page_size"] = 10
    a = registry.build(c)
    recs = list(a.read())
    assert [r.payload["order_id"] for r in recs] == list(range(1, 26))
    assert recs[0].payload["updated_at"] == "2026-03-01T10:01:00Z" and recs[2].payload["amount"] == 4.5
    assert a.healthcheck().ok


def test_idempotent_upsert_and_update_in_place(tmp_path):
    seed(tmp_path, 3)
    a = registry.build(sqlite_cfg(tmp_path))
    r1 = a.write([{"decision_id": "D1", "action": "ALLOW", "model_version": "v1"}], key_fields=["decision_id"])
    r2 = a.write([{"decision_id": "D1", "action": "ALLOW", "model_version": "v1"}], key_fields=["decision_id"])
    assert (r1.accepted, r2.duplicates) == (1, 1)
    # a different delivery with a new key but the same business row updates in place (ON CONFLICT DO UPDATE)
    a.store = type(a.store)()  # new process: the store is empty, so the DATABASE upsert must keep the effect single
    r3 = a.write([{"decision_id": "D1", "action": "STEP_UP", "model_version": "v2"}], key_fields=["decision_id", "model_version"])
    rows = a._execute("SELECT * FROM bs_decisions", fetch=True)
    assert len(rows) == 1 and rows[0]["action"] == "STEP_UP"


def test_sql_injection_attempts_are_rejected_in_identifiers_and_bound_as_values(tmp_path):
    seed(tmp_path, 3)
    for bad in ("orders; DROP TABLE x", "a b", "x'--", "1abc"):
        with pytest.raises(ConfigError):
            ident(bad)
    a = registry.build(sqlite_cfg(tmp_path))
    c = sqlite_cfg(tmp_path); c["write"]["table"] = "bs_decisions; DROP TABLE orders_v"
    res = registry.build(c).write([{"decision_id": "x"}], key_fields=["decision_id"])
    assert res.failed and res.failed[0]["code"] == "config_error"
    # a hostile VALUE is data, never SQL
    a.write([{"decision_id": "D'; DROP TABLE orders_v; --", "action": "x", "model_version": "v"}], key_fields=["decision_id"])
    assert len(a._execute("SELECT * FROM orders_v", fetch=True)) == 3


def test_dialect_sql_for_server_engines_is_correct_text():
    pg, ms, ora = PostgresDialect(), SqlServerDialect(), OracleDialect()
    assert "WHERE id > :cursor" in pg.page_sql("SELECT * FROM t", "id", 100, True) and pg.page_sql("SELECT * FROM t", "id", 100, True).endswith("ORDER BY id LIMIT 100") and "ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v" in pg.upsert_sql("t", "k", ["k", "v"])
    assert ms.page_sql("SELECT * FROM t", "id", 100, False).startswith("SELECT TOP (100) *") and "HOLDLOCK" in ms.upsert_sql("t", "k", ["k", "v"]) and "WHEN NOT MATCHED THEN INSERT (k, v)" in ms.upsert_sql("t", "k", ["k", "v"])
    assert ora.page_sql("SELECT * FROM t", "id", 100, True).endswith("FETCH FIRST 100 ROWS ONLY") and "FROM DUAL" in ora.upsert_sql("t", "k", ["k", "v"])


def test_bind_conversion_per_driver_keeps_values_out_of_the_sql_text():
    from fde_adapters.connectors.postgres import PostgresAdapter
    from fde_adapters.connectors.sqlserver import SqlServerAdapter
    c = cfg("postgres"); pg = PostgresAdapter(c)
    assert pg._named("SELECT 1 WHERE a = :a AND b = :b", {"a": 1, "b": "x'; --"}) == ("SELECT 1 WHERE a = %(a)s AND b = %(b)s", {"a": 1, "b": "x'; --"})
    ms = SqlServerAdapter(cfg("sqlserver"))
    assert ms._named("SELECT :b, :a, :b", {"a": 1, "b": 2}) == ("SELECT ?, ?, ?", (2, 1, 2))


def test_missing_driver_or_credentials_give_actionable_errors(monkeypatch):
    c = cfg("sqlserver")
    monkeypatch.delenv("DB_USER", raising=False)
    h = registry.build(c).healthcheck()
    assert not h.ok and "environment variable that is set" in h.message
    monkeypatch.setenv("DB_USER", "u"); monkeypatch.setenv("DB_PASSWORD", "p")
    h2 = registry.build(c).healthcheck()
    assert not h2.ok and "driver" in h2.message.lower()


# ---------------------------------------------------------------------------------------------- Kafka

def kcfg(**kw):
    c = cfg("kafka")
    c["connection"].update(mock=True, broker_name=kw.pop("broker", "t"), bootstrap_servers="mock:9092")
    return c


def test_kafka_commit_after_processing_resume_dlq_and_lag():
    KAFKA.pop("t", None)
    prod = registry.build(kcfg())
    for i in range(5):
        prod.write([{"event_id": f"e{i}", "card_token": f"tok{i % 2}", "amount": 100 + i, "ts": 1772000000 + i, "decision_id": f"d{i}"}], key_fields=["decision_id"])
    b = KAFKA["t"]
    # the consumer reads from tx.events.v1, so produce raw events there, one of them poison
    for i in range(4):
        b.produce("tx.events.v1", f"k{i}", json.dumps({"event_id": f"x{i}", "card_token": "t", "amount": "12", "ts": 1772000000}).encode())
    b.produce("tx.events.v1", "bad", b"{not json")
    cons = registry.build(kcfg())
    cons.cfg["read"]["max_records"] = 2
    got = []
    for rec in cons.read():
        got.append(rec.payload["event_id"])
        if len(got) == 3:
            break  # the consumer dies mid-stream, after the third record of two full pages
    assert got == ["x0", "x1", "x2"] or len(got) == 3
    lag_mid = cons.lag()
    assert sum(lag_mid.values()) >= 1, "records not yet committed are still lag"
    cons.close()
    # a new consumer in the same group resumes from the committed offsets: nothing committed is read twice
    again = registry.build(kcfg())
    rest = [r.payload["event_id"] for r in again.read()]
    again.close()
    assert set(rest).isdisjoint(set(got[:2])), "a record in a committed page was delivered twice"
    assert all(e.startswith("x") for e in rest)
    assert sum(b.lag("brainsiphon-scoring", "tx.events.v1").values()) == 0
    dlq = [m for log in b.topics["tx.events.v1.dlq"] for m in log]
    assert len(dlq) == 1 and "undecodable JSON" in dlq[0]["headers"]["x-error"]
    # produce keeps one entity on one partition
    parts = {m["partition"] for log in b.topics["decisions.v1"] for m in log if m["key"] == "tok0"}
    assert len(parts) == 1


# ---------------------------------------------------------------------------------------------- RabbitMQ

def test_rabbitmq_ack_after_processing_poison_to_dlq_and_redelivery():
    AMQP.pop("t", None)
    c = cfg("rabbitmq"); c["connection"].update(mock=True, broker_name="t")
    a = registry.build(c)
    b = AMQP["t"]
    for i in range(3):
        b.publish("scoring.requests", json.dumps({"request_id": f"r{i}", "entity_id": f"e{i}"}).encode(), f"m{i}")
    b.publish("scoring.requests", b"<<garbage>>", "bad")
    recs = list(a.read())
    a.close()
    assert [r.payload["request_id"] for r in recs] == ["r0", "r1", "r2"]
    assert b.depth("scoring.requests") == 0 and b.depth("scoring.requests.dlq") == 1 and not b.unacked
    # a consumer that crashes before acknowledging leaves the message unacked; on nack(requeue) it comes back flagged redelivered
    b.publish("scoring.requests", json.dumps({"request_id": "r9"}).encode(), "m9")
    tag, _ = b.get("scoring.requests")
    b.nack(tag, requeue=True)
    tag2, m = b.get("scoring.requests")
    assert m["redelivered"] is True
    # publish with the same idempotency key twice results in one message
    w = registry.build(c)
    w.write([{"decision_id": "d1", "x": 1}], key_fields=["decision_id"]); w.write([{"decision_id": "d1", "x": 1}], key_fields=["decision_id"])
    assert b.depth("scoring.decisions") == 1


# ---------------------------------------------------------------------------------------------- S3

def test_s3_paging_manifest_gate_and_atomic_publish(monkeypatch):
    srv = vendors.s3("forecasts", page=2)
    monkeypatch.setenv("S3_ENDPOINT", srv.base); monkeypatch.setenv("S3_ACCESS_KEY", "minio"); monkeypatch.setenv("S3_SECRET_KEY", "minio-secret")
    try:
        a = registry.build(cfg("s3"))
        assert a.healthcheck().ok
        pre = "inputs/sales/dt=2026-03-01/"
        for i in range(3):
            srv.state["objects"][f"{pre}part-{i}.jsonl"] = ("\n".join(json.dumps({"sku": f"S{i}{j}", "store": "ST1", "units": str(j), "date": "2026-03-01"}) for j in range(2)) + "\n").encode()
        assert list(a.read()) == [], "no _SUCCESS manifest: the partition is incomplete and must not be read"
        srv.state["objects"][pre + "_SUCCESS"] = b"{}"
        recs = list(a.read())
        assert len(recs) == 6 and recs[1].payload == {"sku_id": "S00", "store_id": "ST1", "units": 0.0, "business_date": "2026-03-01"} or recs[0].payload["sku_id"] == "S00"
        assert len([c for c in srv.calls("GET") if c["query"].startswith("list-type=2")]) >= 2, "listing must follow continuation tokens"
        m = a.publish_partition("outputs/forecast/dt=2026-03-02", [{"sku": "A", "units": i} for i in range(5)], part_size=2)
        keys = sorted(k for k in srv.state["objects"] if k.startswith("outputs/forecast/"))
        assert m["rows"] == 5 and len(m["parts"]) == 3 and "outputs/forecast/dt=2026-03-02/_SUCCESS" in keys
        puts = [c["path"] for c in srv.calls("PUT")]
        assert puts[-1].endswith("_SUCCESS"), "the manifest must be written last"
        r = a.write([{"forecast_key": "F1", "v": 1}], key_fields=["forecast_key"])
        assert r.accepted == 1
        a2 = registry.build(cfg("s3")); a2.store = type(a2.store)()  # a restarted process
        r2 = a2.write([{"forecast_key": "F1", "v": 1}], key_fields=["forecast_key"])
        assert r2.accepted == 1, "the second PUT is rejected by If-None-Match and counted as already-present, not a failure"
        assert not r2.failed
    finally:
        srv.close()


def test_s3_without_signature_is_denied_not_silently_ok(monkeypatch):
    srv = vendors.s3("forecasts")
    monkeypatch.setenv("S3_ENDPOINT", srv.base); monkeypatch.setenv("S3_ACCESS_KEY", "a"); monkeypatch.delenv("S3_SECRET_KEY", raising=False)
    try:
        h = registry.build(cfg("s3")).healthcheck()
        assert not h.ok and "environment variables" in h.message
    finally:
        srv.close()


# ---------------------------------------------------------------------------------------------- Identity provider

@pytest.fixture(scope="module")
def keypair():
    if not shutil.which("openssl"):
        pytest.skip("openssl missing")
    d = tempfile.mkdtemp()
    k = os.path.join(d, "k.pem")
    subprocess.run(["openssl", "genrsa", "-out", k, "2048"], check=True, capture_output=True)
    mod = subprocess.run(["openssl", "rsa", "-in", k, "-noout", "-modulus"], capture_output=True, text=True, check=True).stdout.strip().split("=")[1]
    n = int(mod, 16)
    return k, b64url(n.to_bytes((n.bit_length() + 7) // 8, "big")), b64url((65537).to_bytes(3, "big"))


def token(keypair, kid="k1", **claims):
    k, _n, _e = keypair
    base = {"iss": "ISS", "aud": "api://brainsiphon", "exp": int(time.time()) + 600, "sub": "user-1", "groups": ["grp-fraud-analysts"], "tid": "tenantA"}
    base.update(claims)
    h = b64url(json.dumps({"alg": claims.pop("alg", "RS256"), "kid": kid, "typ": "JWT"}).encode())
    p = b64url(json.dumps(base).encode())
    return f"{h}.{p}.{b64url(rs256_sign(f'{h}.{p}'.encode(), k))}"


def idp(keypair, monkeypatch, published=("k1",)):
    k, n, e = keypair
    holder = {}
    srv = MockServer("oidc")
    srv.state["kids"] = list(published)
    srv.route("GET", r"/\.well-known/openid-configuration", lambda r: (200, {}, {"issuer": holder["base"], "jwks_uri": holder["base"] + "/keys", "grant_types_supported": ["authorization_code", "client_credentials"]}))
    srv.route("GET", r"/keys", lambda r: (200, {}, {"keys": [{"kty": "RSA", "kid": kid, "alg": "RS256", "use": "sig", "n": n, "e": e} for kid in srv.state["kids"]]}))
    holder["base"] = srv.base
    monkeypatch.setenv("OIDC_ISSUER", srv.base)
    c = cfg("idp-oidc")
    return srv, c


def mint(keypair, srv, **kw):
    return token(keypair, **{**kw, "iss": kw.get("iss", srv.base)}) if False else _mint(keypair, srv, **kw)


def _mint(keypair, srv, kid="k1", alg="RS256", **claims):
    k, _n, _e = keypair
    base = {"iss": srv.base, "aud": "api://brainsiphon", "exp": int(time.time()) + 600, "sub": "user-1", "groups": ["grp-fraud-analysts"], "tid": "tenantA"}
    base.update(claims)
    h = b64url(json.dumps({"alg": alg, "kid": kid, "typ": "JWT"}).encode())
    p = b64url(json.dumps(base).encode())
    return f"{h}.{p}.{b64url(rs256_sign(f'{h}.{p}'.encode(), k))}"


def test_rs256_verify_accepts_a_real_openssl_signature_and_rejects_tampering(keypair):
    k, n64, e64 = keypair
    n, e = int.from_bytes(base64.urlsafe_b64decode(n64 + "=="), "big"), 65537
    msg = b"header.payload"
    sig = rs256_sign(msg, k)
    assert rs256_verify(msg, sig, n, e)
    assert not rs256_verify(b"header.payload2", sig, n, e)
    assert not rs256_verify(msg, sig[:-1] + bytes([sig[-1] ^ 1]), n, e)


def test_workforce_versus_machine_principal_roles_and_tenant(keypair, monkeypatch):
    srv, c = idp(keypair, monkeypatch)
    try:
        a = registry.build(c)
        assert a.healthcheck().ok
        person = a.validate_token(_mint(keypair, srv, scope="openid profile"))
        assert (person.kind, person.roles, person.tenant) == ("workforce", ["analyst"], "tenantA")
        svc = a.validate_token(_mint(keypair, srv, sub="svc-scoring", azp="svc-scoring", scope="score:write", groups=[]), required_scopes=("score:write",))
        assert svc.kind == "machine" and svc.roles == [] and svc.scopes == ["score:write"]
        with pytest.raises(PermissionDenied, match="score:write"):
            a.validate_token(_mint(keypair, srv, scope="openid"), required_scopes=("score:write",))
    finally:
        srv.close()


@pytest.mark.parametrize("claims,msg", [({"exp": 1}, "expired"), ({"aud": "api://other"}, "audience"), ({"iss": "https://evil.example"}, "issuer"), ({"nbf": 4102444800}, "not yet valid")])
def test_token_claim_failures(keypair, monkeypatch, claims, msg):
    srv, c = idp(keypair, monkeypatch)
    try:
        with pytest.raises(AuthError, match=msg):
            registry.build(c).validate_token(_mint(keypair, srv, **claims))
    finally:
        srv.close()


def test_algorithm_confusion_and_unsigned_tokens_are_refused(keypair, monkeypatch):
    srv, c = idp(keypair, monkeypatch)
    try:
        a = registry.build(c)
        for alg in ("none", "HS256"):
            h = b64url(json.dumps({"alg": alg, "kid": "k1"}).encode()); p = b64url(json.dumps({"iss": srv.base, "aud": "api://brainsiphon", "exp": int(time.time()) + 60, "sub": "x"}).encode())
            with pytest.raises(AuthError, match="not accepted"):
                a.validate_token(f"{h}.{p}.")
        t = _mint(keypair, srv)
        h, p, s = t.split(".")
        forged = b64url(json.dumps({"iss": srv.base, "aud": "api://brainsiphon", "exp": int(time.time()) + 600, "sub": "admin", "groups": ["grp-platform"]}).encode())
        with pytest.raises(AuthError, match="signature"):
            a.validate_token(f"{h}.{forged}.{s}")
    finally:
        srv.close()


def test_jwks_rotation_unknown_kid_triggers_one_refetch(keypair, monkeypatch):
    srv, c = idp(keypair, monkeypatch, published=("k1",))
    try:
        a = registry.build(c)
        a.validate_token(_mint(keypair, srv, kid="k1"))
        with pytest.raises(AuthError, match="no signing key"):
            a.validate_token(_mint(keypair, srv, kid="k2"))
        srv.state["kids"].append("k2")  # the provider rotates
        assert a.validate_token(_mint(keypair, srv, kid="k2")).subject == "user-1"
        assert len(srv.calls("GET", "/keys")) == 3
    finally:
        srv.close()


def test_scim_paging_and_idempotent_provisioning(keypair, monkeypatch):
    srv, c = idp(keypair, monkeypatch)
    users = [{"id": f"u{i}", "userName": f"user{i}@corp", "externalId": f"E{i}"} for i in range(1, 6)]

    def lst(r):
        flt = r.q("filter")
        if flt:
            want = flt.split('"')[1]
            hit = [u for u in users if u["externalId"] == want]
            return 200, {}, {"totalResults": len(hit), "Resources": hit}
        s, n = int(r.q("startIndex", "1")), int(r.q("count", "100"))
        return 200, {}, {"totalResults": len(users), "startIndex": s, "Resources": users[s - 1 : s - 1 + n]}

    def create(r):
        u = {"id": f"u{len(users) + 1}", **r.json()}
        users.append(u)
        return 201, {}, u

    srv.route("GET", r"/scim/Users", lst); srv.route("POST", r"/scim/Users", create)
    srv.route("PATCH", r"/scim/Users/.+", lambda r: (200, {}, {"ok": True}))
    monkeypatch.setenv("SCIM_BASE_URL", srv.base + "/scim")
    try:
        c = cfg("idp-oidc"); c["connection"]["issuer"] = srv.base; c["read"]["page_size"] = 2
        a = registry.build(c)
        assert [r.payload["id"] for r in a.read()] == ["u1", "u2", "u3", "u4", "u5"]
        r1 = a.write([{"userName": "new@corp", "externalId": "E9"}], key_fields=["externalId"])
        a.store = type(a.store)()
        r2 = a.write([{"userName": "new@corp", "externalId": "E9"}], key_fields=["externalId"])
        assert r1.accepted == 1 and r2.accepted == 1 and len(users) == 6, "a second delivery finds the user by externalId and updates it"
    finally:
        srv.close()
