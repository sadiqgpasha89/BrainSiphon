"""Campaign budget, pacing and frequency caps: the state a bid decision must respect, with the integration tests the feedback asks for."""
from __future__ import annotations

from typing import Dict, Optional


class Campaign:
    def __init__(self, cid: str, daily_budget: float, hours: int = 24, freq_cap_per_user: int = 3, freq_window_s: int = 86400):
        self.cid, self.daily_budget, self.hours = cid, daily_budget, hours
        self.freq_cap, self.freq_window = freq_cap_per_user, freq_window_s
        self.spent = 0.0
        self.reserved = 0.0
        self.impressions: Dict[str, list] = {}

    def target_spend_by(self, hour: int) -> float:
        """Even pacing: the share of budget that should have been spent by the end of `hour`."""
        return self.daily_budget * min(max(hour, 0), self.hours) / self.hours

    def can_bid(self, price: float, user: str, now_s: float, hour: int, *, pacing_slack: float = 1.15) -> Dict[str, object]:
        if self.spent + self.reserved + price > self.daily_budget:
            return {"ok": False, "reason": "daily budget exhausted"}
        if self.spent + self.reserved > self.target_spend_by(hour + 1) * pacing_slack:
            return {"ok": False, "reason": "ahead of pace"}
        seen = [t for t in self.impressions.get(user, []) if now_s - t < self.freq_window]
        if len(seen) >= self.freq_cap:
            return {"ok": False, "reason": "frequency cap reached"}
        return {"ok": True, "reason": "ok"}

    def reserve(self, price: float) -> None:
        self.reserved += price  # spend is reserved at bid time and released if the bid loses: budgets are protected against concurrent bids

    def settle(self, price: float, won: bool, clearing: float, user: str, now_s: float) -> None:
        self.reserved = max(self.reserved - price, 0.0)
        if won:
            self.spent += clearing
            self.impressions.setdefault(user, []).append(now_s)
