import json
import os
import subprocess
import sys
import time

import pytest

from fde_adapters.core import registry
from fde_adapters.core.errors import AdapterError, CircuitOpen, ConfigError, ContractError, PermanentError, RateLimited, TransientError, TimeoutExceeded
from fde_adapters.core.idempotency import IdempotencyStore, derive_key
from fde_adapters.core.mapping import Mapper, get_path, to_utc
from fde_adapters.core.contract import validate
from fde_adapters.core.retry import CircuitBreaker, Deadline, RetryPolicy

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


# ------------------------------------------------------------------ retry, deadline, breaker

def test_retry_backoff_honours_retry_after_and_gives_up_on_permanent():
    slept = []
    pol = RetryPolicy(max_attempts=4, base_delay=0.1, max_delay=1.0, jitter=False, sleep=slept.append)
    calls = {"n": 0}

    def fn():
        calls["n"] += 1
        if calls["n"] == 1:
            raise RateLimited("slow down", retry_after=2.5)
        if calls["n"] == 2:
            raise TransientError("503")
        return "ok"

    assert pol.call(fn) == "ok" and slept == [2.5, 0.2]
    with pytest.raises(PermanentError):
        RetryPolicy(sleep=slept.append).call(lambda: (_ for _ in ()).throw(PermanentError("400")))
    n = {"n": 0}

    def always():
        n["n"] += 1
        raise TransientError("down")

    with pytest.raises(TransientError):
        RetryPolicy(max_attempts=3, sleep=lambda s: None).call(always)
    assert n["n"] == 3


def test_retry_will_not_sleep_past_the_deadline():
    t = {"now": 0.0}
    d = Deadline(1.0, clock=lambda: t["now"])
    pol = RetryPolicy(max_attempts=5, base_delay=5, max_delay=5, jitter=False, sleep=lambda s: None)
    with pytest.raises(TimeoutExceeded, match="deadline"):
        pol.call(lambda: (_ for _ in ()).throw(TransientError("x")), deadline=d)


def test_circuit_breaker_opens_then_half_opens():
    t = {"now": 0.0}
    b = CircuitBreaker(threshold=2, reset_after=10, clock=lambda: t["now"])
    for _ in range(2):
        with pytest.raises(TransientError):
            b.call(lambda: (_ for _ in ()).throw(TransientError("x")))
    with pytest.raises(CircuitOpen):
        b.call(lambda: "never runs")
    t["now"] = 11.0
    assert b.call(lambda: "trial ok") == "trial ok" and b.opened_at is None
    # permanent errors do not count against the breaker
    for _ in range(5):
        with pytest.raises(PermanentError):
            b.call(lambda: (_ for _ in ()).throw(PermanentError("400")))
    assert b.opened_at is None


# ------------------------------------------------------------------ idempotency

def test_derived_keys_are_stable_and_namespaced():
    assert derive_key("rrn1", "stan9", namespace="switch") == derive_key("rrn1", "stan9", namespace="switch")
    assert derive_key("rrn1", "stan9", namespace="switch") != derive_key("rrn1", "stan9", namespace="other")
    assert derive_key("a", "bc") != derive_key("ab", "c")


def test_idempotency_store_lease_expiry_allows_a_retry_after_a_crash():
    t = {"now": 100.0}
    s = IdempotencyStore(lease_seconds=30, clock=lambda: t["now"])
    assert s.begin("k") is None
    assert s.begin("k") == {"_in_flight": True}, "a concurrent duplicate sees the operation in flight"
    t["now"] = 200.0
    assert s.begin("k") is None, "the first attempt crashed; after the lease the key may be retried"
    s.complete("k", {"ok": 1})
    assert s.begin("k") == {"ok": 1}


# ------------------------------------------------------------------ mapping and contract

def test_mapping_paths_transforms_units_lookups_and_issues():
    raw = {"a": {"b": [{"c": "42"}]}, "t": "20260314093000", "lact": "27", "name": ["Ada", "Lovelace"], "code": "x1", "sex": "F", "pay": 12345}
    m = Mapper({"fields": {
        "n": {"from": "a.b[0].c", "transform": ["to_int"], "required": True},
        "when": {"from": "t", "transform": ["to_utc"]},
        "lact": {"from": "lact", "transform": ["to_float", "unit:mg/dL->mmol/L:lactate"]},
        "who": {"concat": ["x", "y"], "sep": "-"},
        "gender": {"from": "sex", "transform": ["map"], "map": {"F": "female"}},
        "dflt": {"from": "missing", "default": "n/a"},
        "loinc": {"from": "code", "transform": ["lookup:local"]},
        "major": {"from": "pay", "transform": ["unit:minor->major", "round:2"]},
        "alt": {"from": "nope|a.b[0].c"},
        "src": {"value": "ehr"},
    }, "lookups": {"local": {"x1": "2524-7"}}})
    out, issues = m.apply(raw)
    assert issues == [] and out["n"] == 42 and out["when"] == "2026-03-14T09:30:00Z" and out["lact"] == 2.9973 and out["gender"] == "female"
    assert out["dflt"] == "n/a" and out["loinc"] == "2524-7" and out["major"] == 123.45 and out["alt"] == "42" and out["src"] == "ehr"
    _, bad = Mapper({"fields": {"n": {"from": "zzz", "required": True}, "f": {"from": "a", "transform": ["to_float"]}}}).apply({"a": {"b": 1}})
    assert {i["field"] for i in bad} == {"n", "f"}
    with pytest.raises(ContractError):
        Mapper({"fields": {"n": {"from": "zzz", "required": True}}}).map({})
    with pytest.raises(ConfigError, match="unknown transform"):
        Mapper({"fields": {"n": {"from": "a", "transform": ["bogus"]}}})
    with pytest.raises(ConfigError, match="no unit conversion"):
        Mapper({"fields": {"n": {"from": "a", "transform": ["unit:parsec->lightyear"]}}})
    with pytest.raises(ConfigError, match="lookup table"):
        Mapper({"fields": {"n": {"from": "a", "transform": ["lookup:nope"]}}})


def test_time_conversion_with_source_timezone_and_formats():
    assert to_utc("14/03/2026 09:30", "%d/%m/%Y %H:%M", "+05:30") == "2026-03-14T04:00:00Z"
    assert to_utc(1772000000) == to_utc(1772000000000)
    assert to_utc("2026-03-14T09:30:00+0530") == "2026-03-14T04:00:00Z"


def test_contract_validator_subset():
    schema = {"type": "object", "required": ["id", "amount"], "properties": {"id": {"type": "string", "pattern": "^T-\\d+$"}, "amount": {"type": "number", "minimum": 0, "exclusiveMaximum": 1000}, "ts": {"type": "string", "format": "date-time"}, "tags": {"type": "array", "items": {"enum": ["a", "b"]}, "maxItems": 2}}, "additionalProperties": False}
    assert validate({"id": "T-1", "amount": 5, "ts": "2026-03-14T09:30:00Z", "tags": ["a"]}, schema) == []
    errs = validate({"id": "X", "amount": -1, "ts": "yesterday", "tags": ["z", "a", "b"], "extra": 1}, schema)
    joined = " | ".join(errs)
    assert "/id" in joined and "minimum" in joined and "date-time" in joined and "/tags/0" in joined and "more than 2" in joined and "/extra: unexpected" in joined
    assert validate({"amount": True, "id": "T-1"}, schema)[0].startswith("/amount: expected number")


# ------------------------------------------------------------------ registry and shipped configs

def test_every_adapter_has_a_config_a_mock_note_and_a_unique_id():
    cat = registry.catalogue()
    ids = [a["id"] for a in cat]
    assert len(ids) == len(set(ids)) and len(ids) >= 15
    for a in cat:
        assert a["protocol"] and a["mock"], a["id"]
        assert os.path.exists(os.path.join(ROOT, "configs", f"{a['id']}.connector.json")), f"configs/{a['id']}.connector.json is missing"
    wanted = {"salesforce", "sap-odata", "servicenow", "dynamics365", "oracle", "snowflake", "databricks", "postgres", "sqlserver", "kafka", "rabbitmq", "s3", "idp-oidc", "hl7v2-mllp", "fhir-r4"}
    assert wanted <= set(ids)


def test_every_shipped_config_loads_with_its_adapter_and_has_no_inline_credentials(monkeypatch):
    # every environment variable named by a config is set to a dummy value, then each adapter is constructed (no network)
    from fde_adapters.__main__ import _dummy_env
    for f in sorted(os.listdir(os.path.join(ROOT, "configs"))):
        raw = json.load(open(os.path.join(ROOT, "configs", f)))
        _dummy_env(raw)
        for k in ("SF_INSTANCE_URL", "SN_INSTANCE_URL", "D365_ORG_URL", "SAP_BASE_URL", "SNOWFLAKE_ACCOUNT_URL", "DATABRICKS_HOST", "DATABRICKS_WAREHOUSE_ID", "KAFKA_BOOTSTRAP", "RABBIT_HOST", "S3_ENDPOINT", "OIDC_ISSUER", "FHIR_BASE_URL", "FHIR_TOKEN_URL", "AZURE_TENANT_ID"):
            monkeypatch.setenv(k, "https://example.invalid")
        a = registry.build(os.path.join(ROOT, "configs", f))
        assert a.ID == raw["adapter"], f


def test_cli_list_and_check_with_mock(tmp_path):
    r = subprocess.run([sys.executable, "-m", "fde_adapters", "list"], cwd=ROOT, capture_output=True, text=True)
    assert r.returncode == 0 and "salesforce" in r.stdout and "mock:" in r.stdout
    c = subprocess.run([sys.executable, "-m", "fde_adapters", "check", "--config", "configs/servicenow.connector.json", "--mock", "--limit", "2"], cwd=ROOT, capture_output=True, text=True, timeout=60)
    assert c.returncode == 0, c.stderr
    out = json.loads(c.stdout)
    assert out["healthy"] is True and len(out["sample_records"]) == 2 and out["sample_records"][0]["priority"] in ("P1", "P2", "P3", "P4")
    t = subprocess.run([sys.executable, "-m", "fde_adapters", "contract", "--config", "configs/salesforce.connector.json"], cwd=ROOT, capture_output=True, text=True, timeout=120)
    assert t.returncode == 0, t.stdout + t.stderr
    assert "FAIL" not in t.stdout and t.stdout.count("PASS") >= 5
