"""Enterprise identity providers (Okta, Microsoft Entra ID, Ping, Keycloak, Auth0): OIDC discovery, JWKS with key rotation, RS256 token
validation with claim checks, workforce versus machine principals, group-to-role mapping, and a SCIM 2.0 client.

Token validation is implemented with the standard library (RSA verify is modular exponentiation plus a PKCS#1 v1.5 comparison)."""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

from ..core.adapter import Adapter, Health
from ..core.errors import AuthError, ConfigError, PermissionDenied
from ..core.registry import register

_SHA256_DIGESTINFO = bytes.fromhex("3031300d060960864801650304020105000420")


def _b64d(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def rs256_verify(signing_input: bytes, signature: bytes, n: int, e: int) -> bool:
    k = (n.bit_length() + 7) // 8
    if len(signature) != k:
        return False
    em = pow(int.from_bytes(signature, "big"), e, n).to_bytes(k, "big")
    t = _SHA256_DIGESTINFO + hashlib.sha256(signing_input).digest()
    return hmac.compare_digest(em, b"\x00\x01" + b"\xff" * (k - len(t) - 3) + b"\x00" + t)


@dataclass
class Principal:
    subject: str
    kind: str  # "workforce" (a person, interactive) or "machine" (a service, a switch, a device, a partner)
    issuer: str
    scopes: List[str] = field(default_factory=list)
    roles: List[str] = field(default_factory=list)
    tenant: Optional[str] = None
    claims: Dict[str, Any] = field(default_factory=dict)


@register
class OidcIdentityAdapter(Adapter):
    ID = "idp-oidc"
    TITLE = "Enterprise identity provider (OIDC / OAuth2, SCIM 2.0)"
    PROTOCOL = "OIDC discovery and JWKS, RS256 JWT validation, optional SCIM 2.0 provisioning"
    CAPABILITIES = ("health", "read", "write", "validate-token")
    MOCK_NOTE = "Run against a local OIDC mock (tests build one with a generated RSA key). Covers signature, issuer, audience, expiry and key rotation; not MFA, conditional access or the provider's token-lifetime policy."
    CONNECTION = {"issuer": {"required": True}, "audience": {"required": True}, "jwks_cache_seconds": {"default": 300}, "leeway_seconds": {"default": 60}, "machine_client_ids": {"description": "client ids (azp/appid) that are services, not people"}, "tenant_claim": {}, "role_mapping": {"description": "IdP group or role -> application role"}, "groups_claim": {"default": "groups"}, "scim_base_url": {}, "auth": {}, "headers": {}, "proxy": {}, "ca_file": {}, "verify_tls": {}}
    READ = {"resource": {"default": "Users"}, "page_size": {"default": 100}, "key_field": {"default": "id"}, "event_time_field": {}}
    WRITE = {"resource": {"default": "Users"}, "idempotency_fields": {}}

    def _init(self) -> None:
        self.issuer = self.conn["issuer"].rstrip("/")
        self.http = self.build_http(self.issuer)
        self.scim = self.build_http(self.conn["scim_base_url"]) if self.conn.get("scim_base_url") else None
        self._jwks: Dict[str, Dict[str, Any]] = {}
        self._jwks_at = 0.0
        self._disc: Optional[Dict[str, Any]] = None

    # -- discovery and keys ------------------------------------------------------------------------------------------------------
    def discovery(self) -> Dict[str, Any]:
        if self._disc is None:
            d = self.http.get(self.issuer + "/.well-known/openid-configuration").json()
            if d.get("issuer", "").rstrip("/") != self.issuer:
                raise ConfigError(f"issuer mismatch: configured {self.issuer}, provider says {d.get('issuer')}. Tokens carry the provider's string; configure that.")
            self._disc = d
        return self._disc

    def _keys(self, force: bool = False) -> Dict[str, Dict[str, Any]]:
        if force or not self._jwks or time.time() - self._jwks_at > float(self.conn.get("jwks_cache_seconds", 300)):
            doc = self.http.get(self.discovery()["jwks_uri"]).json()
            self._jwks = {k["kid"]: k for k in doc["keys"] if k.get("kty") == "RSA"}
            self._jwks_at = time.time()
        return self._jwks

    def _health(self) -> Health:
        d = self.discovery()
        return Health(True, {"keys": sorted(self._keys()), "grant_types": d.get("grant_types_supported")})

    # -- token validation --------------------------------------------------------------------------------------------------------
    def validate_token(self, token: str, *, required_scopes: Tuple[str, ...] = (), now: Optional[float] = None) -> Principal:
        try:
            h64, p64, s64 = token.split(".")
            header, claims = json.loads(_b64d(h64)), json.loads(_b64d(p64))
        except (ValueError, IndexError):
            raise AuthError("not a JWT")
        if header.get("alg") != "RS256":
            raise AuthError(f"algorithm {header.get('alg')!r} is not accepted (RS256 only; 'none' and HS256 are refused)")
        keys = self._keys()
        key = keys.get(header.get("kid", ""))
        if key is None:  # key rotation: the provider may have published a new key since the cache was filled
            key = self._keys(force=True).get(header.get("kid", ""))
        if key is None:
            raise AuthError(f"no signing key with kid {header.get('kid')!r}")
        n, e = int.from_bytes(_b64d(key["n"]), "big"), int.from_bytes(_b64d(key["e"]), "big")
        if not rs256_verify(f"{h64}.{p64}".encode(), _b64d(s64), n, e):
            raise AuthError("signature does not verify")
        t, leeway = now if now is not None else time.time(), float(self.conn.get("leeway_seconds", 60))
        if claims.get("iss", "").rstrip("/") != self.issuer:
            raise AuthError(f"issuer {claims.get('iss')!r} is not {self.issuer!r}")
        aud = claims.get("aud")
        if self.conn["audience"] not in (aud if isinstance(aud, list) else [aud]):
            raise AuthError(f"audience {aud!r} does not include {self.conn['audience']!r}")
        if "exp" not in claims or claims["exp"] + leeway < t:
            raise AuthError("token expired")
        if claims.get("nbf", 0) - leeway > t:
            raise AuthError("token not yet valid")
        scopes = (claims.get("scope") or "").split() or list(claims.get("scp", []) if isinstance(claims.get("scp"), list) else str(claims.get("scp", "")).split())
        missing = [s for s in required_scopes if s not in scopes]
        if missing:
            raise PermissionDenied(f"token lacks scope(s): {', '.join(missing)}")
        azp = claims.get("azp") or claims.get("appid") or claims.get("client_id")
        machine = (azp in (self.conn.get("machine_client_ids") or [])) or claims.get("gty") == "client-credentials" or claims.get("idtyp") == "app" or (claims.get("sub") == azp and azp is not None)
        groups = claims.get(self.conn.get("groups_claim", "groups"), []) or []
        mapping = self.conn.get("role_mapping") or {}
        roles = sorted({mapping[g] for g in groups if g in mapping})
        return Principal(claims.get("sub", ""), "machine" if machine else "workforce", self.issuer, scopes, roles, claims.get(self.conn.get("tenant_claim", "")) if self.conn.get("tenant_claim") else None, claims)

    # -- SCIM ---------------------------------------------------------------------------------------------------------------------
    def _read_page(self, query: Dict[str, Any], cursor: Optional[int]) -> Tuple[List[Dict[str, Any]], Optional[int]]:
        if not self.scim:
            raise ConfigError("connection.scim_base_url is required to read users or groups")
        r = self.cfg.get("read", {})
        start, count = cursor or 1, int(r.get("page_size", 100))
        d = self.scim.get(f"/{r.get('resource', 'Users')}", params={"startIndex": start, "count": count}).json()
        rows = d.get("Resources", [])
        return rows, (start + count if start + count <= int(d.get("totalResults", 0)) else None)

    def _write_one(self, payload: Dict[str, Any], idem_key: str) -> Dict[str, Any]:
        if not self.scim:
            raise ConfigError("connection.scim_base_url is required to provision")
        res = self.cfg.get("write", {}).get("resource", "Users")
        found = self.scim.get(f"/{res}", params={"filter": f'externalId eq "{idem_key}"'}).json()
        if found.get("totalResults", 0) > 0:
            rid = found["Resources"][0]["id"]
            self.scim.patch(f"/{res}/{rid}", json_body={"schemas": ["urn:ietf:params:scim:api:messages:2.0:PatchOp"], "Operations": [{"op": "replace", "value": payload}]})
            return {"created": False, "id": rid}
        r = self.scim.post(f"/{res}", json_body={**payload, "externalId": idem_key, "schemas": payload.get("schemas", ["urn:ietf:params:scim:schemas:core:2.0:User"])})
        return {"created": True, "id": (r.json() or {}).get("id")}
