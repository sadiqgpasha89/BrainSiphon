"""Security event normalisation: CEF/syslog, OCSF, and the vendor payloads of email-security products, into one canonical event with provenance.

Every event keeps where it came from (`source`, `source_event_id`), when it happened (`event_time`, UTC) versus when we got it (`ingest_time`), and which tenant it belongs to,
because a SIEM that cannot say whose event it is cannot be trusted to act on it."""
from __future__ import annotations

import datetime as dt
import hashlib
import re
from typing import Any, Dict, List, Optional


class EventError(ValueError):
    pass


_CEF_HEAD = re.compile(r"^(?:<\d+>)?(?:[A-Z][a-z]{2}\s+\d+\s+[\d:]+\s+\S+\s+)?CEF:(\d+)\|((?:[^|\\]|\\.)*)\|((?:[^|\\]|\\.)*)\|((?:[^|\\]|\\.)*)\|((?:[^|\\]|\\.)*)\|((?:[^|\\]|\\.)*)\|((?:[^|\\]|\\.)*)\|(.*)$")


def _unesc_header(s: str) -> str:
    return s.replace("\\|", "|").replace("\\\\", "\\")


def parse_cef(line: str) -> Dict[str, Any]:
    m = _CEF_HEAD.match(line.strip())
    if not m:
        raise EventError("not a CEF message")
    ver, vendor, product, pver, sig, name, sev, ext = m.groups()
    # extension: key=value pairs where a value runs to the next " key=" (values may contain spaces; = and \ are escaped)
    fields: Dict[str, str] = {}
    parts = re.split(r"\s(?=[A-Za-z][A-Za-z0-9_]*=)", " " + ext)
    for p in parts:
        p = p.strip()
        if "=" in p:
            k, v = p.split("=", 1)
            fields[k] = v.replace("\\=", "=").replace("\\\\", "\\").replace("\\n", "\n")
    return {"cef_version": int(ver), "vendor": _unesc_header(vendor), "product": _unesc_header(product), "product_version": _unesc_header(pver), "signature_id": _unesc_header(sig), "name": _unesc_header(name), "severity": sev, "ext": fields}


def build_cef(vendor: str, product: str, version: str, sig: str, name: str, severity: int, ext: Dict[str, str]) -> str:
    esc = lambda s: str(s).replace("\\", "\\\\").replace("|", "\\|")  # noqa: E731
    e = " ".join(f"{k}={str(v).replace(chr(92), chr(92) * 2).replace('=', chr(92) + '=')}" for k, v in ext.items())
    return f"CEF:0|{esc(vendor)}|{esc(product)}|{esc(version)}|{esc(sig)}|{esc(name)}|{severity}|{e}"


def utc(ts: Any) -> Optional[str]:
    if ts is None or ts == "":
        return None
    if isinstance(ts, (int, float)):
        return dt.datetime.fromtimestamp(ts / 1000 if ts > 1e11 else ts, dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    s = str(ts).replace("Z", "+00:00")
    d = dt.datetime.fromisoformat(s)
    return (d if d.tzinfo else d.replace(tzinfo=dt.timezone.utc)).astimezone(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def canonical(source: str, tenant: str, event_id: str, kind: str, event_time: Optional[str], ingest_time: str, **body: Any) -> Dict[str, Any]:
    if not tenant:
        raise EventError("an event without a tenant identifier is refused")
    return {"schema": "bs.email-security.v1", "source": source, "source_event_id": event_id, "tenant": tenant, "kind": kind, "event_time": event_time, "ingest_time": ingest_time,
            "dedupe_key": hashlib.sha256(f"{source}|{tenant}|{event_id}".encode()).hexdigest()[:32], **body}


def from_proofpoint_tap(m: Dict[str, Any], tenant: str, ingest_time: str) -> Dict[str, Any]:
    """Proofpoint TAP SIEM API `messagesDelivered`/`messagesBlocked` item."""
    threats = m.get("threatsInfoMap") or []
    return canonical("proofpoint-tap", tenant, m.get("GUID") or m["messageID"], "message-" + ("blocked" if m.get("_disposition") == "blocked" else "delivered"), utc(m.get("messageTime")), ingest_time,
                     sender=m.get("fromAddress", ""), sender_ip=m.get("senderIP", ""), recipients=m.get("recipient", []), subject=m.get("subject", ""), phish_score=m.get("phishScore"), spam_score=m.get("spamScore"),
                     urls=[t["threat"] for t in threats if t.get("threatType") == "url"], threat_ids=[t.get("threatID") for t in threats], classification=sorted({t.get("classification", "") for t in threats} - {""}))


def from_defender_email_events(r: Dict[str, Any], tenant: str, ingest_time: str) -> Dict[str, Any]:
    """Microsoft Defender for Office 365 `EmailEvents` row (Advanced Hunting / Sentinel)."""
    return canonical("m365-defender", tenant, r["NetworkMessageId"], "message-" + str(r.get("DeliveryAction", "unknown")).lower(), utc(r.get("Timestamp")), ingest_time,
                     sender=r.get("SenderFromAddress", ""), sender_ip=r.get("SenderIPv4", ""), recipients=[r["RecipientEmailAddress"]] if r.get("RecipientEmailAddress") else [], subject=r.get("Subject", ""),
                     phish_score=None, threat_types=[t for t in str(r.get("ThreatTypes", "")).split(",") if t], detection_methods=[t for t in str(r.get("DetectionMethods", "")).split(",") if t], urls=[])


def to_ocsf_email_activity(e: Dict[str, Any], verdict: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """OCSF 1.x Email Activity (class_uid 4009) enriched with our verdict as a finding. Field names follow the OCSF schema; verify against the version the SIEM ingests."""
    out = {"class_uid": 4009, "class_name": "Email Activity", "category_uid": 4, "activity_id": 1, "time": e["event_time"], "metadata": {"product": {"name": e["source"]}, "uid": e["source_event_id"], "tenant_uid": e["tenant"], "version": "1.1.0"},
           "email": {"from": e.get("sender", ""), "to": e.get("recipients", []), "subject": e.get("subject", ""), "urls": e.get("urls", [])}, "src_endpoint": {"ip": e.get("sender_ip", "")}}
    if verdict:
        out["enrichments"] = [{"name": "brainsiphon.phish", "value": f"{verdict['verdict']}", "data": {"score": verdict["score"], "reasons": verdict["reasons"], "model_version": verdict["model_version"]}}]
    return out
