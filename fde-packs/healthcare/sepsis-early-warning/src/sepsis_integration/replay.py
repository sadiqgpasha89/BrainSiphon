"""De-identified event replay: feed a recorded HL7 stream through the real MLLP listener and the adapter, on a virtual clock, then run
identity matching, feature state, a stand-in risk model and the alert lifecycle. Use it before any live connection, and again for each
ward and each change to thresholds, mappings or the crosswalk."""
from __future__ import annotations

import datetime as dt
import json
from typing import Any, Dict, Iterable, List

from fde_adapters.connectors.hl7_mllp import Hl7MllpAdapter
from fde_adapters.protocols import hl7v2

from .alert_lifecycle import AlertEngine
from .identity import Registry
from .news2 import news2


class StubRiskModel:
    """Not a model: a transparent score so the integration can be exercised. The real model is behind the same `score(state)` call."""

    def score(self, s: Dict[str, Any]) -> float:
        n = news2(s.get("rr"), s.get("spo2"), False, s.get("sbp"), s.get("hr"), True, s.get("temp"))
        x = 0.07 * float(n["score"]) + (0.3 if (s.get("lactate") or 0) >= 2.0 else 0.0) + (0.1 if (s.get("wbc") or 0) > 12 else 0.0)
        return round(min(x, 0.99), 3)


LOINC_TO_STATE = {"8867-4": "hr", "9279-1": "rr", "59408-5": "spo2", "8480-6": "sbp", "8310-5": "temp", "2524-7": "lactate", "6690-2": "wbc", "2160-0": "creatinine"}


def load(path: str) -> List[Dict[str, Any]]:
    with open(path, encoding="utf-8") as f:
        return [json.loads(l) for l in f if l.strip()]


def run(events: Iterable[Dict[str, Any]], *, threshold: float = 0.6) -> Dict[str, Any]:
    """events: {"t": seconds from start, "msg": HL7 text}. Returns what the pipeline concluded and what it refused or flagged."""
    adapter = Hl7MllpAdapter({"adapter": "hl7v2-mllp", "name": "replay", "connection": {"listen_host": "127.0.0.1", "listen_port": 0}, "read": {"late_after_seconds": 3600}})
    port = adapter.listen()
    reg, eng, model = Registry(), AlertEngine(), StubRiskModel()
    eng.p.threshold = threshold
    state: Dict[str, Dict[str, Any]] = {}
    seen_obs: Dict[str, Dict[str, Any]] = {}
    report: Dict[str, Any] = {"acks": {}, "late_results": [], "corrected": [], "ignored_duplicates": 0, "issues": [], "scores": 0, "merges": 0}
    start = dt.datetime(2026, 3, 14, 0, 0, tzinfo=dt.timezone.utc)
    try:
        for ev in sorted(events, key=lambda e: e["t"]):
            now = start + dt.timedelta(seconds=ev["t"])
            code, text = hl7v2.send("127.0.0.1", port, ev["msg"], retries=2, backoff=0.01)
            report["acks"][code] = report["acks"].get(code, 0) + 1
            for rec in adapter.read():
                p = rec.payload
                if p["kind"] == "adt":
                    pk = reg.upsert_patient(p["patient"]["_key"]["system"], p["patient"]["_key"]["value"], p["patient"]["name"][0]["family"], (p["patient"]["name"][0]["given"] or [""])[0], p["patient"].get("birthDate", ""), p["patient"]["gender"])
                    if p["trigger"] == "A40":
                        report["merges"] += 1
                    e = p["encounter"]
                    reg.open_encounter(e["_key"]["value"], pk, e["location"][0]["_unit"], now)
                    if p["trigger"] == "A03":
                        reg.close_encounter(e["_key"]["value"], now)
                else:
                    pk = reg.canonical(p["patient"]["_key"]["system"], p["patient"]["_key"]["value"])
                    for o in p["observations"]:
                        if o["_issues"]:
                            report["issues"].append({"key": o["_key"]["value"], "issues": o["_issues"]})
                        prior = seen_obs.get(o["_key"]["value"])
                        from fde_adapters.protocols.fhir_map import supersedes
                        action = supersedes(prior, o)
                        if action == "ignore":
                            report["ignored_duplicates"] += 1
                            continue
                        if action == "replace":
                            report["corrected"].append(o["_key"]["value"])
                        seen_obs[o["_key"]["value"]] = o
                        if o["_late"]:
                            report["late_results"].append({"key": o["_key"]["value"], "delay_s": o["_delay_seconds"]})
                        loinc = o["code"]["coding"][0]["code"]
                        if loinc in LOINC_TO_STATE and "valueQuantity" in o and o["status"] not in ("entered-in-error", "cancelled"):
                            visit = o["encounter"]["identifier"]["value"] if "encounter" in o else ""
                            m = reg.match_encounter(pk, visit, now)
                            if m["encounter"]:
                                st = state.setdefault(m["encounter"], {})
                                st[LOINC_TO_STATE[loinc]] = o["valueQuantity"]["value"]
                                report["scores"] += 1
                                ward = reg.encounters[m["encounter"]]["ward"]
                                eng.on_score(m["encounter"], ward, model.score(st), now, shift="D" if 7 <= now.hour < 19 else "N")
            eng.tick(now)
    finally:
        adapter.close()
    report["alerts"] = [{"id": a.id, "encounter": a.encounter, "ward": a.ward, "state": a.state, "owner": a.owner, "level": a.level, "opened_at": a.opened_at.isoformat(), "score": a.score} for a in eng.alerts.values()]
    report["suppressed"] = len(eng.suppressed)
    report["encounters"] = len(reg.encounters)
    report["candidates_for_review"] = reg.candidates()
    return report
