"""Acting on behalf of a support agent: the triage service never uses its own broad credential to read or change what the agent could not.

RFC 8693 token exchange gives the service a short-lived token whose subject is the agent and whose actor is the service. Reads (knowledge articles, customer data, repository content) are filtered by the *agent's* permissions."""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from typing import Any, Dict, List, Optional


class Denied(Exception):
    pass


def _b(d: Dict[str, Any]) -> str:
    return base64.urlsafe_b64encode(json.dumps(d, sort_keys=True).encode()).rstrip(b"=").decode()


class TokenService:
    """HMAC for the test; production uses the identity provider's token-exchange endpoint (`grant_type=urn:ietf:params:oauth:grant-type:token-exchange`) with RS256 tokens."""

    def __init__(self, key: bytes, clock=time.time):
        self.key, self.clock = key, clock

    def _sign(self, claims: Dict[str, Any]) -> str:
        p = _b(claims)
        return p + "." + hmac.new(self.key, p.encode(), hashlib.sha256).hexdigest()

    def verify(self, token: str) -> Dict[str, Any]:
        p, _, sig = token.partition(".")
        if not hmac.compare_digest(sig, hmac.new(self.key, p.encode(), hashlib.sha256).hexdigest()):
            raise Denied("token signature invalid")
        c = json.loads(base64.urlsafe_b64decode(p + "=" * (-len(p) % 4)))
        if c["exp"] < self.clock():
            raise Denied("token expired")
        return c

    def issue_agent(self, agent: str, groups: List[str], tenant: str, ttl: int = 3600) -> str:
        return self._sign({"sub": agent, "groups": groups, "tenant": tenant, "exp": self.clock() + ttl, "typ": "agent"})

    def exchange(self, subject_token: str, actor: str, scope: List[str], ttl: int = 120) -> str:
        s = self.verify(subject_token)
        if s.get("typ") != "agent":
            raise Denied("only an agent's token can be exchanged")
        return self._sign({"sub": s["sub"], "groups": s["groups"], "tenant": s["tenant"], "act": {"sub": actor}, "scope": scope, "exp": min(self.clock() + ttl, s["exp"]), "typ": "obo"})


def allowed(article: Dict[str, Any], principal: Dict[str, Any]) -> bool:
    if article.get("tenant") not in (None, principal["tenant"]):
        return False
    vis = article.get("visibility", "internal")
    if vis == "public":
        return True
    if vis == "internal":
        return "support-agent" in principal["groups"] or "support-lead" in principal["groups"]
    if vis == "restricted":
        return bool(set(article.get("allowed_groups", [])) & set(principal["groups"]))
    return False


def retrieve_as(token_service: TokenService, obo_token: str, candidates: List[Dict[str, Any]], needed_scope: str = "kb:read") -> List[Dict[str, Any]]:
    """Filter retrieval results by the agent's permissions *before* anything reaches the model's context."""
    p = token_service.verify(obo_token)
    if p.get("typ") != "obo" or needed_scope not in p.get("scope", []):
        raise Denied(f"token does not carry scope {needed_scope}")
    return [a for a in candidates if allowed(a, p)]


def act_as(token_service: TokenService, obo_token: str, action: str, ticket: Dict[str, Any], policy: Dict[str, List[str]]) -> Dict[str, Any]:
    """Authorise a write against the agent's own rights (queues they may edit, actions their role may take). The audit record names both the agent and the acting service."""
    p = token_service.verify(obo_token)
    if p.get("typ") != "obo" or f"ticket:{action}" not in p.get("scope", []):
        raise Denied(f"token does not carry scope ticket:{action}")
    if ticket.get("tenant") != p["tenant"]:
        raise Denied("ticket belongs to another tenant")
    if not set(policy.get(action, [])) & set(p["groups"]):
        raise Denied(f"agent {p['sub']} may not {action}")
    if ticket.get("group") and ticket["group"] not in p["groups"] and "support-lead" not in p["groups"]:
        raise Denied("ticket is in a queue this agent does not work")
    return {"authorised": True, "on_behalf_of": p["sub"], "acting_service": p["act"]["sub"], "action": action, "ticket": ticket["id"]}
