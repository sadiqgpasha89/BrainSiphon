import sys

from bs_preflight.checks import cmd, egress, proxy
from bs_preflight.model import Context, FAIL, PASS, SKIP, WARN
from servers import FakeProxy, Tcp, free_port


def test_proxy_connect_allow_and_deny_with_reasons():
    target = Tcp(lambda s: None)
    p = FakeProxy(["127.0.0.1"])
    other = FakeProxy([])
    try:
        ctx = Context(proxy={"https_proxy": f"http://127.0.0.1:{p.port}", "no_proxy": ["10.0.0.0/8"]})
        res = proxy.run({"connect_to": [{"host": "127.0.0.1", "port": target.port}], "expect_bypass": ["10.2.3.4", "db.public.example"]}, ctx)
        by = {r.id: r for r in res}
        assert by["proxy.reachable"].status == PASS
        assert by[f"proxy.connect.127.0.0.1.{target.port}"].status == PASS
        assert by["proxy.bypass.10.2.3.4"].status == PASS
        assert by["proxy.bypass.db.public.example"].status == WARN
        denied = proxy.run({"proxy_url": f"http://127.0.0.1:{other.port}", "connect_to": [{"host": "127.0.0.1", "port": target.port}]}, Context())
        d = [r for r in denied if r.id.startswith("proxy.connect")][0]
        assert d.status == FAIL and "403" in d.message and "allow-list" in d.remediation
    finally:
        p.close()
        other.close()
        target.close()


def test_proxy_unreachable_and_unconfigured():
    r = proxy.run({"proxy_url": f"http://127.0.0.1:{free_port()}"}, Context(timeout=1))[0]
    assert r.status == FAIL
    none = proxy.run({}, Context())[0]
    assert none.status == WARN


def test_egress_denied_passes_when_blocked_and_fails_when_reachable():
    up = Tcp(lambda s: None)
    try:
        assert egress.run({"host": "127.0.0.1", "port": free_port(), "timeout": 1}, Context())[0].status == PASS
        r = egress.run({"host": "127.0.0.1", "port": up.port}, Context())[0]
        assert r.status == FAIL and "must be blocked" in r.message
    finally:
        up.close()


def test_command_checks_are_allow_listed_and_do_not_use_a_shell():
    assert cmd.run({"name": "x", "command": ["rm", "-rf", "/"]}, Context())[0].status == FAIL
    assert cmd.run({"name": "x", "command": ["bash", "-c", "echo hi"]}, Context())[0].status == FAIL
    miss = cmd.run({"name": "x", "command": ["gcloud", "version"], "timeout": 2}, Context())[0]
    assert miss.status in (SKIP, PASS, FAIL)
    ok = cmd.run({"name": "ssl", "command": ["openssl", "version"], "expect_contains": "OpenSSL"}, Context())[0]
    assert ok.status in (PASS, SKIP)
