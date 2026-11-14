import base64
import datetime as dt
import json
import time

import pytest

from bs_preflight.checks import http, idp, object_storage, service_account
from bs_preflight.checks.object_storage import sigv4_headers
from bs_preflight.model import Context, FAIL, PASS, SKIP, WARN
from servers import Http, json_resp, jwt


def gateway(valid_secret="good"):
    def token(h, body):
        auth = h.headers.get("Authorization", "")
        cid, _, sec = base64.b64decode(auth.split()[1]).decode().partition(":") if auth.startswith("Basic ") else ("", "", "")
        if sec != valid_secret:
            return json_resp({"error": "invalid_client", "error_description": "bad secret"}, 401)
        return json_resp({"access_token": jwt({"iss": "https://idp.test", "aud": "scoring", "exp": int(time.time()) + 3600, "scope": "score:write"}), "token_type": "Bearer", "expires_in": 3600})

    def guard(allowed):
        def f(h, body):
            tok = h.headers.get("Authorization", "")
            if not tok.startswith("Bearer "):
                return json_resp({"error": "unauthenticated"}, 401)
            return json_resp({"ok": True}) if allowed else json_resp({"error": "forbidden"}, 403)
        return f

    return Http({("POST", "/token"): token, ("GET", "/v1/score"): guard(True), ("GET", "/admin/users"): guard(False), ("GET", "/health"): lambda h, b: json_resp({"status": "up"})})


@pytest.fixture
def gw(monkeypatch):
    monkeypatch.setenv("CID", "svc-scoring")
    monkeypatch.setenv("CSEC", "good")
    g = gateway()
    yield g
    g.close()


def item(gw, **kw):
    d = {"name": "gw", "token_url": gw.base + "/token", "client_id_env": "CID", "client_secret_env": "CSEC", "scope": "score:write", "probe_url": gw.base + "/v1/score", "timeout": 3}
    d.update(kw)
    return d


def test_http_health_and_json_assertion(gw):
    ok = http.run_http({"name": "h", "url": gw.base + "/health", "expect_json": {"status": "up"}}, Context())
    assert ok[0].status == PASS
    bad = http.run_http({"name": "h", "url": gw.base + "/health", "expect_json": {"status": "down"}}, Context())
    assert bad[0].status == FAIL


def test_oauth_client_credentials_success_exposes_claims_not_the_token(gw):
    ctx = Context()
    r = http.run_api_auth(item(gw), ctx)[0]
    assert r.status == PASS, r.message
    assert r.details["claims"]["aud"] == "scoring" and "access_token" not in json.dumps(r.to_dict())
    assert ctx.tokens["gw"]
    assert ctx.tokens["gw"] not in json.dumps(r.to_dict())


def test_wrong_secret_is_an_authentication_failure_with_the_provider_reason(gw, monkeypatch):
    monkeypatch.setenv("CSEC", "wrong")
    r = http.run_api_auth(item(gw), Context())[0]
    assert r.status == FAIL and "invalid_client" in r.message


def test_403_is_distinguished_from_401(gw):
    r = http.run_api_auth(item(gw, probe_url=gw.base + "/admin/users"), Context())[0]
    assert r.status == FAIL and "403" in r.message and "not authorised" in r.message
    r2 = http.run_api_auth({"name": "k", "auth_type": "bearer", "token_env": "NOPE", "probe_url": gw.base + "/v1/score"}, Context())[0]
    assert r2.status == FAIL


def test_missing_credentials_environment_is_reported_not_crashed(monkeypatch, gw):
    monkeypatch.delenv("CSEC")
    r = http.run_api_auth(item(gw), Context())[0]
    assert r.status == FAIL and "not set" in r.message


def test_service_account_checks_least_privilege(gw):
    ctx = Context()
    http.run_api_auth(item(gw), ctx)
    out = service_account.run({"name": "scoring", "base_url": gw.base, "auth_ref": "gw", "expect_allow": ["/v1/score"], "expect_deny": ["/admin/users"], "timeout": 3}, ctx)
    assert [r.status for r in out] == [PASS, PASS]
    over = service_account.run({"name": "scoring", "base_url": gw.base, "auth_ref": "gw", "expect_deny": ["/v1/score"], "timeout": 3}, ctx)
    assert over[0].status == FAIL and "over-privileged" in over[0].message
    skipped = service_account.run({"name": "x", "base_url": gw.base, "auth_ref": "missing"}, Context())
    assert skipped[0].status == SKIP


def oidc_server(issuer_override=None, skew=0):
    holder = {}

    def disc(h, b):
        return json_resp({"issuer": issuer_override or holder["base"], "jwks_uri": holder["base"] + "/keys", "token_endpoint": holder["base"] + "/token", "grant_types_supported": ["authorization_code", "client_credentials"]}, 200, {"Date": time.strftime("%a, %d %b %Y %H:%M:%S GMT", time.gmtime(time.time() + skew))})

    srv = Http({("GET", "/.well-known/openid-configuration"): disc, ("GET", "/keys"): lambda h, b: json_resp({"keys": [{"kty": "RSA", "kid": "k1", "alg": "RS256"}]})})
    holder["base"] = srv.base
    return srv


def test_oidc_discovery_jwks_and_clock():
    s = oidc_server()
    try:
        res = idp.run({"name": "okta", "issuer": s.base, "require_grant_types": ["client_credentials"]}, Context())
        assert all(r.status == PASS for r in res), [(r.id, r.message) for r in res]
        assert {"idp.okta", "idp.okta.jwks", "idp.okta.clock"} <= {r.id for r in res}
    finally:
        s.close()


def test_oidc_issuer_mismatch_and_missing_grant_and_skew():
    s = oidc_server(issuer_override="https://other.example", skew=900)
    try:
        res = idp.run({"name": "okta", "issuer": s.base, "require_grant_types": ["device_code"]}, Context())
        by = {r.id: r for r in res}
        assert by["idp.okta"].status == FAIL and "issuer mismatch" in by["idp.okta"].message
        assert by["idp.okta.grants"].status == FAIL
        assert by["idp.okta.clock"].status == FAIL
    finally:
        s.close()


def test_saml_metadata_expiry():
    past = '<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" entityID="https://idp.corp" validUntil="2020-01-01T00:00:00Z"><IDPSSODescriptor><SingleSignOnService Location="https://idp.corp/sso" Binding="x"/></IDPSSODescriptor></EntityDescriptor>'
    s = Http({("GET", "/meta"): lambda h, b: (200, {"Content-Type": "application/xml"}, past.encode())})
    try:
        r = idp.run({"name": "saml", "saml_metadata_url": s.base + "/meta"}, Context())[0]
        assert r.status == FAIL and "expired" in r.message
    finally:
        s.close()


# ------------------------------------------------------------------ SigV4: AWS's published example values

def test_sigv4_matches_the_aws_documentation_vectors():
    now = dt.datetime(2013, 5, 24, 0, 0, 0, tzinfo=dt.timezone.utc)
    ak, sk = "AKIAIOSFODNN7EXAMPLE", "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
    h = sigv4_headers("GET", "https://examplebucket.s3.amazonaws.com/?lifecycle", "us-east-1", ak, sk, b"", now=now)
    assert h["Authorization"].endswith("Signature=fea454ca298b7da1c68078a5d1bdbfbbe0d65c699e0f91ac7a200a0136783543")
    h2 = sigv4_headers("GET", "https://examplebucket.s3.amazonaws.com/?max-keys=2&prefix=J", "us-east-1", ak, sk, b"", now=now)
    assert h2["Authorization"].endswith("Signature=34b48302e7b5fa45bde8084f4b7868a86f0a534bc59db6670ed5711ef69dc6f7")


def test_s3_compatible_check_against_a_mock_bucket(monkeypatch):
    store = {}

    def handler(h, body):
        if "AWS4-HMAC-SHA256" not in h.headers.get("Authorization", ""):
            return 403, {}, b"denied"
        path = h.path.split("?")[0]
        if h.command == "GET" and path == "/models/":
            return 200, {}, b"<ListBucketResult/>"
        if h.command == "PUT":
            store[path] = body
            return 200, {}, b""
        if h.command == "GET":
            return (200, {}, store[path]) if path in store else (404, {}, b"")
        if h.command == "DELETE":
            store.pop(path, None)
            return 204, {}, b""
        return 405, {}, b""

    s = Http({(m, "*"): handler for m in ("GET", "PUT", "DELETE")})
    monkeypatch.setenv("AK", "minio")
    monkeypatch.setenv("SK", "minio-secret")
    try:
        res = object_storage.run({"name": "models", "endpoint": s.base, "bucket": "models", "access_key_env": "AK", "secret_key_env": "SK", "write_probe": True, "timeout": 3}, Context())
        assert [r.status for r in res] == [PASS, PASS], [r.message for r in res]
        assert store == {}, "the canary object must be deleted"
        monkeypatch.delenv("SK")
        miss = object_storage.run({"name": "models", "endpoint": s.base, "bucket": "models", "access_key_env": "AK", "secret_key_env": "SK"}, Context())
        assert miss[0].status == FAIL and "credentials" in miss[0].message
    finally:
        s.close()
