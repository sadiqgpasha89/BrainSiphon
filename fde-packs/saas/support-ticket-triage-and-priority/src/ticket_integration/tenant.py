"""Strict tenant isolation across retrieval indexes, caches, model telemetry, logs and storage. The rule is structural: a tenant id is required to *touch* any store, and its absence fails closed."""
from __future__ import annotations

import hashlib
import re
from typing import Any, Dict, List, Optional


class TenantRequired(Exception):
    pass


def _need(tenant: Optional[str]) -> str:
    if not tenant or not re.fullmatch(r"[A-Za-z0-9_-]{1,64}", tenant):
        raise TenantRequired("a valid tenant id is required: refusing to run an unscoped operation")
    return tenant


class TenantIndex:
    """Retrieval index partitioned by tenant. The tenant filter is applied by the store, not by the caller's query, so a prompt or a query string cannot widen it."""

    def __init__(self) -> None:
        self.parts: Dict[str, List[Dict[str, Any]]] = {}

    def add(self, tenant: str, doc: Dict[str, Any]) -> None:
        self.parts.setdefault(_need(tenant), []).append({**doc, "tenant": tenant, "key_id": f"kms/tenant/{tenant}"})  # per-tenant encryption key id is stored with the document

    def search(self, tenant: Optional[str], query: str, k: int = 3) -> List[Dict[str, Any]]:
        t = _need(tenant)
        terms = set(re.findall(r"\w+", query.lower()))
        scored = sorted(self.parts.get(t, []), key=lambda d: -len(terms & set(re.findall(r"\w+", d["text"].lower()))))
        return [d for d in scored if terms & set(re.findall(r"\w+", d["text"].lower()))][:k]


class TenantCache:
    def __init__(self) -> None:
        self.d: Dict[str, Any] = {}

    def key(self, tenant: Optional[str], *parts: str) -> str:
        return f"t:{_need(tenant)}:" + hashlib.sha256("|".join(parts).encode()).hexdigest()

    def get(self, tenant: Optional[str], *parts: str) -> Any:
        return self.d.get(self.key(tenant, *parts))

    def put(self, tenant: Optional[str], value: Any, *parts: str) -> None:
        self.d[self.key(tenant, *parts)] = value


def telemetry_event(tenant: str, event: str, **fields: Any) -> Dict[str, Any]:
    """Model telemetry carries a salted hash of the tenant, never the name, and never ticket text. Aggregates per tenant are computed inside the tenant's boundary."""
    banned = {"text", "subject", "description", "body", "email", "name"}
    clean = {k: v for k, v in fields.items() if k not in banned}
    return {"event": event, "tenant_hash": hashlib.sha256(("telemetry-salt|" + _need(tenant)).encode()).hexdigest()[:16], **clean}


def scrub_log(line: str, tenant_names: List[str]) -> str:
    out = re.sub(r"[\w.+-]+@[\w-]+\.[\w.]+", "<email>", line)
    for n in tenant_names:
        out = re.sub(re.escape(n), "<tenant>", out, flags=re.I)
    return out
