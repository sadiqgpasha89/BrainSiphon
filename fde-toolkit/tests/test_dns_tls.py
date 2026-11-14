import datetime as dt
import ssl
import tempfile

import pytest

from bs_preflight.checks import dns, tls
from bs_preflight.model import Context, FAIL, PASS, WARN
from servers import FakeDns, TlsServer, make_cert, openssl_available


def test_dns_wire_roundtrip_with_cname_chain():
    srv = FakeDns({"feat.corp.local": [("CNAME", "feat.privatelink.corp.local"), ("A", "10.20.0.7")]})
    try:
        r = dns.query("feat.corp.local", "127.0.0.1", "A", 2, srv.port)
        kinds = [(a["type"], a["value"]) for a in r["answers"]]
        assert ("CNAME", "feat.privatelink.corp.local") in kinds and ("A", "10.20.0.7") in kinds
        assert r["rcode"] == 0
        nx = dns.query("missing.corp.local", "127.0.0.1", "A", 2, srv.port)
        assert nx["rcode"] == 3
    finally:
        srv.close()


def test_dns_check_flags_public_address_for_private_endpoint():
    res = dns.run({"name": "lh", "host": "localhost", "expect_cidrs": ["10.0.0.0/8"]}, Context())
    assert res[0].status == FAIL and "outside the expected" in res[0].message
    ok = dns.run({"name": "lh", "host": "localhost", "expect_cidrs": ["127.0.0.0/8", "::1/128"]}, Context())
    assert ok[0].status == PASS


def test_dns_check_reports_unresolvable_name_with_reason():
    res = dns.run({"name": "x", "host": "no-such-host.invalid"}, Context())
    assert res[0].status == FAIL and "dns_failure" in res[0].message


def test_der_parser_reads_validity_and_names():
    if not openssl_available():
        pytest.skip("openssl missing")
    d = tempfile.mkdtemp()
    crt, key = make_cert(d, "svc.test", 40)
    der = ssl.PEM_cert_to_DER_cert(open(crt).read())
    info = tls.parse_der(der)
    assert "CN=svc.test" in info["subject"] and "BrainSiphon Test" in info["issuer"]
    left = (info["not_after"] - dt.datetime.now(dt.timezone.utc)).days
    assert 38 <= left <= 40


def test_tls_check_untrusted_chain_still_reports_expiry():
    if not openssl_available():
        pytest.skip("openssl missing")
    d = tempfile.mkdtemp()
    crt, key = make_cert(d, "localhost", 10)
    srv = TlsServer(crt, key)
    try:
        res = tls.run({"name": "gw", "host": "127.0.0.1", "port": srv.port, "min_days_valid": 21, "server_name": "localhost"}, Context())
        by = {r.id: r for r in res}
        assert by["tls.gw"].status == FAIL and "verify" in by["tls.gw"].message
        assert by["tls.gw.expiry"].status == WARN and by["tls.gw.expiry"].details["days_to_expiry"] in (9, 10)
    finally:
        srv.close()


def test_tls_check_passes_with_the_customer_ca_bundle():
    if not openssl_available():
        pytest.skip("openssl missing")
    d = tempfile.mkdtemp()
    crt, key = make_cert(d, "localhost", 365)
    srv = TlsServer(crt, key)
    try:
        res = tls.run({"name": "gw", "host": "127.0.0.1", "port": srv.port, "ca_file": crt, "server_name": "localhost", "min_version": "TLSv1.2"}, Context())
        assert all(r.status == PASS for r in res), [r.message for r in res]
        assert res[0].details["tls_version"] in ("TLSv1.2", "TLSv1.3")
    finally:
        srv.close()


def test_tls_check_detects_an_expired_certificate():
    if not openssl_available():
        pytest.skip("openssl missing")
    d = tempfile.mkdtemp()
    try:
        crt, key = make_cert(d, "localhost", -1)
    except RuntimeError:
        pytest.skip("this openssl cannot create an expired certificate")
    srv = TlsServer(crt, key)
    try:
        res = tls.run({"name": "old", "host": "127.0.0.1", "port": srv.port, "server_name": "localhost"}, Context())
        exp = [r for r in res if r.id.endswith("expiry")][0]
        assert exp.status == FAIL and "expired" in exp.message
    finally:
        srv.close()


def test_tls_mtls_requires_a_client_certificate():
    if not openssl_available():
        pytest.skip("openssl missing")
    d = tempfile.mkdtemp()
    crt, key = make_cert(d, "localhost", 365)
    ccrt, ckey = make_cert(d, "client", 365)
    srv = TlsServer(crt, key, client_ca=ccrt)
    try:
        without = tls.run({"name": "m", "host": "127.0.0.1", "port": srv.port, "ca_file": crt, "server_name": "localhost"}, Context())
        withc = tls.run({"name": "m", "host": "127.0.0.1", "port": srv.port, "ca_file": crt, "server_name": "localhost", "client_cert": ccrt, "client_key": ckey}, Context())
        assert withc[0].status == PASS, withc[0].message
        assert without[0].status == FAIL and "TLS handshake failed" in without[0].message
    finally:
        srv.close()
