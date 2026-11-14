import json
import os
import subprocess
import sys

import pytest

from bs_preflight import config as cfgmod
from bs_preflight.model import CheckResult, FAIL, PASS, WARN, SKIP, redact, verdict, register_secret
from bs_preflight.netutil import effective_proxy, no_proxy_matches, connect, ProxyError
from bs_preflight.report import to_json, to_junit, to_markdown
from bs_preflight.runner import build_context, build_report, run_all
from servers import FakeProxy, Tcp, free_port


def test_no_proxy_patterns():
    assert no_proxy_matches("db.corp.local", ".corp.local")
    assert no_proxy_matches("10.4.5.6", ["10.0.0.0/8"])
    assert not no_proxy_matches("11.4.5.6", ["10.0.0.0/8"])
    assert no_proxy_matches("anything", "*")
    assert not no_proxy_matches("api.example.com", "corp.local")
    assert effective_proxy({"https_proxy": "http://p:3128", "no_proxy": ["10.0.0.0/8"]}, "10.1.1.1") is None
    assert effective_proxy({"https_proxy": "http://p:3128"}, "api.example.com") == "http://p:3128"


def test_connect_through_proxy_allows_and_refuses():
    target = Tcp(lambda s: s.sendall(b"hi"))
    allowed = FakeProxy(["127.0.0.1"])
    try:
        s = connect("127.0.0.1", target.port, 3, {"https_proxy": f"http://127.0.0.1:{allowed.port}"})
        assert s.recv(2) == b"hi"
        s.close()
    finally:
        allowed.close()
    denied = FakeProxy([])
    try:
        with pytest.raises(ProxyError) as e:
            connect("127.0.0.1", target.port, 3, {"https_proxy": f"http://127.0.0.1:{denied.port}"})
        assert e.value.status == 403
    finally:
        denied.close()
    needs_auth = FakeProxy(["127.0.0.1"], require_auth=True)
    try:
        with pytest.raises(ProxyError) as e:
            connect("127.0.0.1", target.port, 3, {"https_proxy": f"http://127.0.0.1:{needs_auth.port}"})
        assert e.value.status == 407
    finally:
        needs_auth.close()
        target.close()


def test_redaction_removes_secrets_by_key_and_by_value(monkeypatch):
    monkeypatch.setenv("MY_TEST_SECRET", "abcdef123456")
    register_secret("MY_TEST_SECRET")
    out = redact({"client_secret": "x", "note": "the value abcdef123456 leaked", "client_secret_env": "MY_TEST_SECRET", "nested": [{"password": "p"}]})
    assert out["client_secret"] == "***"
    assert "abcdef123456" not in out["note"]
    assert out["client_secret_env"] == "MY_TEST_SECRET"
    assert out["nested"][0]["password"] == "***"


def test_verdict_rules():
    ok = CheckResult("a", "a", "x", PASS)
    adv = CheckResult("b", "b", "x", WARN, severity="advisory")
    bad = CheckResult("c", "c", "x", FAIL)
    assert verdict([ok])["readiness"] == "READY"
    assert verdict([ok, adv])["readiness"] == "READY_WITH_WARNINGS"
    v = verdict([ok, adv, bad])
    assert v["readiness"] == "NOT_READY" and v["blocking_failures"] == ["c"]
    # an advisory failure never blocks
    assert verdict([CheckResult("d", "d", "x", FAIL, severity="advisory")])["readiness"] == "READY_WITH_WARNINGS"


def test_config_rejects_inline_credentials_and_unknown_keys(tmp_path):
    p = tmp_path / "c.json"
    p.write_text(json.dumps({"api_auth": [{"name": "x", "client_secret": "oops"}]}))
    with pytest.raises(cfgmod.ConfigError, match="do not put credentials"):
        cfgmod.load(str(p))
    p.write_text(json.dumps({"nonsense": []}))
    with pytest.raises(cfgmod.ConfigError, match="unknown configuration key"):
        cfgmod.load(str(p))
    p.write_text(json.dumps({"tcp": [{"name": "a", "host": "h"}]}))
    with pytest.raises(cfgmod.ConfigError, match="missing required key 'port'"):
        cfgmod.load(str(p))


def test_env_expansion(monkeypatch, tmp_path):
    monkeypatch.setenv("KAFKA_HOST", "broker.corp.local")
    p = tmp_path / "c.json"
    p.write_text(json.dumps({"tcp": [{"name": "k", "host": "${KAFKA_HOST}", "port": 9093}, {"name": "d", "host": "${UNSET_X:-fallback.local}", "port": 1}]}))
    c = cfgmod.load(str(p))
    assert c["tcp"][0]["host"] == "broker.corp.local" and c["tcp"][1]["host"] == "fallback.local"


def test_end_to_end_report_is_valid_and_ordered(tmp_path):
    t = Tcp(lambda s: None)
    closed = free_port()
    cfg = {"customer": "acme", "environment": "staging", "tcp": [{"name": "up", "host": "127.0.0.1", "port": t.port}, {"name": "down", "host": "127.0.0.1", "port": closed, "timeout": 1}]}
    ctx = build_context(cfg)
    rep = build_report(cfg, ctx, run_all(cfg, ctx))
    t.close()
    assert rep["summary"]["readiness"] == "NOT_READY" and rep["summary"]["blocking_failures"] == ["tcp.down"]
    assert rep["schema_version"] == "1.0" and rep["customer"] == "acme"
    down = [c for c in rep["checks"] if c["id"] == "tcp.down"][0]
    assert "connection_refused" in down["message"] and down["remediation"]
    assert "NOT_READY" in to_markdown(rep) and "<testsuite" in to_junit(rep)
    json.loads(to_json(rep))


def test_cli_exit_codes_and_files(tmp_path):
    t = Tcp(lambda s: None)
    cfgp = tmp_path / "pf.json"
    cfgp.write_text(json.dumps({"tcp": [{"name": "up", "host": "127.0.0.1", "port": t.port}]}))
    out = tmp_path / "r.json"
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    r = subprocess.run([sys.executable, "-m", "bs_preflight", "run", "--config", str(cfgp), "--out", str(out), "--markdown", str(tmp_path / "r.md"), "--junit", str(tmp_path / "r.xml"), "--quiet"], cwd=root, capture_output=True, text=True)
    t.close()
    assert r.returncode == 0, r.stderr
    assert json.loads(out.read_text())["summary"]["readiness"] == "READY"
    assert (tmp_path / "r.md").exists() and (tmp_path / "r.xml").exists()
    bad = subprocess.run([sys.executable, "-m", "bs_preflight", "run", "--config", str(tmp_path / "missing.json")], cwd=root, capture_output=True, text=True)
    assert bad.returncode == 2


def test_offline_mode_skips_internet_checks_and_never_connects():
    cfg = {"offline": True, "tcp": [{"name": "pub", "host": "example.com", "port": 443, "requires_internet": True}]}
    ctx = build_context(cfg)
    res = run_all(cfg, ctx)
    assert res[0].status == SKIP and "offline" in res[0].message
