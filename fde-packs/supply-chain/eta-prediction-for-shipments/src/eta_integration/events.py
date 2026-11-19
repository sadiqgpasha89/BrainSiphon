"""Event-time and processing-time semantics for shipment events.

Event time is when it happened in the world; processing time is when we learned about it. The ETA model uses event time. Carriers send
late, twice, out of order and corrected; GPS pings go missing in tunnels and warehouses. This store keeps the facts straight."""
from __future__ import annotations

import datetime as dt
from typing import Any, Dict, List, Optional, Tuple

ORDER = ["PICKED_UP", "ARRIVED_PICKUP", "DEPARTED_PICKUP", "LOADED_ON_TRUCK", "IN_TRANSIT", "ARRIVED_TERMINAL", "ARRIVED_HUB", "DEPARTED_TERMINAL", "DEPARTED_HUB", "AVAILABLE_FOR_DELIVERY", "ARRIVED_DELIVERY", "DELIVERED"]
RANK = {m: i for i, m in enumerate(ORDER)}


def parse(ts: str) -> dt.datetime:
    return dt.datetime.fromisoformat(ts.replace("Z", "+00:00"))


class ShipmentLog:
    def __init__(self, late_after: dt.timedelta = dt.timedelta(hours=1)):
        self.milestones: Dict[str, Dict[str, Any]] = {}
        self.pings: List[Dict[str, Any]] = []
        self.seen: set = set()
        self.late_after = late_after
        self.stats = {"duplicates": 0, "late": 0, "out_of_order": 0, "regressions": 0, "corrections": 0}

    def add_milestone(self, ev: Dict[str, Any], received_at: dt.datetime) -> Dict[str, Any]:
        """Returns {"applied": bool, "why": str}. The processing-time lag is kept as data, never used as the event time."""
        key = ev["message_id"]
        if key in self.seen:
            self.stats["duplicates"] += 1
            return {"applied": False, "why": "duplicate message id"}
        self.seen.add(key)
        et = parse(ev["event_time"])
        lag = received_at - et
        late = lag > self.late_after
        if late:
            self.stats["late"] += 1
        cur = self.milestones.get(ev["milestone"])
        if cur and parse(cur["event_time"]) == et:
            self.stats["duplicates"] += 1
            return {"applied": False, "why": "same milestone at the same event time from another source"}
        if cur:
            self.stats["corrections"] += 1  # same milestone, different time: the later-reported value is a correction
        latest_rank = max((RANK.get(m, -1) for m in self.milestones), default=-1)
        if RANK.get(ev["milestone"], -1) < latest_rank:
            self.stats["out_of_order"] += 1
        self.milestones[ev["milestone"]] = {**ev, "received_at": received_at.isoformat(), "lag_s": int(lag.total_seconds()), "late": late}
        return {"applied": True, "why": "late" if late else "ok", "lag_s": int(lag.total_seconds())}

    def add_ping(self, ping: Dict[str, Any]) -> bool:
        """Insert by event time (out-of-order pings are normal). A ping with the same device and time is a duplicate."""
        k = (ping["device"], ping["event_time"])
        if k in self.seen:
            self.stats["duplicates"] += 1
            return False
        self.seen.add(k)
        self.pings.append(ping)
        self.pings.sort(key=lambda p: p["event_time"])
        return True

    def ping_gaps(self, now: dt.datetime, expected_every: dt.timedelta = dt.timedelta(minutes=5), tolerate: int = 3) -> Dict[str, Any]:
        """Missing pings: the gap since the last ping, and gaps inside the track that exceed `tolerate` expected intervals."""
        if not self.pings:
            return {"status": "no-pings", "silent_for_s": None, "gaps": []}
        gaps = []
        for a, b in zip(self.pings, self.pings[1:]):
            d = parse(b["event_time"]) - parse(a["event_time"])
            if d > expected_every * tolerate:
                gaps.append({"from": a["event_time"], "to": b["event_time"], "missing": int(d / expected_every) - 1})
        silent = now - parse(self.pings[-1]["event_time"])
        return {"status": "silent" if silent > expected_every * tolerate else "ok", "silent_for_s": int(silent.total_seconds()), "gaps": gaps}

    def latest_milestone(self) -> Optional[str]:
        return max(self.milestones, key=lambda m: parse(self.milestones[m]["event_time"])) if self.milestones else None
