"""Ward-specific configuration, clinical acceptance criteria and the approval gate on changing them.

A threshold is a clinical decision. It lives in configuration under change control: a change needs the named clinical approver, a
recorded reason, and a staged rollout, and it is validated against the ward's alert-burden budget before it is accepted."""
from __future__ import annotations

import datetime as dt
import json
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class WardConfig:
    ward: str
    threshold: float
    burden_budget_per_10_patient_days: float = 1.0  # from the blueprint: under 1 alert per 10 patient-days
    escalation: List[str] = field(default_factory=lambda: ["charge_nurse", "physician_on_call", "rapid_response_team"])
    reference_ranges: Dict[str, Dict[str, float]] = field(default_factory=dict)
    enabled_for_clinical_alerts: bool = False  # off until clinical validation is signed
    version: int = 1
    history: List[Dict[str, Any]] = field(default_factory=list)


ACCEPTANCE = [
    {"id": "A1", "criterion": "Alert burden at most the ward budget over a 4-week retrospective replay", "measure": "alerts per 10 patient-days", "threshold": "<= 1.0"},
    {"id": "A2", "criterion": "Sensitivity for sepsis onset at least the agreed target, per ward, on adjudicated cases", "measure": "recall at the ward threshold", "threshold": ">= agreed with the clinical lead"},
    {"id": "A3", "criterion": "Median lead time before clinical recognition", "measure": "hours before onset", "threshold": ">= 3 h (target agreed per ward)"},
    {"id": "A4", "criterion": "Every alert has an owner and a time-to-acknowledge", "measure": "share of alerts acknowledged inside the policy", "threshold": ">= 95%"},
    {"id": "A5", "criterion": "Downtime procedure rehearsed with the ward", "measure": "drill record", "threshold": "completed, signed by the ward manager"},
    {"id": "A6", "criterion": "Subgroup performance reviewed (age, sex, ethnicity where recorded)", "measure": "recall and burden per group", "threshold": "no group worse than the agreed margin"},
]


class ChangeRejected(Exception):
    pass


def validate_threshold_change(cfg: WardConfig, new_threshold: float, *, replay_alerts: int, replay_patient_days: float, approver: str, reason: str, now: Optional[dt.datetime] = None) -> WardConfig:
    """Accept a threshold change only with an approver, a reason and a replay that stays inside the burden budget."""
    if not approver or not reason:
        raise ChangeRejected("a threshold change needs a named clinical approver and a reason")
    per10 = replay_alerts / replay_patient_days * 10 if replay_patient_days else float("inf")
    if per10 > cfg.burden_budget_per_10_patient_days:
        raise ChangeRejected(f"replay gives {per10:.2f} alerts per 10 patient-days, above the budget of {cfg.burden_budget_per_10_patient_days}")
    if abs(new_threshold - cfg.threshold) > 0.1:
        raise ChangeRejected("move a threshold in steps of at most 0.10 and re-validate between steps (staged change)")
    out = WardConfig(**{**cfg.__dict__, "threshold": new_threshold, "version": cfg.version + 1, "history": [*cfg.history, {"at": (now or dt.datetime.now(dt.timezone.utc)).isoformat(), "from": cfg.threshold, "to": new_threshold, "approver": approver, "reason": reason, "replay_burden_per_10_patient_days": round(per10, 3)}]})
    return out


def enable_clinical_alerts(cfg: WardConfig, *, validation_signed_by: str, hazard_log_reviewed_by: str, downtime_drill_done: bool) -> WardConfig:
    """Real clinical alerts are switched on only after clinical validation, hazard-log review and a downtime drill."""
    missing = [n for n, v in (("clinical validation sign-off", validation_signed_by), ("hazard log review", hazard_log_reviewed_by), ("downtime drill", downtime_drill_done)) if not v]
    if missing:
        raise ChangeRejected("cannot enable clinical alerts without: " + ", ".join(missing))
    return WardConfig(**{**cfg.__dict__, "enabled_for_clinical_alerts": True, "version": cfg.version + 1})
