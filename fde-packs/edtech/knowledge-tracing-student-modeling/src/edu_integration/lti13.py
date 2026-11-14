"""LTI 1.3 launch validation and deep linking (IMS Global). The launch is an OIDC third-party-initiated login ending in a signed id_token (RS256)."""
from __future__ import annotations

import json
import time
from typing import Any, Dict, List, Optional

from fde_adapters.connectors.idp import _b64d, rs256_verify
from fde_adapters.core.http import b64url, rs256_sign

CLAIM = "https://purl.imsglobal.org/spec/lti/claim/"
DL = "https://purl.imsglobal.org/spec/lti-dl/claim/"


class LtiError(Exception):
    pass


class LaunchValidator:
    """Validates the id_token the LMS posts. Nonces and states are single-use: a replayed launch is refused."""

    def __init__(self, platforms: Dict[str, Dict[str, Any]], clock=time.time):
        self.platforms, self.clock = platforms, clock  # issuer -> {"client_id", "deployment_ids", "keys": {kid: {"n","e"}}}
        self.used_nonces: set = set()

    def validate(self, id_token: str, *, expected_nonce: str, leeway: int = 60) -> Dict[str, Any]:
        try:
            h64, p64, s64 = id_token.split(".")
            header, claims = json.loads(_b64d(h64)), json.loads(_b64d(p64))
        except (ValueError, IndexError):
            raise LtiError("id_token is not a JWT")
        if header.get("alg") != "RS256":
            raise LtiError(f"alg {header.get('alg')!r} refused (RS256 only)")
        plat = self.platforms.get(claims.get("iss", ""))
        if not plat:
            raise LtiError(f"unregistered platform issuer {claims.get('iss')!r}")
        key = plat["keys"].get(header.get("kid", ""))
        if not key or not rs256_verify(f"{h64}.{p64}".encode(), _b64d(s64), int.from_bytes(_b64d(key["n"]), "big"), int.from_bytes(_b64d(key["e"]), "big")):
            raise LtiError("signature does not verify against the platform's registered key")
        aud = claims.get("aud")
        if plat["client_id"] not in (aud if isinstance(aud, list) else [aud]):
            raise LtiError("audience is not this tool's client id")
        if claims.get("exp", 0) + leeway < self.clock():
            raise LtiError("launch token expired")
        if claims.get("nonce") != expected_nonce:
            raise LtiError("nonce does not match the login request")
        if claims["nonce"] in self.used_nonces:
            raise LtiError("nonce already used (replayed launch)")
        self.used_nonces.add(claims["nonce"])
        if claims.get(CLAIM + "version") != "1.3.0":
            raise LtiError("lti version claim must be 1.3.0")
        if claims.get(CLAIM + "deployment_id") not in plat["deployment_ids"]:
            raise LtiError("unknown deployment_id")
        mtype = claims.get(CLAIM + "message_type")
        if mtype not in ("LtiResourceLinkRequest", "LtiDeepLinkingRequest"):
            raise LtiError(f"unsupported message_type {mtype!r}")
        if mtype == "LtiResourceLinkRequest" and not claims.get(CLAIM + "resource_link"):
            raise LtiError("resource_link claim is required for a resource link launch")
        roles = claims.get(CLAIM + "roles", [])
        return {"issuer": claims["iss"], "subject": claims["sub"], "message_type": mtype, "deployment_id": claims[CLAIM + "deployment_id"], "context": (claims.get(CLAIM + "context") or {}).get("id"),
                "resource_link": (claims.get(CLAIM + "resource_link") or {}).get("id"), "roles": roles, "is_instructor": any("Instructor" in r or "TeachingAssistant" in r for r in roles), "is_learner": any(r.endswith("#Learner") or r.endswith("/Learner") for r in roles),
                "name": claims.get("name", ""), "deep_link": claims.get(DL + "settings")}


def deep_link_response(tool_client_id: str, platform_issuer: str, deployment_id: str, items: List[Dict[str, Any]], data: str, private_key_pem_path: str, kid: str, now: Optional[int] = None) -> str:
    """LtiDeepLinkingResponse: a JWT signed with the tool's key, carrying the content items the teacher chose."""
    now = now or int(time.time())
    claims = {"iss": tool_client_id, "aud": platform_issuer, "iat": now, "exp": now + 300, "nonce": f"dl-{now}", CLAIM + "message_type": "LtiDeepLinkingResponse", CLAIM + "version": "1.3.0", CLAIM + "deployment_id": deployment_id,
              DL + "content_items": items, DL + "data": data}
    h = b64url(json.dumps({"alg": "RS256", "typ": "JWT", "kid": kid}).encode())
    p = b64url(json.dumps(claims).encode())
    return f"{h}.{p}.{b64url(rs256_sign(f'{h}.{p}'.encode(), private_key_pem_path))}"
