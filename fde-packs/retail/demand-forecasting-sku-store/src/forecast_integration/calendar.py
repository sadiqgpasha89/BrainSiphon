"""Store calendars, time zones, units of measure and business-day definitions.

A forecast date is a *store-local business date*, not a UTC date: a store that closes at midnight local time belongs to the next UTC day
for half the year. Every store carries its own time zone (a fixed offset here; use IANA names with zoneinfo in production), its trading week and its closures."""
from __future__ import annotations

import datetime as dt
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set

#: units of measure to the forecast's base unit (each); case packs convert with the item's own pack size
UOM = {"EA": 1.0, "EACH": 1.0, "PC": 1.0, "DZ": 12.0, "CS": None, "KG": 1.0, "G": 0.001, "LB": 0.45359237, "L": 1.0, "ML": 0.001}


def to_base_units(qty: float, uom: str, pack_size: Optional[float] = None) -> float:
    u = uom.upper()
    if u not in UOM:
        raise ValueError(f"unknown unit of measure {uom!r}")
    f = UOM[u]
    if f is None:
        if not pack_size:
            raise ValueError("a case (CS) needs the item's pack size")
        f = pack_size
    return qty * f


@dataclass
class StoreCalendar:
    store: str
    utc_offset_minutes: int
    open_weekdays: Set[int] = field(default_factory=lambda: {0, 1, 2, 3, 4, 5, 6})
    holidays: Set[dt.date] = field(default_factory=set)
    closures: List[tuple] = field(default_factory=list)  # (start_date, end_date, reason): refits, floods, strikes
    business_day_cutoff_hour: int = 0  # a business day that ends after midnight: 3 means 03:00 still belongs to yesterday

    def local(self, ts_utc: dt.datetime) -> dt.datetime:
        return ts_utc + dt.timedelta(minutes=self.utc_offset_minutes)

    def business_date(self, ts_utc: dt.datetime) -> dt.date:
        l = self.local(ts_utc)
        return (l - dt.timedelta(hours=self.business_day_cutoff_hour)).date()

    def is_trading(self, d: dt.date) -> bool:
        if d.weekday() not in self.open_weekdays or d in self.holidays:
            return False
        return not any(s <= d <= e for s, e, _ in self.closures)

    def closure_reason(self, d: dt.date) -> str:
        for s, e, r in self.closures:
            if s <= d <= e:
                return r
        return "holiday" if d in self.holidays else ("weekly closure" if d.weekday() not in self.open_weekdays else "")


def forecast_horizon_dates(cal: StoreCalendar, start: dt.date, days: int) -> List[Dict[str, object]]:
    """The dates a forecast must cover, flagging non-trading days so the output is an explicit 0 with a reason, not a missing row."""
    out = []
    for i in range(days):
        d = start + dt.timedelta(days=i)
        out.append({"date": d.isoformat(), "trading": cal.is_trading(d), "reason": cal.closure_reason(d)})
    return out
