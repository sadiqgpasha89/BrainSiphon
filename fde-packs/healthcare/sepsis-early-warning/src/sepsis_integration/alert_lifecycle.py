"""The alert lifecycle: generated, displayed, acknowledged, snoozed, overridden, escalated, closed.

Delivering a score is not a workflow. This is the part that makes the alert something a nurse and a physician can act on, own, hand
over and be held to: who it belongs to, when it escalates, how it is suppressed without hiding a deterioration, and how it closes into
a label. Every transition is recorded with who, when and why."""
from __future__ import annotations

import dataclasses
import datetime as dt
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

GENERATED, DISPLAYED, ACKNOWLEDGED, SNOOZED, OVERRIDDEN, ESCALATED, CLOSED = "generated", "displayed", "acknowledged", "snoozed", "overridden", "escalated", "closed"
CLOSE_REASONS = {"sepsis_confirmed", "sepsis_ruled_out", "treated_and_improving", "patient_discharged", "patient_transferred", "duplicate", "other"}
LEVELS = ["charge_nurse", "physician_on_call", "rapid_response_team"]


class LifecycleError(Exception):
    pass


@dataclass
class Alert:
    id: str
    encounter: str
    ward: str
    score: float
    opened_at: dt.datetime
    state: str = GENERATED
    owner: str = "charge_nurse"
    level: int = 0
    snoozes: int = 0
    last_score: float = 0.0
    due_at: Optional[dt.datetime] = None
    history: List[Dict[str, Any]] = field(default_factory=list)
    closed_reason: str = ""

    def log(self, at: dt.datetime, who: str, what: str, why: str = "") -> None:
        self.history.append({"at": at.isoformat(), "who": who, "state": self.state, "what": what, "why": why})


@dataclass
class Policy:
    ack_timeout: dt.timedelta = dt.timedelta(minutes=15)
    escalate_timeout: dt.timedelta = dt.timedelta(minutes=15)
    snooze_for: dt.timedelta = dt.timedelta(minutes=30)
    max_snoozes: int = 2
    refractory: dt.timedelta = dt.timedelta(hours=6)
    critical_delta: float = 0.25  # a rise this large inside the refractory window re-alerts and escalates
    burden_cap_per_shift: int = 6
    threshold: float = 0.6


class AlertEngine:
    """In-memory for clarity. Persist `alerts` and `history` in the customer's database; the transitions are the contract."""

    def __init__(self, policy: Optional[Policy] = None):
        self.p = policy or Policy()
        self.alerts: Dict[str, Alert] = {}
        self.last_closed: Dict[str, tuple] = {}  # encounter -> (closed_at, score)
        self.shift_counts: Dict[str, int] = {}
        self.suppressed: List[Dict[str, Any]] = []
        self.seq = 0

    # -- generation and suppression ---------------------------------------------------------------------------------------------
    def on_score(self, encounter: str, ward: str, score: float, now: dt.datetime, shift: str = "") -> Optional[Alert]:
        open_ = next((a for a in self.alerts.values() if a.encounter == encounter and a.state not in (CLOSED, OVERRIDDEN)), None)
        if open_:
            delta = score - open_.last_score
            open_.last_score = score
            if delta >= self.p.critical_delta and open_.level < len(LEVELS) - 1:
                self._escalate(open_, now, "system", f"score rose by {delta:.2f}")
            else:
                self.suppressed.append({"encounter": encounter, "at": now.isoformat(), "reason": "open alert exists"})
            return None
        if score < self.p.threshold:
            return None
        prior = self.last_closed.get(encounter)
        if prior and now - prior[0] < self.p.refractory and score - prior[1] < self.p.critical_delta:
            self.suppressed.append({"encounter": encounter, "at": now.isoformat(), "reason": "refractory window"})
            return None
        key = f"{ward}:{shift}"
        self.shift_counts[key] = self.shift_counts.get(key, 0) + 1
        self.seq += 1
        a = Alert(f"A{self.seq:05d}", encounter, ward, score, now, last_score=score, due_at=now + self.p.ack_timeout)
        if prior and now - prior[0] < self.p.refractory:  # a genuine deterioration inside the refractory window
            a.level = 1
            a.owner = LEVELS[1]
            a.log(now, "system", "re-alert inside refractory window: escalated", f"rise {score - prior[1]:.2f}")
        a.log(now, "system", "generated", f"score {score:.2f}")
        if self.shift_counts[key] > self.p.burden_cap_per_shift:
            a.log(now, "system", "burden cap exceeded: flagged for safety review, alert is still delivered")
        self.alerts[a.id] = a
        return a

    # -- the clinician's actions --------------------------------------------------------------------------------------------------
    def display(self, a: Alert, now: dt.datetime) -> None:
        self._need(a, {GENERATED, SNOOZED})
        a.state = DISPLAYED
        a.log(now, "ehr", "displayed in worklist/in-basket")

    def acknowledge(self, a: Alert, who: str, now: dt.datetime) -> None:
        self._need(a, {DISPLAYED, ESCALATED, GENERATED})
        a.state, a.owner, a.due_at = ACKNOWLEDGED, who, None
        a.log(now, who, "acknowledged")

    def snooze(self, a: Alert, who: str, now: dt.datetime, why: str) -> None:
        self._need(a, {ACKNOWLEDGED, DISPLAYED})
        if a.snoozes >= self.p.max_snoozes:
            raise LifecycleError("snooze limit reached: act on the alert, override it with a reason, or escalate")
        if not why:
            raise LifecycleError("a snooze needs a reason")
        a.snoozes += 1
        a.state, a.due_at = SNOOZED, now + self.p.snooze_for
        a.log(now, who, "snoozed", why)

    def override(self, a: Alert, who: str, role: str, now: dt.datetime, reason: str, cosigned_by: str = "") -> None:
        """Dismiss as clinically not applicable. A reason is mandatory; a nurse override needs a physician co-signature."""
        self._need(a, {ACKNOWLEDGED, DISPLAYED, ESCALATED})
        if not reason:
            raise LifecycleError("an override needs a reason")
        if role == "nurse" and not cosigned_by:
            raise LifecycleError("a nurse override needs a physician co-signature")
        a.state, a.due_at = OVERRIDDEN, None
        a.log(now, who, "overridden", f"{reason}" + (f" (co-signed by {cosigned_by})" if cosigned_by else ""))
        self.last_closed[a.encounter] = (now, a.last_score)
        a.closed_reason = "override:" + reason

    def close(self, a: Alert, who: str, now: dt.datetime, reason: str) -> None:
        if reason not in CLOSE_REASONS:
            raise LifecycleError(f"close reason must be one of {sorted(CLOSE_REASONS)}")
        self._need(a, {ACKNOWLEDGED, OVERRIDDEN, ESCALATED, DISPLAYED, SNOOZED})
        a.state, a.due_at, a.closed_reason = CLOSED, None, reason
        a.log(now, who, "closed", reason)
        self.last_closed[a.encounter] = (now, a.last_score)

    # -- time ----------------------------------------------------------------------------------------------------------------------
    def tick(self, now: dt.datetime) -> List[Alert]:
        """Escalate whatever is overdue: charge nurse -> physician on call -> rapid response team. Snoozes expire back into the worklist."""
        moved: List[Alert] = []
        for a in self.alerts.values():
            if a.state == SNOOZED and a.due_at and now >= a.due_at:
                a.state = DISPLAYED
                a.due_at = now + self.p.ack_timeout
                a.log(now, "system", "snooze expired")
                moved.append(a)
            elif a.state in (GENERATED, DISPLAYED, ESCALATED) and a.due_at and now >= a.due_at and a.level < len(LEVELS) - 1:
                self._escalate(a, now, "system", "not acknowledged in time")
                moved.append(a)
        return moved

    def _escalate(self, a: Alert, now: dt.datetime, who: str, why: str) -> None:
        a.level += 1
        a.owner, a.state, a.due_at = LEVELS[a.level], ESCALATED, now + self.p.escalate_timeout
        a.log(now, who, f"escalated to {a.owner}", why)

    def _need(self, a: Alert, allowed: set) -> None:
        if a.state not in allowed:
            raise LifecycleError(f"cannot do that to an alert that is {a.state}")

    def burden(self, ward: str, patient_days: float) -> float:
        n = sum(1 for a in self.alerts.values() if a.ward == ward)
        return n / patient_days if patient_days else 0.0
