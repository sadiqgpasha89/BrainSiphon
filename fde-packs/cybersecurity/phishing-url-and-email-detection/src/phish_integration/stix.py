"""STIX 2.1 indicators and a TAXII 2.1 client: threat-intelligence feeds with provenance, expiry and de-duplication."""
from __future__ import annotations

import datetime as dt
import re
from typing import Any, Dict, Iterator, List, Optional

from fde_adapters.core.http import HttpClient, NoAuth

TAXII_MEDIA = "application/taxii+json;version=2.1"
_PAT = re.compile(r"\[(url|domain-name|email-addr|ipv4-addr|file:hashes\.'[A-Za-z0-9-]+')(?::value)?\s*=\s*'((?:[^'\\]|\\.)*)'\]")


def parse_pattern(pattern: str) -> List[Dict[str, str]]:
    """Single-observation patterns `[url:value = 'http://x']` (and OR-ed ones). Complex patterns (AND, FOLLOWEDBY, repeats) are returned as unsupported, never guessed at."""
    if re.search(r"\b(AND|FOLLOWEDBY|REPEATS|WITHIN|START)\b", pattern):
        return [{"type": "unsupported", "value": pattern}]
    out = []
    for m in _PAT.finditer(pattern):
        out.append({"type": m.group(1).split(":")[0], "value": m.group(2).replace("\\'", "'").replace("\\\\", "\\")})
    return out


def indicators(bundle: Dict[str, Any], *, source: str, now: Optional[dt.datetime] = None, min_confidence: int = 50) -> Dict[str, Any]:
    """Accepted observables with provenance, and everything rejected with the reason."""
    now = now or dt.datetime.now(dt.timezone.utc)
    accepted: Dict[str, Dict[str, Any]] = {}
    rejected: List[Dict[str, str]] = []
    for o in bundle.get("objects", []):
        if o.get("type") != "indicator":
            continue
        until = o.get("valid_until")
        if until and dt.datetime.fromisoformat(until.replace("Z", "+00:00")) < now:
            rejected.append({"id": o["id"], "why": "expired"})
            continue
        if o.get("revoked"):
            rejected.append({"id": o["id"], "why": "revoked"})
            continue
        if int(o.get("confidence", 0)) < min_confidence:
            rejected.append({"id": o["id"], "why": f"confidence {o.get('confidence', 0)} below {min_confidence}"})
            continue
        for obs in parse_pattern(o.get("pattern", "")):
            if obs["type"] == "unsupported":
                rejected.append({"id": o["id"], "why": "pattern too complex to apply safely"})
                continue
            key = f"{obs['type']}:{obs['value'].lower()}"
            prior = accepted.get(key)
            if not prior or int(o.get("confidence", 0)) > prior["confidence"]:
                accepted[key] = {"type": obs["type"], "value": obs["value"], "confidence": int(o.get("confidence", 0)), "source": source, "indicator_id": o["id"], "valid_from": o.get("valid_from"), "valid_until": until, "labels": o.get("labels", [])}
    return {"accepted": list(accepted.values()), "rejected": rejected}


class TaxiiClient:
    """TAXII 2.1: collection objects with `added_after` and `next` paging. Poll with the last `date_added` you saw so a restart does not re-import the feed."""

    def __init__(self, root_url: str, collection: str, token: str = "", client: Optional[HttpClient] = None):
        self.http = client or HttpClient(root_url, NoAuth(), headers={"Accept": TAXII_MEDIA, **({"Authorization": f"Bearer {token}"} if token else {})})
        self.collection = collection

    def poll(self, added_after: Optional[str] = None, limit: int = 100) -> Iterator[Dict[str, Any]]:
        params: Dict[str, Any] = {"limit": limit}
        if added_after:
            params["added_after"] = added_after
        while True:
            env = self.http.get(f"/collections/{self.collection}/objects/", params=params).json()
            yield env
            if not env.get("more") or not env.get("next"):
                return
            params = {"limit": limit, "next": env["next"], **({"added_after": added_after} if added_after else {})}
