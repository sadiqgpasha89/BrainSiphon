"""xAPI statements and Caliper events: validate, map to the canonical learner event, store idempotently, replay."""
from __future__ import annotations

import datetime as dt
import hashlib
import re
import uuid
from typing import Any, Dict, Iterable, List, Optional

_UUID = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$", re.I)
VERB_TO_KIND = {"http://adlnet.gov/expapi/verbs/answered": "answer", "http://adlnet.gov/expapi/verbs/completed": "completion", "http://adlnet.gov/expapi/verbs/attempted": "attempt", "http://adlnet.gov/expapi/verbs/experienced": "view",
                "http://adlnet.gov/expapi/verbs/passed": "answer", "http://adlnet.gov/expapi/verbs/failed": "answer"}


class XapiError(ValueError):
    pass


def validate_statement(s: Dict[str, Any]) -> None:
    for k in ("actor", "verb", "object"):
        if k not in s:
            raise XapiError(f"statement.{k} is required")
    a = s["actor"]
    ids = [k for k in ("mbox", "mbox_sha1sum", "openid", "account") if k in a]
    if len(ids) != 1:
        raise XapiError("actor needs exactly one inverse functional identifier (mbox, mbox_sha1sum, openid or account)")
    if "account" in a and not {"homePage", "name"} <= set(a["account"]):
        raise XapiError("actor.account needs homePage and name")
    if not str(s["verb"].get("id", "")).startswith("http"):
        raise XapiError("verb.id must be an IRI")
    if "id" in s and not _UUID.match(s["id"]):
        raise XapiError("statement id must be a UUID")
    if "timestamp" in s:
        try:
            dt.datetime.fromisoformat(s["timestamp"].replace("Z", "+00:00"))
        except ValueError:
            raise XapiError("timestamp must be ISO 8601")
    res = s.get("result", {})
    if "score" in res and "scaled" in res["score"] and not -1 <= res["score"]["scaled"] <= 1:
        raise XapiError("result.score.scaled must be between -1 and 1")


def to_learner_event(s: Dict[str, Any], institution: str) -> Dict[str, Any]:
    """xAPI -> the internal event the knowledge-tracing service consumes. The learner id is whatever the actor account says: it is reconciled to the canonical id in identity.py."""
    validate_statement(s)
    a = s["actor"]
    lid = f"{a['account']['homePage']}|{a['account']['name']}" if "account" in a else a.get("mbox") or a.get("openid") or a.get("mbox_sha1sum")
    res = s.get("result", {})
    ext = s["object"].get("definition", {}).get("extensions", {})
    sid = s.get("id") or str(uuid.uuid5(uuid.NAMESPACE_URL, f"{lid}|{s['verb']['id']}|{s['object']['id']}|{s.get('timestamp', '')}"))
    return {"event_id": sid, "institution": institution, "learner_ref": lid, "kind": VERB_TO_KIND.get(s["verb"]["id"], "other"), "item_id": s["object"]["id"], "skills": ext.get("https://brainsiphon.example/skills", []),
            "correct": res.get("success"), "score_scaled": (res.get("score") or {}).get("scaled"), "duration_s": _duration(res.get("duration")), "occurred_at": s.get("timestamp"), "device": (s.get("context", {}).get("extensions", {}) or {}).get("https://brainsiphon.example/device"),
            "seq": (s.get("context", {}).get("extensions", {}) or {}).get("https://brainsiphon.example/seq"), "source": "xapi"}


def _duration(iso: Optional[str]) -> Optional[float]:
    if not iso:
        return None
    m = re.fullmatch(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:([\d.]+)S)?", iso)
    return None if not m else int(m.group(1) or 0) * 3600 + int(m.group(2) or 0) * 60 + float(m.group(3) or 0)


def from_caliper(envelope: Dict[str, Any], institution: str) -> List[Dict[str, Any]]:
    """Caliper 1.2 envelope {"sensor","sendTime","data":[events]} -> learner events. AssessmentItemEvent and GradeEvent are the ones the tracer needs."""
    out = []
    for ev in envelope.get("data", []):
        t = ev.get("type", "")
        if t not in ("AssessmentItemEvent", "AssessmentEvent", "GradeEvent", "NavigationEvent"):
            continue
        gen = ev.get("generated") or {}
        out.append({"event_id": ev["id"].replace("urn:uuid:", ""), "institution": institution, "learner_ref": ev["actor"]["id"], "kind": "answer" if t == "AssessmentItemEvent" else "completion" if t == "AssessmentEvent" else "view",
                    "item_id": ev["object"]["id"], "skills": [], "correct": (gen.get("extensions") or {}).get("isCorrect"), "score_scaled": (gen.get("scoreGiven") / gen["maxScore"]) if gen.get("maxScore") else None, "duration_s": None,
                    "occurred_at": ev.get("eventTime"), "source": "caliper"})
    return out


class EventStore:
    """Idempotent by event id: replay a day of events twice and nothing changes. Out-of-order arrival is accepted (the tracer sorts by occurred_at, then seq)."""

    def __init__(self) -> None:
        self.events: Dict[str, Dict[str, Any]] = {}
        self.duplicates = 0

    def add(self, ev: Dict[str, Any]) -> bool:
        if ev["event_id"] in self.events:
            self.duplicates += 1
            return False
        self.events[ev["event_id"]] = ev
        return True

    def replay(self, learner: str) -> List[Dict[str, Any]]:
        return sorted((e for e in self.events.values() if e["learner_ref"] == learner), key=lambda e: (e["occurred_at"] or "", e.get("seq") or 0))
