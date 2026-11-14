"""Downtime and fallback: what the ward sees when the EHR link, the integration engine or the inference service is down."""
from __future__ import annotations

import datetime as dt
from dataclasses import dataclass, field
from typing import Dict, List, Optional


@dataclass
class Heartbeat:
    last_seen: Optional[dt.datetime] = None


@dataclass
class Monitor:
    """Each dependency reports a heartbeat; the status is the worst of them, with a stated stale-after time."""

    stale_after: dt.timedelta = dt.timedelta(minutes=5)
    beats: Dict[str, Heartbeat] = field(default_factory=lambda: {"hl7_feed": Heartbeat(), "inference": Heartbeat(), "ehr_alert_api": Heartbeat()})

    def beat(self, name: str, at: dt.datetime) -> None:
        self.beats[name].last_seen = at

    def status(self, now: dt.datetime) -> Dict[str, object]:
        down = sorted(n for n, b in self.beats.items() if b.last_seen is None or now - b.last_seen > self.stale_after)
        if not down:
            return {"state": "OK", "down": [], "ward_message": ""}
        if "inference" in down and len(down) == 1:
            return {"state": "DEGRADED", "down": down, "ward_message": "Sepsis model unavailable: NEWS2 is the active early-warning rule. Escalate per the NEWS2 trigger table."}
        return {"state": "DOWNTIME", "down": down, "ward_message": "Sepsis early-warning is OFFLINE. Use the paper NEWS2 chart and the downtime procedure. Report to the clinical informatics on-call."}


def decide_source(status: Dict[str, object]) -> str:
    """Where an alert decision comes from right now: the model, the NEWS2 rule, or nothing (paper)."""
    return {"OK": "model", "DEGRADED": "news2", "DOWNTIME": "paper"}[str(status["state"])]
