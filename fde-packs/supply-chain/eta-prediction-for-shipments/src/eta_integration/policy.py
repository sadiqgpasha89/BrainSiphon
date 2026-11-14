"""ETA policy: when to publish, recalculate or withhold an ETA, what an ETA change triggers downstream, and how a human overrides one."""
from __future__ import annotations

import datetime as dt
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class EtaPolicy:
    max_interval_hours: float = 12.0  # P90 - P10 wider than this: too uncertain to promise anything
    stale_after_hours: float = 6.0  # no event or ping this recently: withhold
    recalc_shift_minutes: int = 30  # a P50 move smaller than this is noise, not a new ETA
    notify_shift_hours: float = 2.0
    reschedule_dock_shift_hours: float = 4.0

    def decide(self, *, previous_p50: Optional[dt.datetime], p10: dt.datetime, p50: dt.datetime, p90: dt.datetime, last_signal: dt.datetime, now: dt.datetime, new_milestone: bool = False,
               location_quality: str = "good", override_active: bool = False, dock_appointment: Optional[dt.datetime] = None, warehouse_cutoff_hour: Optional[int] = None) -> Dict[str, Any]:
        reasons: List[str] = []
        width_h = (p90 - p10).total_seconds() / 3600
        if now - last_signal > dt.timedelta(hours=self.stale_after_hours):
            return {"publish": False, "withhold_reason": f"no shipment signal for {(now - last_signal).total_seconds() / 3600:.1f} h", "actions": [{"type": "exception", "to": "exception queue", "why": "stale shipment"}]}
        if width_h > self.max_interval_hours:
            return {"publish": False, "withhold_reason": f"interval {width_h:.1f} h wider than {self.max_interval_hours} h", "actions": []}
        if location_quality == "poor" and not new_milestone:
            return {"publish": False, "withhold_reason": "location quality poor and no new milestone", "actions": []}
        if override_active and not new_milestone:
            return {"publish": True, "recalculate": False, "eta": p50, "source": "manual override", "actions": []}
        shift = (p50 - previous_p50) if previous_p50 else dt.timedelta(0)
        recalc = previous_p50 is None or new_milestone or abs(shift) >= dt.timedelta(minutes=self.recalc_shift_minutes)
        actions: List[Dict[str, Any]] = []
        if previous_p50 and recalc:
            h = shift.total_seconds() / 3600
            if abs(h) >= self.notify_shift_hours:
                actions.append({"type": "notify_customer", "to": "customer tracking", "why": f"ETA moved {h:+.1f} h"})
            if h >= self.reschedule_dock_shift_hours and dock_appointment:
                actions.append({"type": "reschedule_dock", "to": "warehouse scheduling", "why": f"ETA {h:+.1f} h after the appointment"})
            crosses = warehouse_cutoff_hour is not None and ((previous_p50.hour < warehouse_cutoff_hour <= p50.hour) or p50.date() > previous_p50.date())
            if crosses:
                actions.append({"type": "replan_labour", "to": "warehouse scheduling", "why": "arrival crosses the shift or cutoff boundary"})
            if h >= 4:
                actions.append({"type": "replan_dispatch", "to": "transport planning", "why": "downstream leg at risk"})
        return {"publish": True, "recalculate": recalc, "eta": p50, "interval": [p10, p90], "source": "model", "actions": actions}


@dataclass
class Override:
    shipment: str
    eta: dt.datetime
    reason: str
    by: str
    at: dt.datetime
    expires_on_next_milestone: bool = True
    approved_by: str = ""


class OverrideBook:
    """Manual ETA override and exception resolution. An override states a reason and an owner, is visible to everyone who sees the ETA, and lapses at the next real milestone."""

    REASONS = {"carrier_confirmed_by_phone", "customs_release_known", "driver_reported", "weather_closure", "other"}

    def __init__(self) -> None:
        self.items: Dict[str, Override] = {}
        self.exceptions: Dict[str, Dict[str, Any]] = {}

    def set(self, shipment: str, eta: dt.datetime, reason: str, by: str, now: dt.datetime, *, model_p50: Optional[dt.datetime] = None, approver: str = "") -> Override:
        if reason not in self.REASONS:
            raise ValueError(f"reason must be one of {sorted(self.REASONS)}")
        if model_p50 and abs((eta - model_p50).total_seconds()) > 24 * 3600 and not approver:
            raise ValueError("an override of more than 24 h away from the model needs a second approver")
        o = Override(shipment, eta, reason, by, now, approved_by=approver)
        self.items[shipment] = o
        return o

    def active(self, shipment: str) -> Optional[Override]:
        return self.items.get(shipment)

    def on_milestone(self, shipment: str) -> bool:
        o = self.items.get(shipment)
        if o and o.expires_on_next_milestone:
            del self.items[shipment]
            return True
        return False

    def open_exception(self, shipment: str, kind: str, now: dt.datetime, owner: str = "control tower") -> None:
        self.exceptions[shipment] = {"kind": kind, "opened": now, "owner": owner, "state": "open"}

    def resolve(self, shipment: str, resolution: str, by: str, now: dt.datetime) -> None:
        e = self.exceptions[shipment]
        e.update(state="resolved", resolution=resolution, resolved_by=by, resolved_at=now)
