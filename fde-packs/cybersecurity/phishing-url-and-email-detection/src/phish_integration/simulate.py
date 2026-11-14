"""An executable security-incident simulation that validates the whole process: email in, inline verdict, SIEM event, SOAR playbook with an approval gate, action, analyst feedback, rollback.

Everything is local and uses the safe fixtures: `.invalid` domains, defanged URLs, no real payloads. Run it against the customer's *test* gateway and SIEM first (a test tenant), then against a pilot mailbox group."""
from __future__ import annotations

import datetime as dt
from typing import Any, Callable, Dict, List

from .events import canonical, to_ocsf_email_activity
from .feedback import PolicyLists
from .gateway import InspectionService
from .response import Controller


def refang(u: str) -> str:
    return u.replace("hxxp", "http").replace("[.]", ".")


def toy_score(msg: Dict[str, Any]) -> Dict[str, Any]:
    """Stand-in for the model service: transparent rules over the fixtures. The real scorer sits behind the same signature."""
    s, why = 0.05, []
    body = (msg.get("subject", "") + " " + msg.get("body", "")).lower()
    for w, p in (("verify your account", 0.35), ("password expires", 0.3), ("wire transfer", 0.25), ("gift card", 0.3), ("urgent", 0.1)):
        if w in body:
            s += p
            why.append(f"phrase: {w}")
    for u in msg.get("urls", []):
        host = refang(u).split("/")[2] if "//" in refang(u) else ""
        if host.endswith(".invalid") and ("login" in host or "secure" in host):
            s += 0.4
            why.append(f"lookalike host {host}")
    if msg.get("reply_to_domain") and msg["reply_to_domain"] != msg.get("sender", "@").split("@")[-1]:
        s += 0.25
        why.append("reply-to differs from sender")
    return {"score": round(min(s, 0.99), 2), "reasons": why, "model_version": "toy-v0"}


def run(messages: List[Dict[str, Any]], *, now: dt.datetime, approver: str = "soc.lead", enable_actions: bool = True) -> Dict[str, Any]:
    lists = PolicyLists()
    svc = InspectionService(toy_score, deadline_ms=100, allow_list={"partner.example"})
    ctl = Controller(executors={"quarantine_message": lambda t, p: {"quarantined": t}, "release_message": lambda t, p: {"released": t}})
    if enable_actions:
        ctl.enable_actions("soc.manager", "CHG-1001")
        ctl.grant("quarantine_message", "tenant:acme", [approver], "INC-77", now + dt.timedelta(hours=8), max_uses=50)
    siem: List[Dict[str, Any]] = []
    soar_cases: List[Dict[str, Any]] = []
    performed: List[str] = []
    refused: List[Dict[str, str]] = []
    for m in messages:
        v = svc.inspect(m)
        ev = canonical("brainsiphon", m["tenant"], m["id"], "message-verdict", now.strftime("%Y-%m-%dT%H:%M:%SZ"), now.strftime("%Y-%m-%dT%H:%M:%SZ"), sender=m["sender"], recipients=m["recipients"], subject=m["subject"], urls=m.get("urls", []))
        siem.append(to_ocsf_email_activity(ev, {"verdict": v["verdict"], "score": v["score"], "reasons": v["reasons"], "model_version": v.get("model_version", "")}))
        if v["disposition"] == "quarantine":
            soar_cases.append({"message": m["id"], "playbook": "phish-quarantine", "needs": "approval", "score": v["score"]})
            try:
                r = ctl.perform("quarantine_message", m["id"], f"tenant:{m['tenant']}/mailbox:{m['recipients'][0]}", now=now)
                performed.append(r["id"])
            except Exception as e:  # noqa: BLE001
                refused.append({"message": m["id"], "why": str(e)[:80]})
    return {"verdicts": len(messages), "siem_events": siem, "soar_cases": soar_cases, "performed": performed, "refused": refused, "journal": ctl.journal, "controller": ctl, "lists": lists, "service": svc}
