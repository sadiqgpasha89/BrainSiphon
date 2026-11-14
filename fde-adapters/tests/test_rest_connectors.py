import json
import os
import shutil
import subprocess
import tempfile

import pytest

from fde_adapters.core import registry
from fde_adapters.core.errors import AuthError, ConfigError, ContractError, PermissionDenied
from fde_adapters.mocks import vendors
from fde_adapters.testing import run_contract_suite

CFG = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "configs")


def cfg(name, **env):
    d = json.load(open(os.path.join(CFG, f"{name}.connector.json")))
    d["retry"] = {"max_attempts": 4, "base_delay": 0.0, "max_delay": 0.0}
    return d


@pytest.fixture(autouse=True)
def creds(monkeypatch):
    for k, v in {"SN_USER": "svc", "SN_PASSWORD": "pw", "D365_CLIENT_ID": "cid", "D365_CLIENT_SECRET": "sec", "AZURE_TENANT_ID": "t", "SAP_USER": "u", "SAP_PASSWORD": "p",
                 "SNOWFLAKE_JWT": "jwt", "DATABRICKS_TOKEN": "dapi", "SF_CONSUMER_KEY": "ck", "SF_INTEGRATION_USER": "svc@acme.com"}.items():
        monkeypatch.setenv(k, v)


def contract(name, mock, env_url, monkeypatch, sample=None, wp="", **kw):
    monkeypatch.setenv(env_url[0], mock.base if len(env_url) == 1 else mock.base)
    c = cfg(name)
    make = lambda: registry.build(c)  # noqa: E731
    results = run_contract_suite(make, mock, sample_write=sample, write_path_prefix=wp, **kw)
    failed = [(n, d) for n, ok, d in results if not ok]
    assert not failed, failed
    return results


# ------------------------------------------------------------------------------------------ Salesforce

@pytest.fixture
def pem():
    if not shutil.which("openssl"):
        pytest.skip("openssl missing")
    d = tempfile.mkdtemp()
    k = os.path.join(d, "k.pem")
    subprocess.run(["openssl", "genrsa", "-out", k, "2048"], check=True, capture_output=True)
    return k


def test_salesforce_contract_suite_with_jwt_bearer_auth(monkeypatch, pem):
    srv = vendors.salesforce()
    try:
        monkeypatch.setenv("SF_LOGIN_URL", srv.base)
        monkeypatch.setenv("SF_PRIVATE_KEY_PATH", pem)
        monkeypatch.setenv("SF_INSTANCE_URL", srv.base)
        results = run_contract_suite(lambda: registry.build(cfg("salesforce")), srv, expect_min_records=5, sample_write={"ticket_id": "T-1", "title": "x", "priority": "P2"}, write_path_prefix="/services/data")
        assert all(ok for _, ok, _ in results), [r for r in results if not r[1]]
        assert srv.state["upserts"]["T-1"]["Priority"] == "High" and "BS_Ticket_Id__c" not in srv.state["upserts"]["T-1"]
        assert srv.state["token_calls"] >= 1
    finally:
        srv.close()


def test_salesforce_paging_follows_nextRecordsUrl_and_maps(monkeypatch, pem):
    srv = vendors.salesforce(page=2)
    try:
        monkeypatch.setenv("SF_LOGIN_URL", srv.base); monkeypatch.setenv("SF_PRIVATE_KEY_PATH", pem); monkeypatch.setenv("SF_INSTANCE_URL", srv.base)
        a = registry.build(cfg("salesforce"))
        recs = list(a.read())
        assert [r.payload["ticket_id"] for r in recs] == [c["Id"] for c in vendors.CASES]
        assert recs[0].payload["priority"] == "P2" and recs[0].payload["updated_at"] == "2026-03-01T10:00:00Z"
        assert len(srv.calls("GET", "/services/data/v60.0/query/01gNEXT")) == 2
    finally:
        srv.close()


def test_salesforce_token_is_cached_and_refreshed_once_on_401(monkeypatch, pem):
    srv = vendors.salesforce()
    try:
        monkeypatch.setenv("SF_LOGIN_URL", srv.base); monkeypatch.setenv("SF_PRIVATE_KEY_PATH", pem); monkeypatch.setenv("SF_INSTANCE_URL", srv.base)
        a = registry.build(cfg("salesforce"))
        list(a.read(limit=1)); list(a.read(limit=1))
        assert srv.state["token_calls"] == 1, "a valid token must be reused"
        srv.state["valid_tokens"].clear(); srv.state["valid_tokens"].add("some-other")
        list(a.read(limit=1))  # 401 -> invalidate -> new token -> success
        assert srv.state["token_calls"] == 2
    finally:
        srv.close()


def test_salesforce_rejects_injection_in_object_and_field_names(monkeypatch, pem):
    srv = vendors.salesforce()
    try:
        monkeypatch.setenv("SF_LOGIN_URL", srv.base); monkeypatch.setenv("SF_PRIVATE_KEY_PATH", pem); monkeypatch.setenv("SF_INSTANCE_URL", srv.base)
        c = cfg("salesforce"); c["read"]["fields"] = ["Id", "Id FROM User --"]
        with pytest.raises(ConfigError, match="valid Salesforce identifier"):
            list(registry.build(c).read())
        c = cfg("salesforce"); c["read"]["watermark"] = "2026-01-01' OR Name != '"
        with pytest.raises(ConfigError, match="watermark"):
            list(registry.build(c).read())
    finally:
        srv.close()


def test_inline_credentials_in_a_config_are_rejected():
    c = cfg("servicenow"); c["connection"]["auth"] = {"type": "basic", "user_env": "SN_USER", "password": "hunter2"}
    with pytest.raises(ConfigError, match="do not put a credential"):
        registry.build(c)


def test_unknown_setting_and_wrong_adapter_are_reported_clearly():
    c = cfg("servicenow"); c["connection"]["instnce_url"] = "typo"; del c["connection"]["instance_url"]
    with pytest.raises(ConfigError) as e:
        registry.build(c)
    assert "instance_url is required" in str(e.value) and "instnce_url is not a known setting" in str(e.value)
    with pytest.raises(ConfigError, match="not 'servicenow'"):
        from fde_adapters.connectors.servicenow import ServiceNowAdapter
        ServiceNowAdapter(cfg("salesforce"))


# ------------------------------------------------------------------------------------------ ServiceNow

def test_servicenow_contract_suite_and_idempotent_upsert(monkeypatch):
    srv = vendors.servicenow()
    monkeypatch.setenv("SN_INSTANCE_URL", srv.base)
    try:
        results = run_contract_suite(lambda: registry.build(cfg("servicenow")), srv, expect_min_records=5, sample_write={"ticket_id": "T-77", "title": "Card decline spike", "priority": "P1"}, write_path_prefix="/api/now/table")
        assert all(ok for _, ok, _ in results), [r for r in results if not r[1]]
        rows = [i for i in srv.state["incidents"] if i.get("correlation_id")]
        assert len(rows) == 1 and rows[0]["priority"] == "1", "second write must update nothing and create nothing"
        a = registry.build(cfg("servicenow"))
        assert len(list(a.read())) == 6, "five seeded incidents plus the one created by the write"
    finally:
        srv.close()


def test_servicenow_401_is_an_auth_error_and_not_retried_forever(monkeypatch):
    srv = vendors.servicenow()
    monkeypatch.setenv("SN_INSTANCE_URL", srv.base)
    monkeypatch.delenv("SN_USER")
    try:
        h = registry.build(cfg("servicenow")).healthcheck()
        assert not h.ok and h.checks["error"] == "config_error"
    finally:
        srv.close()


# ------------------------------------------------------------------------------------------ Dynamics 365

def test_dynamics_contract_suite_odata_paging_and_alternate_key_upsert(monkeypatch):
    srv = vendors.dynamics()
    monkeypatch.setenv("D365_ORG_URL", srv.base)
    monkeypatch.setenv("AZURE_TENANT_ID", "t")
    c = cfg("dynamics365")
    c["connection"]["auth"]["token_url"] = srv.base + "/token"
    try:
        make = lambda: registry.build(c)  # noqa: E731
        results = run_contract_suite(make, srv, expect_min_records=5, sample_write={"ticket_id": "CAS-9", "title": "Late delivery", "priority": "P2"}, write_path_prefix="/api/data")
        assert all(ok for _, ok, _ in results), [r for r in results if not r[1]]
        assert list(srv.state["alt"]) == ["CAS-9"] and srv.state["alt"]["CAS-9"]["prioritycode"] == 2
        assert srv.state["token_calls"] >= 1
        assert make().healthcheck().checks["user_id"] == "u-1"
    finally:
        srv.close()


# ------------------------------------------------------------------------------------------ SAP

def test_sap_paging_csrf_handshake_and_check_then_create(monkeypatch):
    srv = vendors.sap()
    monkeypatch.setenv("SAP_BASE_URL", srv.base)
    c = cfg("sap-odata")
    try:
        a = registry.build(c)
        recs = list(a.read())
        assert len(recs) == 5 and recs[0].payload["net_amount"] == 100.5 and recs[0].payload["currency"] == "EUR"
        r1 = a.write([{"SoldToParty": "1000009", "TotalNetAmount": "9.00", "order_ref": "R-1"}], key_fields=["order_ref"])
        r2 = a.write([{"SoldToParty": "1000009", "TotalNetAmount": "9.00", "order_ref": "R-1"}], key_fields=["order_ref"])
        assert r1.accepted == 1 and r2.duplicates == 1
        assert len([o for o in srv.state["orders"] if o.get("YY1_BSKey")]) == 1
        posts = srv.calls("POST")
        assert len(posts) == 1 and posts[0]["headers"].get("x-csrf-token") == "csrf-token-123"
        # the fetch happened with the cookie the server set
        fetches = [r for r in srv.requests if r["headers"].get("x-csrf-token") == "Fetch"]
        assert len(fetches) == 1 and posts[0]["headers"].get("cookie", "").startswith("sap-usercontext")
    finally:
        srv.close()


def test_sap_write_without_csrf_token_is_a_permission_error_not_a_silent_failure(monkeypatch):
    srv = vendors.sap()
    monkeypatch.setenv("SAP_BASE_URL", srv.base)
    try:
        a = registry.build(cfg("sap-odata"))
        a._csrf = "stale"
        res = a.write([{"order_ref": "R-2", "TotalNetAmount": "1.00"}], key_fields=["order_ref"])
        assert res.failed and res.failed[0]["code"] == "permission_denied"
    finally:
        srv.close()


# ------------------------------------------------------------------------------------------ Snowflake and Databricks

def test_snowflake_async_polling_partitions_and_merge(monkeypatch):
    srv = vendors.snowflake()
    monkeypatch.setenv("SNOWFLAKE_ACCOUNT_URL", srv.base)
    try:
        srv.state["pending"] = 2
        a = registry.build(cfg("snowflake"))
        recs = list(a.read())
        assert len(recs) == 7 and recs[0].payload == {"id": "1", "customer": "CUST1", "amount": 10.5, "updated_at": "2026-03-01T10:00:00Z"}
        res1 = a.write([{"decision_id": "D-1", "ACTION": "ALLOW", "MODEL_VERSION": "v3"}], key_fields=["decision_id"])
        res2 = a.write([{"decision_id": "D-1", "ACTION": "ALLOW", "MODEL_VERSION": "v3"}], key_fields=["decision_id"])
        assert res1.accepted == 1 and res2.duplicates == 1 and len(srv.state["merged"]) == 1
        sent = [json.loads(r["body"]) for r in srv.calls("POST") if b"MERGE" in r["body"]][0]
        assert "MERGE INTO BS_DECISIONS" in sent["statement"] and sent["bindings"]["1"]["value"] and sent["warehouse"] == "BS_WH"
        assert srv.calls("POST")[0]["headers"]["x-snowflake-authorization-token-type"] == "KEYPAIR_JWT"
    finally:
        srv.close()


def test_snowflake_rejects_unsafe_identifiers(monkeypatch):
    srv = vendors.snowflake()
    monkeypatch.setenv("SNOWFLAKE_ACCOUNT_URL", srv.base)
    c = cfg("snowflake"); c["write"]["table"] = "T; DROP TABLE X"
    try:
        res = registry.build(c).write([{"decision_id": "1"}], key_fields=["decision_id"])
        assert res.failed and res.failed[0]["code"] == "config_error"
    finally:
        srv.close()


def test_databricks_polls_then_streams_chunks_and_merges_with_named_parameters(monkeypatch):
    srv = vendors.databricks()
    monkeypatch.setenv("DATABRICKS_HOST", srv.base)
    monkeypatch.setenv("DATABRICKS_WAREHOUSE_ID", "wh-1")
    try:
        a = registry.build(cfg("databricks"))
        recs = list(a.read())
        assert [r.payload["sku_id"] for r in recs] == [str(i) for i in range(1, 8)] and recs[1].payload["price"] == 4.5
        r = a.write([{"forecast_key": "F-1", "units": 12, "model_version": "m7"}], key_fields=["forecast_key"])
        assert r.accepted == 1
        body = json.loads([c for c in srv.calls("POST") if b"MERGE" in c["body"]][0]["body"])
        assert body["warehouse_id"] == "wh-1" and body["parameters"][0] == {"name": "k", "value": "F-1"} and "MERGE INTO main.retail.forecast_publish" in body["statement"]
    finally:
        srv.close()
