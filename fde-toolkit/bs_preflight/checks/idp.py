"""Identity-provider checks: OIDC discovery, JWKS, token endpoint, clock skew, and SAML metadata."""
from __future__ import annotations

import datetime as dt
import email.utils
import json
import time
import urllib.error
import xml.etree.ElementTree as ET
from typing import Any, Dict, List

from ..model import CheckResult, Context, FAIL, PASS, WARN
from ..netutil import classify_error
from .http import request


def run(item: Dict[str, Any], ctx: Context) -> List[CheckResult]:
    name = item["name"]
    base = dict(id=f"idp.{name}", name=f"Identity provider: {name}", category="identity", owner_hint=item.get("owner", "Customer identity / IAM team"))
    severity = item.get("severity", "blocking")
    if item.get("saml_metadata_url"):
        return _saml(item, ctx, base, severity)
    issuer = item["issuer"].rstrip("/")
    url = item.get("discovery_url") or issuer + "/.well-known/openid-configuration"
    base["target"] = url
    out: List[CheckResult] = []
    try:
        status, headers, body, _ = request(url, ctx, item)
    except Exception as e:  # noqa: BLE001
        code, hint = classify_error(getattr(e, "reason", e) if isinstance(e, urllib.error.URLError) else e)
        return [CheckResult(**base, status=FAIL, severity=severity, message=f"discovery document not reachable ({code})", details={"error": str(e)}, remediation=hint)]
    if status != 200:
        return [CheckResult(**base, status=FAIL, severity=severity, message=f"discovery returned HTTP {status}", remediation="Check the issuer URL exactly as the identity team publishes it (tenant id, realm, trailing path).")]
    try:
        doc = json.loads(body)
    except ValueError:
        return [CheckResult(**base, status=FAIL, severity=severity, message="discovery response was not JSON", remediation="A proxy or login page is answering instead of the identity provider.")]
    if doc.get("issuer", "").rstrip("/") != issuer:
        out.append(CheckResult(**base, status=FAIL, severity=severity, message=f"issuer mismatch: configured {issuer}, discovery says {doc.get('issuer')}", remediation="Tokens carry the issuer the provider reports. Configure that exact string, or validation will reject every token."))
    else:
        out.append(CheckResult(**base, status=PASS, severity=severity, message="discovery document valid, issuer matches", details={"token_endpoint": doc.get("token_endpoint"), "grant_types": doc.get("grant_types_supported"), "id_token_signing_alg_values_supported": doc.get("id_token_signing_alg_values_supported")}))
    need = item.get("require_grant_types", [])
    missing = [g for g in need if g not in (doc.get("grant_types_supported") or [])]
    if missing:
        out.append(CheckResult(**dict(base, id=base["id"] + ".grants", name=base["name"] + " grants"), status=FAIL, severity=severity, message=f"provider does not advertise grant type(s): {', '.join(missing)}", remediation="Enable the grant on the application registration (client credentials for machine identity, authorization code for people)."))
    jwks_uri = doc.get("jwks_uri")
    jb = dict(base, id=base["id"] + ".jwks", name=base["name"] + " signing keys", target=jwks_uri or "")
    if not jwks_uri:
        out.append(CheckResult(**jb, status=FAIL, severity=severity, message="no jwks_uri in the discovery document"))
    else:
        try:
            st, _h, b2, _ = request(jwks_uri, ctx, item)
            keys = json.loads(b2).get("keys", []) if st == 200 else []
            algs = sorted({k.get("alg", k.get("kty")) for k in keys})
            out.append(CheckResult(**jb, status=PASS if keys else FAIL, severity=severity, message=f"{len(keys)} signing key(s): {', '.join(map(str, algs))}" if keys else f"JWKS returned HTTP {st} with no keys", details={"kids": [k.get("kid") for k in keys]}, remediation="" if keys else "The service cannot validate tokens without the keys: open egress to the JWKS URI or mirror it internally."))
        except Exception as e:  # noqa: BLE001
            code, hint = classify_error(getattr(e, "reason", e) if isinstance(e, urllib.error.URLError) else e)
            out.append(CheckResult(**jb, status=FAIL, severity=severity, message=f"JWKS not reachable ({code})", details={"error": str(e)}, remediation=hint))
    date_hdr = headers.get("Date") or headers.get("date")
    if date_hdr:
        skew = abs(email.utils.parsedate_to_datetime(date_hdr).timestamp() - time.time())
        sb = dict(base, id=base["id"] + ".clock", name=base["name"] + " clock skew")
        if skew > 120:
            out.append(CheckResult(**sb, status=FAIL, severity=severity, message=f"clock differs from the provider by {skew:.0f}s", remediation="Token validation fails beyond about 5 minutes of skew, and OTPs earlier. Fix NTP on this host and on the cluster nodes."))
        else:
            out.append(CheckResult(**sb, status=PASS, severity=severity, message=f"clock within {skew:.1f}s of the provider"))
    return out


def _saml(item: Dict[str, Any], ctx: Context, base: Dict[str, Any], severity: str) -> List[CheckResult]:
    url = item["saml_metadata_url"]
    base["target"] = url
    try:
        status, _h, body, _ = request(url, ctx, item)
        if status != 200:
            return [CheckResult(**base, status=FAIL, severity=severity, message=f"SAML metadata returned HTTP {status}")]
        root = ET.fromstring(body)
    except Exception as e:  # noqa: BLE001
        return [CheckResult(**base, status=FAIL, severity=severity, message=f"SAML metadata unreadable: {e}", remediation="Ask the identity team for the federation metadata URL or file.")]
    ns = {"md": "urn:oasis:names:tc:SAML:2.0:metadata"}
    entity = root.get("entityID", "")
    sso = [e.get("Location") for e in root.iter("{urn:oasis:names:tc:SAML:2.0:metadata}SingleSignOnService")]
    valid_until = root.get("validUntil")
    status, msg = PASS, f"entity {entity}, {len(sso)} sign-on endpoint(s)"
    if valid_until:
        try:
            until = dt.datetime.fromisoformat(valid_until.replace("Z", "+00:00"))
            if until < dt.datetime.now(dt.timezone.utc):
                status, msg = FAIL, f"metadata expired on {valid_until}"
        except ValueError:
            pass
    return [CheckResult(**base, status=status, severity=severity, message=msg, details={"entity_id": entity, "sso": sso})]
